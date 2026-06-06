package com.payroll.insurancerate

import jakarta.validation.constraints.NotNull
import java.math.BigDecimal
import java.util.UUID

data class InsuranceRateCreateRequest(
    @field:NotNull val applyYear: Int,
    val healthEmployee: BigDecimal = BigDecimal("0.03545"),
    val healthEmployer: BigDecimal = BigDecimal("0.03545"),
    val ltCareEmployee: BigDecimal = BigDecimal("0.1295"),
    val ltCareEmployer: BigDecimal = BigDecimal("0.1295"),
    val pensionEmployee: BigDecimal = BigDecimal("0.045"),
    val pensionEmployer: BigDecimal = BigDecimal("0.045"),
    val empInsEmployee: BigDecimal = BigDecimal("0.009"),
    val empInsEmployer: BigDecimal = BigDecimal("0.009"),
    val accidentEmployer: BigDecimal = BigDecimal("0.009")
)

data class InsuranceRateResponse(
    val rateId: UUID,
    val companyId: UUID,
    val applyYear: Int,
    val healthEmployee: BigDecimal,
    val healthEmployer: BigDecimal,
    val ltCareEmployee: BigDecimal,
    val ltCareEmployer: BigDecimal,
    val pensionEmployee: BigDecimal,
    val pensionEmployer: BigDecimal,
    val empInsEmployee: BigDecimal,
    val empInsEmployer: BigDecimal,
    val accidentEmployer: BigDecimal
) {
    companion object {
        fun from(r: InsuranceRate) = InsuranceRateResponse(
            rateId = r.rateId,
            companyId = r.company.companyId,
            applyYear = r.applyYear,
            healthEmployee = r.healthEmployee,
            healthEmployer = r.healthEmployer,
            ltCareEmployee = r.ltCareEmployee,
            ltCareEmployer = r.ltCareEmployer,
            pensionEmployee = r.pensionEmployee,
            pensionEmployer = r.pensionEmployer,
            empInsEmployee = r.empInsEmployee,
            empInsEmployer = r.empInsEmployer,
            accidentEmployer = r.accidentEmployer
        )
    }
}
