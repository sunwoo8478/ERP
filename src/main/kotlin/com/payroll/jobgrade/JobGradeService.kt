package com.payroll.jobgrade

import com.payroll.company.CompanyRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class JobGradeService(
    private val jobGradeRepository: JobGradeRepository,
    private val companyRepository: CompanyRepository
) {

    fun getByCompany(companyId: UUID): List<JobGradeResponse> {
        val company = companyRepository.findById(companyId)
            .orElseThrow { NoSuchElementException("고객사를 찾을 수 없습니다. id=$companyId") }
        return jobGradeRepository.findByCompanyOrderBySortOrder(company).map { JobGradeResponse.from(it) }
    }

    @Transactional
    fun create(companyId: UUID, request: JobGradeCreateRequest): JobGradeResponse {
        val company = companyRepository.findById(companyId)
            .orElseThrow { NoSuchElementException("고객사를 찾을 수 없습니다. id=$companyId") }
        val jobGrade = JobGrade(
            company = company,
            gradeName = request.gradeName,
            positionName = request.positionName,
            sortOrder = request.sortOrder
        )
        return JobGradeResponse.from(jobGradeRepository.save(jobGrade))
    }

    @Transactional
    fun update(companyId: UUID, jobGradeId: UUID, request: JobGradeUpdateRequest): JobGradeResponse {
        val jobGrade = jobGradeRepository.findById(jobGradeId)
            .orElseThrow { NoSuchElementException("직급을 찾을 수 없습니다. id=$jobGradeId") }
        if (jobGrade.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")
        jobGrade.gradeName = request.gradeName
        jobGrade.positionName = request.positionName
        jobGrade.sortOrder = request.sortOrder
        return JobGradeResponse.from(jobGrade)
    }

    @Transactional
    fun delete(companyId: UUID, jobGradeId: UUID) {
        val jobGrade = jobGradeRepository.findById(jobGradeId)
            .orElseThrow { NoSuchElementException("직급을 찾을 수 없습니다. id=$jobGradeId") }
        if (jobGrade.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")
        jobGradeRepository.delete(jobGrade)
    }
}
