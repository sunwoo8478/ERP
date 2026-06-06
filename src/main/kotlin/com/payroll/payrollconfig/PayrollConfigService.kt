package com.payroll.payrollconfig

import com.payroll.company.CompanyRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.util.UUID

@Service
@Transactional(readOnly = true)
class PayrollConfigService(
    private val payrollConfigRepository: PayrollConfigRepository,
    private val companyRepository: CompanyRepository
) {

    fun getByCompany(companyId: UUID): List<PayrollConfigResponse> {
        val company = companyRepository.findById(companyId)
            .orElseThrow { NoSuchElementException("고객사를 찾을 수 없습니다. id=$companyId") }
        return payrollConfigRepository.findByCompanyOrderByApplyYearDesc(company)
            .map { PayrollConfigResponse.from(it) }
    }

    fun getByCompanyAndYear(companyId: UUID, year: Int): PayrollConfigResponse? {
        val company = companyRepository.findById(companyId)
            .orElseThrow { NoSuchElementException("고객사를 찾을 수 없습니다. id=$companyId") }
        return payrollConfigRepository.findByCompanyAndApplyYear(company, year)
            .map { PayrollConfigResponse.from(it) }
            .orElse(null)
    }

    @Transactional
    fun create(companyId: UUID, request: PayrollConfigCreateRequest): PayrollConfigResponse {
        val company = companyRepository.findById(companyId)
            .orElseThrow { NoSuchElementException("고객사를 찾을 수 없습니다. id=$companyId") }
        if (payrollConfigRepository.findByCompanyAndApplyYear(company, request.applyYear).isPresent) {
            throw IllegalArgumentException("${request.applyYear}년 비과세 한도가 이미 존재합니다.")
        }
        val config = PayrollConfig(
            company = company,
            applyYear = request.applyYear,
            mealNonTaxable = request.mealNonTaxable,
            transportNonTaxable = request.transportNonTaxable
        )
        return PayrollConfigResponse.from(payrollConfigRepository.save(config))
    }

    @Transactional
    fun update(companyId: UUID, configId: UUID, request: PayrollConfigUpdateRequest): PayrollConfigResponse {
        val config = payrollConfigRepository.findById(configId)
            .orElseThrow { NoSuchElementException("설정을 찾을 수 없습니다. id=$configId") }
        if (config.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")
        config.mealNonTaxable = request.mealNonTaxable
        config.transportNonTaxable = request.transportNonTaxable
        return PayrollConfigResponse.from(config)
    }

    // Called by PayrollCalculationService — returns defaults if no config registered
    fun getNonTaxableLimits(companyId: UUID, year: Int): Pair<BigDecimal, BigDecimal> {
        val company = companyRepository.findById(companyId).orElse(null) ?: return DEFAULT
        val config = payrollConfigRepository.findByCompanyAndApplyYear(company, year).orElse(null)
            ?: return DEFAULT
        return Pair(config.mealNonTaxable, config.transportNonTaxable)
    }

    companion object {
        val DEFAULT = Pair(BigDecimal("200000"), BigDecimal("200000"))
    }
}
