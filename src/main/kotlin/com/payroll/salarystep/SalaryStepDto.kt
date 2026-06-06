package com.payroll.salarystep

import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotNull
import java.math.BigDecimal
import java.util.UUID

data class SalaryStepCreateRequest(
    @field:NotNull @field:Min(1)
    val step: Int,
    @field:NotNull
    val applyYear: Int,
    @field:NotNull
    val baseSalary: BigDecimal
)

data class SalaryStepUpdateRequest(
    @field:NotNull
    val baseSalary: BigDecimal
)

data class SalaryStepResponse(
    val salaryStepId: UUID,
    val jobGradeId: UUID,
    val gradeName: String,
    val step: Int,
    val applyYear: Int,
    val baseSalary: BigDecimal
) {
    companion object {
        fun from(s: SalaryStep) = SalaryStepResponse(
            salaryStepId = s.salaryStepId,
            jobGradeId = s.jobGrade.jobGradeId,
            gradeName = s.jobGrade.gradeName,
            step = s.step,
            applyYear = s.applyYear,
            baseSalary = s.baseSalary
        )
    }
}
