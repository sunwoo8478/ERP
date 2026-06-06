package com.payroll.salarystandard

import com.payroll.employee.EmployeeRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.util.UUID

@Service
@Transactional(readOnly = true)
class SalaryStandardService(
    private val salaryStandardRepository: SalaryStandardRepository,
    private val employeeRepository: EmployeeRepository
) {

    fun getHistory(companyId: UUID, employeeId: UUID): List<SalaryStandardResponse> {
        val employee = employeeRepository.findById(employeeId)
            .orElseThrow { NoSuchElementException("직원을 찾을 수 없습니다. id=$employeeId") }
        if (employee.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")
        return salaryStandardRepository.findByEmployeeOrderByEffectiveStartDateDesc(employee)
            .map { SalaryStandardResponse.from(it) }
    }

    @Transactional
    fun create(companyId: UUID, employeeId: UUID, request: SalaryStandardCreateRequest): SalaryStandardResponse {
        val employee = employeeRepository.findById(employeeId)
            .orElseThrow { NoSuchElementException("직원을 찾을 수 없습니다. id=$employeeId") }
        if (employee.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")

        // 기존 유효한 급여기준 종료 처리
        val existing = salaryStandardRepository.findCurrentByEmployee(employee, request.effectiveStartDate)
        existing.firstOrNull()?.let {
            it.effectiveEndDate = request.effectiveStartDate.minusDays(1)
        }

        val salaryStandard = SalaryStandard(
            employee = employee,
            effectiveStartDate = request.effectiveStartDate,
            mealAllowance = request.mealAllowance,
            transportAllowance = request.transportAllowance,
            positionAllowance = request.positionAllowance,
            changeReason = request.changeReason
        )
        return SalaryStandardResponse.from(salaryStandardRepository.save(salaryStandard))
    }
}
