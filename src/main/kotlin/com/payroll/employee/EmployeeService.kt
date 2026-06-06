package com.payroll.employee

import com.payroll.company.CompanyRepository
import com.payroll.jobgrade.JobGradeRepository
import com.payroll.orgunit.OrgUnitRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class EmployeeService(
    private val employeeRepository: EmployeeRepository,
    private val companyRepository: CompanyRepository,
    private val orgUnitRepository: OrgUnitRepository,
    private val jobGradeRepository: JobGradeRepository
) {

    fun getByCompany(companyId: UUID): List<EmployeeResponse> {
        val company = companyRepository.findById(companyId)
            .orElseThrow { NoSuchElementException("고객사를 찾을 수 없습니다. id=$companyId") }
        return employeeRepository.findByCompany(company).map { EmployeeResponse.from(it) }
    }

    fun getById(companyId: UUID, employeeId: UUID): EmployeeResponse {
        val employee = employeeRepository.findById(employeeId)
            .orElseThrow { NoSuchElementException("직원을 찾을 수 없습니다. id=$employeeId") }
        if (employee.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")
        return EmployeeResponse.from(employee)
    }

    @Transactional
    fun create(companyId: UUID, request: EmployeeCreateRequest): EmployeeResponse {
        val company = companyRepository.findById(companyId)
            .orElseThrow { NoSuchElementException("고객사를 찾을 수 없습니다. id=$companyId") }
        if (employeeRepository.existsByCompanyAndEmployeeNo(company, request.employeeNo)) {
            throw IllegalArgumentException("이미 존재하는 사원번호입니다: ${request.employeeNo}")
        }
        val orgUnit = orgUnitRepository.findById(request.orgUnitId)
            .orElseThrow { NoSuchElementException("조직단위를 찾을 수 없습니다. id=${request.orgUnitId}") }
        val jobGrade = jobGradeRepository.findById(request.jobGradeId)
            .orElseThrow { NoSuchElementException("직급을 찾을 수 없습니다. id=${request.jobGradeId}") }
        val employee = Employee(
            company = company,
            orgUnit = orgUnit,
            jobGrade = jobGrade,
            employeeNo = request.employeeNo,
            fullName = request.fullName,
            employmentType = request.employmentType,
            currentStep = request.currentStep,
            dependentCount = request.dependentCount,
            hireDate = request.hireDate
        )
        return EmployeeResponse.from(employeeRepository.save(employee))
    }

    @Transactional
    fun update(companyId: UUID, employeeId: UUID, request: EmployeeUpdateRequest): EmployeeResponse {
        val employee = employeeRepository.findById(employeeId)
            .orElseThrow { NoSuchElementException("직원을 찾을 수 없습니다. id=$employeeId") }
        if (employee.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")
        employee.orgUnit = orgUnitRepository.findById(request.orgUnitId)
            .orElseThrow { NoSuchElementException("조직단위를 찾을 수 없습니다.") }
        employee.jobGrade = jobGradeRepository.findById(request.jobGradeId)
            .orElseThrow { NoSuchElementException("직급을 찾을 수 없습니다.") }
        employee.fullName = request.fullName
        employee.employmentType = request.employmentType
        employee.currentStep = request.currentStep
        employee.dependentCount = request.dependentCount
        employee.status = request.status
        return EmployeeResponse.from(employee)
    }
}
