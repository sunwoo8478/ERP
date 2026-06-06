package com.payroll.payrollslip

import java.math.BigDecimal
import java.util.UUID

data class PayrollItemDetail(
    val payrollItemId: UUID,
    val itemType: String,
    val itemName: String,
    val isTaxable: Boolean,
    val amount: BigDecimal
)

data class PayrollSlipDetailResponse(
    val payrollSlipId: UUID,
    val employeeNo: String,
    val fullName: String,
    val gradeName: String,
    val currentStep: Int,
    val orgUnitName: String,
    val grossAmount: BigDecimal,
    val nonTaxableAmount: BigDecimal,
    val taxableIncome: BigDecimal,
    val deductionAmount: BigDecimal,
    val netAmount: BigDecimal,
    val earnings: List<PayrollItemDetail>,
    val deductions: List<PayrollItemDetail>
)
