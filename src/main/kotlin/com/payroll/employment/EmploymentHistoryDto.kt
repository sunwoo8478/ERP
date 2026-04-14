package com.payroll.employment

import java.time.LocalDate
import java.util.UUID

data class EmploymentHistoryCreateRequest(
    val employeeId: UUID,
    val changeType: String,
    val fromOrgUnitName: String? = null,
    val toOrgUnitName: String? = null,
    val fromGradeName: String? = null,
    val toGradeName: String? = null,
    val fromStep: Int? = null,
    val toStep: Int? = null,
    val changeDate: LocalDate,
    val reason: String? = null,
    val changedBy: String? = null
)

data class EmploymentHistoryResponse(
    val employmentHistoryId: UUID,
    val employeeId: UUID,
    val employeeNo: String,
    val fullName: String,
    val changeType: String,
    val fromOrgUnitName: String?,
    val toOrgUnitName: String?,
    val fromGradeName: String?,
    val toGradeName: String?,
    val fromStep: Int?,
    val toStep: Int?,
    val changeDate: LocalDate,
    val reason: String?,
    val changedBy: String?
) {
    companion object {
        fun from(entity: EmploymentHistory) = EmploymentHistoryResponse(
            employmentHistoryId = entity.employmentHistoryId,
            employeeId = entity.employee.employeeId,
            employeeNo = entity.employee.employeeNo,
            fullName = entity.employee.fullName,
            changeType = entity.changeType,
            fromOrgUnitName = entity.fromOrgUnitName,
            toOrgUnitName = entity.toOrgUnitName,
            fromGradeName = entity.fromGradeName,
            toGradeName = entity.toGradeName,
            fromStep = entity.fromStep,
            toStep = entity.toStep,
            changeDate = entity.changeDate,
            reason = entity.reason,
            changedBy = entity.changedBy
        )
    }
}
