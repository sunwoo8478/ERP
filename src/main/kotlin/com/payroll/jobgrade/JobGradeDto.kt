package com.payroll.jobgrade

import jakarta.validation.constraints.NotBlank
import java.util.UUID

data class JobGradeCreateRequest(
    @field:NotBlank(message = "직급명은 필수입니다.")
    val gradeName: String,
    val positionName: String? = null,
    val sortOrder: Int = 0
)

data class JobGradeUpdateRequest(
    @field:NotBlank(message = "직급명은 필수입니다.")
    val gradeName: String,
    val positionName: String? = null,
    val sortOrder: Int = 0
)

data class JobGradeResponse(
    val jobGradeId: UUID,
    val companyId: UUID,
    val gradeName: String,
    val positionName: String?,
    val sortOrder: Int
) {
    companion object {
        fun from(jobGrade: JobGrade) = JobGradeResponse(
            jobGradeId = jobGrade.jobGradeId,
            companyId = jobGrade.company.companyId,
            gradeName = jobGrade.gradeName,
            positionName = jobGrade.positionName,
            sortOrder = jobGrade.sortOrder
        )
    }
}
