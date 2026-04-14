package com.payroll.employment

import com.payroll.employee.EmployeeRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class EmploymentHistoryService(
    private val employmentHistoryRepository: EmploymentHistoryRepository,
    private val employeeRepository: EmployeeRepository
) {

    fun getByEmployee(employeeId: UUID): List<EmploymentHistoryResponse> {
        val employee = employeeRepository.findById(employeeId)
            .orElseThrow { NoSuchElementException("직원을 찾을 수 없습니다. id=$employeeId") }
        return employmentHistoryRepository.findByEmployeeOrderByChangeDateDesc(employee)
            .map { EmploymentHistoryResponse.from(it) }
    }

    fun getByCompany(companyId: UUID): List<EmploymentHistoryResponse> {
        return employmentHistoryRepository.findByEmployee_Company_CompanyIdOrderByChangeDateDesc(companyId)
            .map { EmploymentHistoryResponse.from(it) }
    }

    @Transactional
    fun create(request: EmploymentHistoryCreateRequest): EmploymentHistoryResponse {
        val employee = employeeRepository.findById(request.employeeId)
            .orElseThrow { NoSuchElementException("직원을 찾을 수 없습니다. id=${request.employeeId}") }
        val history = EmploymentHistory(
            employee = employee,
            changeType = request.changeType,
            fromOrgUnitName = request.fromOrgUnitName,
            toOrgUnitName = request.toOrgUnitName,
            fromGradeName = request.fromGradeName,
            toGradeName = request.toGradeName,
            fromStep = request.fromStep,
            toStep = request.toStep,
            changeDate = request.changeDate,
            reason = request.reason,
            changedBy = request.changedBy
        )
        return EmploymentHistoryResponse.from(employmentHistoryRepository.save(history))
    }
}
