package com.payroll.attendance

import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

data class LeaveRequestResponse(
    val leaveRequestId: UUID,
    val employeeId: UUID,
    val employeeName: String,
    val leaveTypeId: UUID,
    val leaveTypeName: String,
    val startDate: LocalDate,
    val endDate: LocalDate,
    val days: BigDecimal,
    val reason: String?,
    val status: String,
    val approvedBy: String?,
    val approvedAt: LocalDateTime?
)

data class LeaveRequestCreateRequest(
    val leaveTypeId: UUID,
    val startDate: LocalDate,
    val endDate: LocalDate,
    val days: BigDecimal,
    val reason: String? = null
)

data class ApproveRejectRequest(
    val approvedBy: String? = null,
    val comment: String? = null
)

fun LeaveRequest.toResponse() = LeaveRequestResponse(
    leaveRequestId = leaveRequestId,
    employeeId = employee.employeeId,
    employeeName = employee.fullName,
    leaveTypeId = leaveType.leaveTypeId,
    leaveTypeName = leaveType.typeName,
    startDate = startDate,
    endDate = endDate,
    days = days,
    reason = reason,
    status = status,
    approvedBy = approvedBy,
    approvedAt = approvedAt
)
