package com.payroll.payrollconfig

import jakarta.validation.constraints.NotNull
import java.math.BigDecimal
import java.util.UUID

data class PayrollConfigCreateRequest(
    @field:NotNull val applyYear: Int,
    val mealNonTaxable: BigDecimal = BigDecimal("200000"),
    val transportNonTaxable: BigDecimal = BigDecimal("200000"),
    val pensionMaxBase: BigDecimal = BigDecimal("6170000")
)

data class PayrollConfigUpdateRequest(
    val mealNonTaxable: BigDecimal,
    val transportNonTaxable: BigDecimal,
    val pensionMaxBase: BigDecimal
)

data class PayrollConfigResponse(
    val configId: UUID,
    val companyId: UUID,
    val applyYear: Int,
    val mealNonTaxable: BigDecimal,
    val transportNonTaxable: BigDecimal,
    val pensionMaxBase: BigDecimal
) {
    companion object {
        fun from(c: PayrollConfig) = PayrollConfigResponse(
            configId = c.configId,
            companyId = c.company.companyId,
            applyYear = c.applyYear,
            mealNonTaxable = c.mealNonTaxable,
            transportNonTaxable = c.transportNonTaxable,
            pensionMaxBase = c.pensionMaxBase
        )
    }
}
