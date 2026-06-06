package com.payroll.company

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class CompanyService(private val companyRepository: CompanyRepository) {

    fun getAll(): List<CompanyResponse> =
        companyRepository.findAll().map { CompanyResponse.from(it) }

    fun getById(companyId: UUID): CompanyResponse {
        val company = companyRepository.findById(companyId)
            .orElseThrow { NoSuchElementException("고객사를 찾을 수 없습니다. id=$companyId") }
        return CompanyResponse.from(company)
    }

    @Transactional
    fun create(request: CompanyCreateRequest): CompanyResponse {
        if (companyRepository.existsByCompanyCode(request.companyCode)) {
            throw IllegalArgumentException("이미 존재하는 고객사 코드입니다: ${request.companyCode}")
        }
        val company = Company(
            companyCode = request.companyCode,
            companyName = request.companyName
        )
        return CompanyResponse.from(companyRepository.save(company))
    }

    @Transactional
    fun update(companyId: UUID, request: CompanyUpdateRequest): CompanyResponse {
        val company = companyRepository.findById(companyId)
            .orElseThrow { NoSuchElementException("고객사를 찾을 수 없습니다. id=$companyId") }
        company.companyName = request.companyName
        company.status = request.status
        return CompanyResponse.from(company)
    }

    @Transactional
    fun delete(companyId: UUID) {
        if (!companyRepository.existsById(companyId)) {
            throw NoSuchElementException("고객사를 찾을 수 없습니다. id=$companyId")
        }
        companyRepository.deleteById(companyId)
    }
}
