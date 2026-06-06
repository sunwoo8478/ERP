package com.payroll.salarystep

import com.payroll.jobgrade.JobGradeRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class SalaryStepService(
    private val salaryStepRepository: SalaryStepRepository,
    private val jobGradeRepository: JobGradeRepository
) {

    fun getByJobGrade(jobGradeId: UUID): List<SalaryStepResponse> {
        val jobGrade = jobGradeRepository.findById(jobGradeId)
            .orElseThrow { NoSuchElementException("직급을 찾을 수 없습니다. id=$jobGradeId") }
        return salaryStepRepository.findByJobGrade(jobGrade).map { SalaryStepResponse.from(it) }
    }

    @Transactional
    fun create(jobGradeId: UUID, request: SalaryStepCreateRequest): SalaryStepResponse {
        val jobGrade = jobGradeRepository.findById(jobGradeId)
            .orElseThrow { NoSuchElementException("직급을 찾을 수 없습니다. id=$jobGradeId") }
        if (salaryStepRepository.findByJobGradeAndStepAndApplyYear(jobGrade, request.step, request.applyYear).isPresent) {
            throw IllegalArgumentException("이미 존재하는 호봉기준입니다. ${request.applyYear}년 ${request.step}호봉")
        }
        val salaryStep = SalaryStep(
            jobGrade = jobGrade,
            step = request.step,
            applyYear = request.applyYear,
            baseSalary = request.baseSalary
        )
        return SalaryStepResponse.from(salaryStepRepository.save(salaryStep))
    }

    @Transactional
    fun update(salaryStepId: UUID, request: SalaryStepUpdateRequest): SalaryStepResponse {
        val salaryStep = salaryStepRepository.findById(salaryStepId)
            .orElseThrow { NoSuchElementException("호봉기준을 찾을 수 없습니다. id=$salaryStepId") }
        salaryStep.baseSalary = request.baseSalary
        return SalaryStepResponse.from(salaryStep)
    }

    @Transactional
    fun delete(salaryStepId: UUID) {
        if (!salaryStepRepository.existsById(salaryStepId)) {
            throw NoSuchElementException("호봉기준을 찾을 수 없습니다. id=$salaryStepId")
        }
        salaryStepRepository.deleteById(salaryStepId)
    }
}
