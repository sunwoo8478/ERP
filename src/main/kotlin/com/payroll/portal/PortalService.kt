package com.payroll.portal
import com.payroll.company.CompanyRepository
import com.payroll.employee.EmployeeRepository
import com.payroll.payrollitem.PayrollItemRepository
import com.payroll.payrollslip.PayrollSlipRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.util.UUID

@Service @Transactional(readOnly=true)
class PortalService(
    private val companyRepository:CompanyRepository,
    private val employeeRepository:EmployeeRepository,
    private val payrollSlipRepository:PayrollSlipRepository,
    private val payrollItemRepository:PayrollItemRepository,
    private val notifRepo:PortalNotificationRepository
) {
    fun login(req:PortalLoginRequest):PortalEmployeeInfo {
        val co=companyRepository.findAll().firstOrNull{it.companyCode.equals(req.companyCode,true)}
            ?:throw NoSuchElementException("고객사를 찾을 수 없습니다: ${req.companyCode}")
        val emp=employeeRepository.findByCompany(co).firstOrNull{it.employeeNo==req.employeeNo}
            ?:throw NoSuchElementException("직원을 찾을 수 없습니다: ${req.employeeNo}")
        return PortalEmployeeInfo(emp.employeeId,emp.employeeNo,emp.fullName,co.companyName,emp.jobGrade.gradeName,emp.orgUnit.orgUnitName,emp.currentStep)
    }
    fun getSlips(employeeId:UUID):List<PortalSlipSummary> {
        val emp=employeeRepository.findById(employeeId).orElseThrow{NoSuchElementException("직원 없음")}
        val newIds=notifRepo.findByEmployeeOrderByCreatedAtDesc(emp).filter{!it.isRead&&it.payrollSlip!=null}.map{it.payrollSlip!!.payrollSlipId}.toSet()
        return payrollSlipRepository.findByEmployee(emp).sortedByDescending{it.payrollRun.payDate}
            .map{s->PortalSlipSummary(s.payrollSlipId,s.payrollRun.payrollYear,s.payrollRun.payrollMonth,s.payrollRun.payDate,s.netAmount,s.grossAmount,s.deductionAmount,s.deliveryStatus,s.payrollSlipId in newIds)}
    }
    fun getSlipDetail(employeeId:UUID,slipId:UUID):PortalSlipDetail {
        val emp=employeeRepository.findById(employeeId).orElseThrow{NoSuchElementException("직원 없음")}
        val slip=payrollSlipRepository.findById(slipId).orElseThrow{NoSuchElementException("명세 없음")}
        if(slip.employee.employeeId!=employeeId) throw IllegalArgumentException("접근 권한 없음")
        val items=payrollItemRepository.findByPayrollSlip(slip)
        return PortalSlipDetail(slip.payrollSlipId,slip.payrollRun.payrollYear,slip.payrollRun.payrollMonth,slip.payrollRun.payDate,emp.employeeNo,emp.fullName,emp.jobGrade.gradeName,emp.orgUnit.orgUnitName,emp.currentStep,slip.grossAmount,slip.nonTaxableAmount,slip.taxableIncome,slip.deductionAmount,slip.netAmount,
            items.filter{it.itemType=="EARNING"}.map{PortalItem(it.itemName,it.amount,it.isTaxable)},
            items.filter{it.itemType=="DEDUCTION"}.map{PortalItem(it.itemName,it.amount,it.isTaxable)})
    }
    fun getNotifications(employeeId:UUID):List<NotificationDto> {
        val emp=employeeRepository.findById(employeeId).orElseThrow{NoSuchElementException("직원 없음")}
        return notifRepo.findByEmployeeOrderByCreatedAtDesc(emp).map{NotificationDto(it.notificationId,it.title,it.body,it.isRead,it.createdAt,it.payrollSlip?.payrollSlipId)}
    }
    @Transactional fun markAllRead(employeeId:UUID) {
        val emp=employeeRepository.findById(employeeId).orElseThrow{NoSuchElementException("직원 없음")}
        notifRepo.findByEmployeeOrderByCreatedAtDesc(emp).filter{!it.isRead}.forEach{it.isRead=true}
    }
    fun getUnreadCount(employeeId:UUID):Long {
        val emp=employeeRepository.findById(employeeId).orElseThrow{NoSuchElementException("직원 없음")}
        return notifRepo.countByEmployeeAndIsRead(emp,false)
    }

    fun getBankAccount(employeeId:UUID):BankAccountInfo {
        val emp=employeeRepository.findById(employeeId).orElseThrow{NoSuchElementException("직원 없음")}
        val slips=payrollSlipRepository.findByEmployee(emp)
            .filter{it.payrollRun.status=="PAID"}
            .sortedByDescending{it.payrollRun.payDate}
        var runningBalance=BigDecimal.ZERO
        // 누적잔액: 오래된 것부터 더해서 최신이 상단
        val txList=slips.reversed().mapIndexed{idx,s->
            runningBalance=runningBalance.add(s.netAmount)
            BankTransaction(
                txId=s.payrollSlipId,
                date=s.payrollRun.payDate,
                description=emp.company.companyName+" 급여",
                amount=s.netAmount,
                balance=runningBalance,
                txType="CREDIT",
                payrollSlipId=s.payrollSlipId
            )
        }.reversed()
        val totalBalance=slips.fold(BigDecimal.ZERO){acc,s->acc.add(s.netAmount)}
        return BankAccountInfo(
            bankName=emp.bankName?:"신한은행",
            accountNo=emp.bankAccount?:"계좌 미등록",
            ownerName=emp.fullName,
            companyName=emp.company.companyName,
            balance=totalBalance,
            transactions=txList
        )
    }
}
