package com.payroll.payrollslip

import com.payroll.payrollitem.PayrollItemRepository
import com.payroll.payrollrun.PayrollRunRepository
import com.payroll.portal.PortalNotification
import com.payroll.portal.PortalNotificationRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.util.UUID

@Service
@Transactional(readOnly = true)
class PayrollSlipService(
    private val payrollSlipRepository: PayrollSlipRepository,
    private val payrollRunRepository: PayrollRunRepository,
    private val payrollItemRepository: PayrollItemRepository,
    private val portalNotificationRepository: PortalNotificationRepository
) {

    fun getSlipsByRun(companyId: UUID, payrollRunId: UUID): List<PayrollSlipDetailResponse> {
        val run = payrollRunRepository.findById(payrollRunId)
            .orElseThrow { NoSuchElementException("급여실행을 찾을 수 없습니다. id=$payrollRunId") }
        if (run.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")
        return payrollSlipRepository.findByPayrollRun(run).map { toDetail(it) }
    }

    fun getSlipDetail(companyId: UUID, payrollSlipId: UUID): PayrollSlipDetailResponse {
        val slip = payrollSlipRepository.findById(payrollSlipId)
            .orElseThrow { NoSuchElementException("급여명세를 찾을 수 없습니다. id=$payrollSlipId") }
        if (slip.payrollRun.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")
        return toDetail(slip)
    }

    @Transactional
    fun markAsSent(companyId: UUID, payrollRunId: UUID): Map<String, Int> {
        val run = payrollRunRepository.findById(payrollRunId)
            .orElseThrow { NoSuchElementException("급여실행을 찾을 수 없습니다. id=$payrollRunId") }
        if (run.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")
        if (run.status !in listOf("APPROVED", "PAID"))
            throw IllegalArgumentException("승인 또는 지급 완료 상태에서만 발송할 수 있습니다.")
        val slips = payrollSlipRepository.findByPayrollRun(run)
        slips.forEach { slip ->
            slip.deliveryStatus = "SENT"
            val notif = PortalNotification(
                employee = slip.employee,
                payrollSlip = slip,
                title = "${slip.payrollRun.payrollYear}년 ${slip.payrollRun.payrollMonth}월 급여명세서가 도착했습니다.",
                body = "총지급 ${slip.grossAmount}원 | 실수령 ${slip.netAmount}원"
            )
            portalNotificationRepository.save(notif)
        }
        return mapOf("sent" to slips.size)
    }

    fun getLedger(companyId: UUID, payrollRunId: UUID): PayrollLedgerResponse {
        val run = payrollRunRepository.findById(payrollRunId)
            .orElseThrow { NoSuchElementException("급여실행을 찾을 수 없습니다. id=$payrollRunId") }
        if (run.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")
        val slips = payrollSlipRepository.findByPayrollRun(run)

        val rows = slips.map { slip ->
            val items = payrollItemRepository.findByPayrollSlip(slip)
            fun item(name: String) = items.firstOrNull { it.itemName == name }?.amount ?: BigDecimal.ZERO
            PayrollLedgerRow(
                employeeNo         = slip.employee.employeeNo,
                fullName           = slip.employee.fullName,
                orgUnitName        = slip.employee.orgUnit.orgUnitName,
                gradeName          = slip.employee.jobGrade.gradeName,
                currentStep        = slip.employee.currentStep,
                baseSalary         = item("기본급"),
                mealAllowance      = item("식대"),
                transportAllowance = item("교통비"),
                positionAllowance  = item("직책수당"),
                grossAmount        = slip.grossAmount,
                nonTaxableAmount   = slip.nonTaxableAmount,
                taxableIncome      = slip.taxableIncome,
                healthInsurance    = item("건강보험"),
                ltCare             = item("장기요양보험"),
                pension            = item("국민연금"),
                empInsurance       = item("고용보험"),
                incomeTax          = item("갑근세"),
                localIncomeTax     = item("지방소득세"),
                deductionAmount    = slip.deductionAmount,
                netAmount          = slip.netAmount,
                deliveryStatus     = slip.deliveryStatus
            )
        }

        return PayrollLedgerResponse(
            runName      = run.runName,
            payrollYear  = run.payrollYear,
            payrollMonth = run.payrollMonth,
            payDate      = run.payDate.toString(),
            rows         = rows,
            totalGross   = rows.fold(BigDecimal.ZERO) { acc, r -> acc + r.grossAmount },
            totalDeduction = rows.fold(BigDecimal.ZERO) { acc, r -> acc + r.deductionAmount },
            totalNet     = rows.fold(BigDecimal.ZERO) { acc, r -> acc + r.netAmount }
        )
    }

    private fun toDetail(slip: PayrollSlip): PayrollSlipDetailResponse {
        val items = payrollItemRepository.findByPayrollSlip(slip)
        return PayrollSlipDetailResponse(
            payrollSlipId    = slip.payrollSlipId,
            employeeNo       = slip.employee.employeeNo,
            fullName         = slip.employee.fullName,
            gradeName        = slip.employee.jobGrade.gradeName,
            currentStep      = slip.employee.currentStep,
            orgUnitName      = slip.employee.orgUnit.orgUnitName,
            grossAmount      = slip.grossAmount,
            nonTaxableAmount = slip.nonTaxableAmount,
            taxableIncome    = slip.taxableIncome,
            deductionAmount  = slip.deductionAmount,
            netAmount        = slip.netAmount,
            deliveryStatus   = slip.deliveryStatus,
            earnings  = items.filter { it.itemType == "EARNING"   }.map { PayrollItemDetail(it.payrollItemId, it.itemType, it.itemName, it.isTaxable, it.amount) },
            deductions = items.filter { it.itemType == "DEDUCTION" }.map { PayrollItemDetail(it.payrollItemId, it.itemType, it.itemName, it.isTaxable, it.amount) }
        )
    }
}
