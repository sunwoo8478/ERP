package com.payroll.attendance

import java.util.UUID

data class LeaveTypeResponse(
    val leaveTypeId: UUID,
    val companyId: UUID,
    val typeName: String,
    val isPaid: Boolean,
    val maxDaysPerYear: Int?,
    val sortOrder: Int
)

data class LeaveTypeCreateRequest(
    val typeName: String,
    val isPaid: Boolean = true,
    val maxDaysPerYear: Int? = null,
    val sortOrder: Int = 0
)

data class LeaveTypeUpdateRequest(
    val typeName: String?,
    val isPaid: Boolean?,
    val maxDaysPerYear: Int?,
    val sortOrder: Int?
)

fun LeaveType.toResponse() = LeaveTypeResponse(
    leaveTypeId = leaveTypeId,
    companyId = company.companyId,
    typeName = typeName,
    isPaid = isPaid,
    maxDaysPerYear = maxDaysPerYear,
    sortOrder = sortOrder
)
