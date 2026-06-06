package com.payroll.salarystandard

import jakarta.validation.constraints.NotNull
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

data class SalaryStandardCreateRequest(
    @field:NotNull val effectiveStartDate: LocalDate,
    val mealAllowance: BigDecimal = BigDecimal.ZERO,
    val transportAllowance: BigDecimal = BigDecimal.ZERO,
    val positionAllowance: BigDecimal = BigDecimal.ZERO,
    val changeReason: String? = null
)

data class SalaryStandardResponse(
    val salaryStandardId: UUID,
    val employeeId: UUID,
    val effectiveStartDate: LocalDate,
    val effectiveEndDate: LocalDate?,
    val mealAllowance: BigDecimal,
    val transportAllowance: BigDecimal,
    val positionAllowance: BigDecimal,
    val changeReason: String?
) {
    companion object {
        fun from(s: SalaryStandard) = SalaryStandardResponse(
            salaryStandardId = s.salaryStandardId,
            employeeId = s.employee.employeeId,
            effectiveStartDate = s.effectiveStartDate,
            effectiveEndDate = s.effectiveEndDate,
            mealAllowance = s.mealAllowance,
            transportAllowance = s.transportAllowance,
            positionAllowance = s.positionAllowance,
            changeReason = s.changeReason
        )
    }
}
