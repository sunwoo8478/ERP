package com.payroll.attendance

import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

data class OvertimeResponse(
    val overtimeId: UUID,
    val employeeId: UUID,
    val employeeName: String,
    val workDate: LocalDate,
    val overtimeType: String,
    val hours: BigDecimal,
    val payRate: BigDecimal,
    val approved: Boolean,
    val memo: String?
)

data class OvertimeCreateRequest(
    val workDate: LocalDate,
    val overtimeType: String,
    val hours: BigDecimal,
    val payRate: BigDecimal = BigDecimal("1.5"),
    val memo: String? = null
)

fun OvertimeRecord.toResponse() = OvertimeResponse(
    overtimeId = overtimeId,
    employeeId = employee.employeeId,
    employeeName = employee.fullName,
    workDate = workDate,
    overtimeType = overtimeType,
    hours = hours,
    payRate = payRate,
    approved = approved,
    memo = memo
)
