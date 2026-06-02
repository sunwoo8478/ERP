package com.payroll.severance

import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

data class SeveranceRequest(
    val calculationDate: LocalDate,
    val note: String? = null
)

data class SeveranceResponse(
    val severanceId: UUID,
    val employeeId: UUID,
    val employeeNo: String,
    val fullName: String,
    val hireDate: LocalDate,
    val calculationDate: LocalDate,
    val tenureDays: Int,
    val tenureYears: Double,
    val avgDailyWage: BigDecimal,
    val severanceAmount: BigDecimal,
    val status: String,
    val note: String?
)
