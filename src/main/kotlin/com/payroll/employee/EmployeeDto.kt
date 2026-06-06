package com.payroll.employee

import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import java.time.LocalDate
import java.util.UUID

data class EmployeeCreateRequest(
    @field:NotNull val orgUnitId: UUID,
    @field:NotNull val jobGradeId: UUID,
    @field:NotBlank val employeeNo: String,
    @field:NotBlank val fullName: String,
    val employmentType: String = "FULL_TIME",
    @field:Min(1) val currentStep: Int = 1,
    @field:Min(0) val dependentCount: Int = 0,
    @field:NotNull val hireDate: LocalDate
)

data class EmployeeUpdateRequest(
    @field:NotNull val orgUnitId: UUID,
    @field:NotNull val jobGradeId: UUID,
    @field:NotBlank val fullName: String,
    val employmentType: String,
    @field:Min(1) val currentStep: Int,
    @field:Min(0) val dependentCount: Int,
    @field:NotBlank val status: String
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
    val status: String
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
            status = e.status
        )
    }
}
