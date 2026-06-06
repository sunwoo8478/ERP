package com.payroll.payrollrun

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

data class PayrollRunCreateRequest(
    @field:NotBlank val runName: String,
    @field:NotNull val payrollYear: Int,
    @field:NotNull @field:Min(1) @field:Max(12) val payrollMonth: Int,
    @field:NotNull val payDate: LocalDate
)

data class PayrollRunUpdateRequest(
    @field:NotBlank val runName: String,
    @field:NotNull val payDate: LocalDate
)

data class PayrollRunResponse(
    val payrollRunId: UUID,
    val companyId: UUID,
    val runName: String,
    val payrollYear: Int,
    val payrollMonth: Int,
    val payDate: LocalDate,
    val status: String
) {
    companion object {
        fun from(r: PayrollRun) = PayrollRunResponse(
            payrollRunId = r.payrollRunId,
            companyId = r.company.companyId,
            runName = r.runName,
            payrollYear = r.payrollYear,
            payrollMonth = r.payrollMonth,
            payDate = r.payDate,
            status = r.status
        )
    }
}

data class PayrollSlipSummary(
    val payrollSlipId: UUID,
    val employeeId: UUID,
    val employeeNo: String,
    val fullName: String,
    val gradeName: String,
    val grossAmount: BigDecimal,
    val deductionAmount: BigDecimal,
    val netAmount: BigDecimal,
    val deliveryStatus: String
)
