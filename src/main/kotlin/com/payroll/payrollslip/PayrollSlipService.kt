package com.payroll.payrollslip

import com.payroll.payrollitem.PayrollItemRepository
import com.payroll.payrollrun.PayrollRunRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class PayrollSlipService(
    private val payrollSlipRepository: PayrollSlipRepository,
    private val payrollRunRepository: PayrollRunRepository,
    private val payrollItemRepository: PayrollItemRepository
) {

    fun getSlipsByRun(companyId: UUID, payrollRunId: UUID): List<PayrollSlipDetailResponse> {
        val run = payrollRunRepository.findById(payrollRunId)
            .orElseThrow { NoSuchElementException("급여실행을 찾을 수 없습니다. id=$payrollRunId") }
        if (run.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")

        return payrollSlipRepository.findByPayrollRun(run).map { slip ->
            val items = payrollItemRepository.findByPayrollSlip(slip)
            PayrollSlipDetailResponse(
                payrollSlipId = slip.payrollSlipId,
                employeeNo = slip.employee.employeeNo,
                fullName = slip.employee.fullName,
                gradeName = slip.employee.jobGrade.gradeName,
                currentStep = slip.employee.currentStep,
                orgUnitName = slip.employee.orgUnit.orgUnitName,
                grossAmount = slip.grossAmount,
                nonTaxableAmount = slip.nonTaxableAmount,
                taxableIncome = slip.taxableIncome,
                deductionAmount = slip.deductionAmount,
                netAmount = slip.netAmount,
                earnings = items.filter { it.itemType == "EARNING" }.map {
                    PayrollItemDetail(it.payrollItemId, it.itemType, it.itemName, it.isTaxable, it.amount)
                },
                deductions = items.filter { it.itemType == "DEDUCTION" }.map {
                    PayrollItemDetail(it.payrollItemId, it.itemType, it.itemName, it.isTaxable, it.amount)
                }
            )
        }
    }

    fun getSlipDetail(companyId: UUID, payrollSlipId: UUID): PayrollSlipDetailResponse {
        val slip = payrollSlipRepository.findById(payrollSlipId)
            .orElseThrow { NoSuchElementException("급여명세를 찾을 수 없습니다. id=$payrollSlipId") }
        if (slip.payrollRun.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")

        val items = payrollItemRepository.findByPayrollSlip(slip)
        return PayrollSlipDetailResponse(
            payrollSlipId = slip.payrollSlipId,
            employeeNo = slip.employee.employeeNo,
            fullName = slip.employee.fullName,
            gradeName = slip.employee.jobGrade.gradeName,
            currentStep = slip.employee.currentStep,
            orgUnitName = slip.employee.orgUnit.orgUnitName,
            grossAmount = slip.grossAmount,
            nonTaxableAmount = slip.nonTaxableAmount,
            taxableIncome = slip.taxableIncome,
            deductionAmount = slip.deductionAmount,
            netAmount = slip.netAmount,
            earnings = items.filter { it.itemType == "EARNING" }.map {
                PayrollItemDetail(it.payrollItemId, it.itemType, it.itemName, it.isTaxable, it.amount)
            },
            deductions = items.filter { it.itemType == "DEDUCTION" }.map {
                PayrollItemDetail(it.payrollItemId, it.itemType, it.itemName, it.isTaxable, it.amount)
            }
        )
    }
}
