package com.payroll.employee

import com.payroll.company.CompanyRepository
import com.payroll.jobgrade.JobGradeRepository
import com.payroll.orgunit.OrgUnitRepository
import com.payroll.salarystep.SalaryStepRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.util.UUID

private fun validateEmployeeDates(hireDate: LocalDate, leaveDate: LocalDate?) {
    if (hireDate.isAfter(LocalDate.now()))
        throw IllegalArgumentException("입사일은 오늘 이후 날짜로 등록할 수 없습니다. (입력값: $hireDate)")
    if (leaveDate != null && leaveDate.isBefore(hireDate))
        throw IllegalArgumentException("퇴직일($leaveDate)은 입사일($hireDate) 이후여야 합니다.")
    if (leaveDate != null && leaveDate.isAfter(LocalDate.now()))
        throw IllegalArgumentException("퇴직일은 오늘 이후 날짜로 등록할 수 없습니다.")
}

@Service
@Transactional(readOnly = true)
class EmployeeService(
    private val employeeRepository: EmployeeRepository,
    private val companyRepository: CompanyRepository,
    private val orgUnitRepository: OrgUnitRepository,
    private val jobGradeRepository: JobGradeRepository,
    private val salaryStepRepository: SalaryStepRepository
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
        validateEmployeeDates(request.hireDate, request.leaveDate)
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
            hireDate = request.hireDate,
            hasOwnCar = request.hasOwnCar,
            email = request.email,
            bankName = request.bankName,
            bankAccount = request.bankAccount,
            residentNo = request.residentNo,
            leaveDate = request.leaveDate
        )
        return EmployeeResponse.from(employeeRepository.save(employee))
    }

    @Transactional
    fun update(companyId: UUID, employeeId: UUID, request: EmployeeUpdateRequest): EmployeeResponse {
        val employee = employeeRepository.findById(employeeId)
            .orElseThrow { NoSuchElementException("직원을 찾을 수 없습니다. id=$employeeId") }
        if (employee.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")
        validateEmployeeDates(employee.hireDate, request.leaveDate)
        employee.orgUnit = orgUnitRepository.findById(request.orgUnitId)
            .orElseThrow { NoSuchElementException("조직단위를 찾을 수 없습니다.") }
        employee.jobGrade = jobGradeRepository.findById(request.jobGradeId)
            .orElseThrow { NoSuchElementException("직급을 찾을 수 없습니다.") }
        employee.fullName = request.fullName
        employee.employmentType = request.employmentType
        employee.currentStep = request.currentStep
        employee.dependentCount = request.dependentCount
        employee.status = request.status
        employee.hasOwnCar = request.hasOwnCar
        employee.email = request.email
        employee.bankName = request.bankName
        employee.bankAccount = request.bankAccount
        employee.residentNo = request.residentNo
        employee.leaveDate = request.leaveDate
        return EmployeeResponse.from(employee)
    }

    @Transactional
    fun stepIncrement(companyId: UUID, request: StepIncrementRequest): StepIncrementResult {
        val company = companyRepository.findById(companyId)
            .orElseThrow { NoSuchElementException("고객사를 찾을 수 없습니다. id=$companyId") }

        val employees = if (request.incrementAll) {
            // 재직 중인 직원만 호봉 승급 대상
            employeeRepository.findByCompanyAndStatus(company, "ACTIVE")
        } else {
            val ids = request.employeeIds ?: emptyList()
            ids.map { id ->
                employeeRepository.findById(id)
                    .orElseThrow { NoSuchElementException("직원을 찾을 수 없습니다. id=$id") }
                    .also { if (it.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.") }
            }
        }

        val details = mutableListOf<StepIncrementDetail>()

        for (employee in employees) {
            val stepsForGrade = salaryStepRepository.findByJobGradeAndApplyYear(
                employee.jobGrade, request.targetYear
            )
            val maxStep = stepsForGrade.maxOfOrNull { it.step }

            if (maxStep == null) {
                details.add(
                    StepIncrementDetail(
                        employeeNo = employee.employeeNo,
                        fullName = employee.fullName,
                        fromStep = employee.currentStep,
                        toStep = employee.currentStep,
                        reason = "해당 직급(${employee.jobGrade.gradeName})의 ${request.targetYear}년 호봉 테이블이 없습니다."
                    )
                )
                continue
            }

            if (employee.currentStep >= maxStep) {
                details.add(
                    StepIncrementDetail(
                        employeeNo = employee.employeeNo,
                        fullName = employee.fullName,
                        fromStep = employee.currentStep,
                        toStep = employee.currentStep,
                        reason = "이미 최고 호봉(${maxStep}호봉)입니다."
                    )
                )
            } else {
                val fromStep = employee.currentStep
                employee.currentStep = fromStep + 1
                details.add(
                    StepIncrementDetail(
                        employeeNo = employee.employeeNo,
                        fullName = employee.fullName,
                        fromStep = fromStep,
                        toStep = employee.currentStep,
                        reason = "정상 승급"
                    )
                )
            }
        }

        val incremented = details.count { it.fromStep != it.toStep }
        val skipped = details.count { it.fromStep == it.toStep }

        return StepIncrementResult(
            totalTarget = employees.size,
            incremented = incremented,
            skipped = skipped,
            details = details
        )
    }
}
