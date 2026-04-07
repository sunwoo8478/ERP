package com.payroll.employee

import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import java.time.LocalDate
import java.util.UUID

data class StepIncrementRequest(
    val targetYear: Int,
    val incrementAll: Boolean = true,
    val employeeIds: List<UUID>? = null
)

data class StepIncrementDetail(
    val employeeNo: String,
    val fullName: String,
    val fromStep: Int,
    val toStep: Int,
    val reason: String
)

data class StepIncrementResult(
    val totalTarget: Int,
    val incremented: Int,
    val skipped: Int,
    val details: List<StepIncrementDetail>
)

data class EmployeeCreateRequest(
    @field:NotNull val orgUnitId: UUID,
    @field:NotNull val jobGradeId: UUID,
    @field:NotBlank val employeeNo: String,
    @field:NotBlank val fullName: String,
    val employmentType: String = "FULL_TIME",
    @field:Min(1) val currentStep: Int = 1,
    @field:Min(0) val dependentCount: Int = 0,
    @field:NotNull val hireDate: LocalDate,
    val hasOwnCar: Boolean = false,
    val email: String? = null,
    val bankName: String? = null,
    val bankAccount: String? = null,
    val residentNo: String? = null,
    val leaveDate: LocalDate? = null
)

data class EmployeeUpdateRequest(
    @field:NotNull val orgUnitId: UUID,
    @field:NotNull val jobGradeId: UUID,
    @field:NotBlank val fullName: String,
    val employmentType: String,
    @field:Min(1) val currentStep: Int,
    @field:Min(0) val dependentCount: Int,
    @field:NotBlank val status: String,
    val hasOwnCar: Boolean = false,
    val email: String? = null,
    val bankName: String? = null,
    val bankAccount: String? = null,
    val residentNo: String? = null,
    val leaveDate: LocalDate? = null
)

data class EmployeeResponse(
    val employeeId: UUID,
    val companyId: UUID,
    val orgUnitId: UUID,
    val orgUnitName: String,
    val jobGradeId: UUID,
    val gradeName: String,
    val employeeNo: String,
    val fullName: String,
    val employmentType: String,
    val currentStep: Int,
    val dependentCount: Int,
    val hireDate: LocalDate,
    val status: String,
    val hasOwnCar: Boolean,
    val email: String?,
    val bankName: String?,
    val bankAccount: String?,
    val residentNo: String?,
    val leaveDate: LocalDate?
) {
    companion object {
        fun from(e: Employee) = EmployeeResponse(
            employeeId = e.employeeId,
            companyId = e.company.companyId,
            orgUnitId = e.orgUnit.orgUnitId,
            orgUnitName = e.orgUnit.orgUnitName,
            jobGradeId = e.jobGrade.jobGradeId,
            gradeName = e.jobGrade.gradeName,
            employeeNo = e.employeeNo,
            fullName = e.fullName,
            employmentType = e.employmentType,
            currentStep = e.currentStep,
            dependentCount = e.dependentCount,
            hireDate = e.hireDate,
            status = e.status,
            hasOwnCar = e.hasOwnCar,
            email = e.email,
            bankName = e.bankName,
            bankAccount = e.bankAccount,
            residentNo = e.residentNo,
            leaveDate = e.leaveDate
        )
    }
}
