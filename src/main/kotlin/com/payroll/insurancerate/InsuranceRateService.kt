package com.payroll.insurancerate

import com.payroll.company.CompanyRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class InsuranceRateService(
    private val insuranceRateRepository: InsuranceRateRepository,
    private val companyRepository: CompanyRepository
) {

    fun getByCompany(companyId: UUID): List<InsuranceRateResponse> {
        val company = companyRepository.findById(companyId)
            .orElseThrow { NoSuchElementException("고객사를 찾을 수 없습니다. id=$companyId") }
        return insuranceRateRepository.findByCompanyOrderByApplyYearDesc(company).map { InsuranceRateResponse.from(it) }
    }

    @Transactional
    fun create(companyId: UUID, request: InsuranceRateCreateRequest): InsuranceRateResponse {
        val company = companyRepository.findById(companyId)
            .orElseThrow { NoSuchElementException("고객사를 찾을 수 없습니다. id=$companyId") }
        if (insuranceRateRepository.findByCompanyAndApplyYear(company, request.applyYear).isPresent) {
            throw IllegalArgumentException("이미 ${request.applyYear}년 보험요율이 등록되어 있습니다.")
        }
        val rate = InsuranceRate(
            company = company,
            applyYear = request.applyYear,
            healthEmployee = request.healthEmployee,
            healthEmployer = request.healthEmployer,
            ltCareEmployee = request.ltCareEmployee,
            ltCareEmployer = request.ltCareEmployer,
            pensionEmployee = request.pensionEmployee,
            pensionEmployer = request.pensionEmployer,
            empInsEmployee = request.empInsEmployee,
            empInsEmployer = request.empInsEmployer,
            accidentEmployer = request.accidentEmployer
        )
        return InsuranceRateResponse.from(insuranceRateRepository.save(rate))
    }

    @Transactional
    fun update(companyId: UUID, rateId: UUID, request: InsuranceRateCreateRequest): InsuranceRateResponse {
        val rate = insuranceRateRepository.findById(rateId)
            .orElseThrow { NoSuchElementException("보험요율을 찾을 수 없습니다. id=$rateId") }
        if (rate.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")
        rate.healthEmployee = request.healthEmployee
        rate.healthEmployer = request.healthEmployer
        rate.ltCareEmployee = request.ltCareEmployee
        rate.ltCareEmployer = request.ltCareEmployer
        rate.pensionEmployee = request.pensionEmployee
        rate.pensionEmployer = request.pensionEmployer
        rate.empInsEmployee = request.empInsEmployee
        rate.empInsEmployer = request.empInsEmployer
        rate.accidentEmployer = request.accidentEmployer
        return InsuranceRateResponse.from(rate)
    }
}
