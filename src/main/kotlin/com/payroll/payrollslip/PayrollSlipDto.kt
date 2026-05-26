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
    val deliveryStatus: String,
    val earnings: List<PayrollItemDetail>,
    val deductions: List<PayrollItemDetail>
)

data class PayrollLedgerRow(
    val employeeNo: String,
    val fullName: String,
    val orgUnitName: String,
    val gradeName: String,
    val currentStep: Int,
    val baseSalary: BigDecimal,
    val mealAllowance: BigDecimal,
    val transportAllowance: BigDecimal,
    val positionAllowance: BigDecimal,
    val grossAmount: BigDecimal,
    val nonTaxableAmount: BigDecimal,
    val taxableIncome: BigDecimal,
    val healthInsurance: BigDecimal,
    val ltCare: BigDecimal,
    val pension: BigDecimal,
    val empInsurance: BigDecimal,
    val incomeTax: BigDecimal,
    val localIncomeTax: BigDecimal,
    val deductionAmount: BigDecimal,
    val netAmount: BigDecimal,
    val deliveryStatus: String
)

data class PayrollLedgerResponse(
    val runName: String,
    val payrollYear: Int,
    val payrollMonth: Int,
    val payDate: String,
    val rows: List<PayrollLedgerRow>,
    val totalGross: BigDecimal,
    val totalDeduction: BigDecimal,
    val totalNet: BigDecimal
)
