package com.payroll.company

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.LocalDate
import java.util.UUID

data class CompanyCreateRequest(
    @field:NotBlank(message = "고객사 코드는 필수입니다.")
    @field:Size(max = 50)
    val companyCode: String,

    @field:NotBlank(message = "고객사명은 필수입니다.")
    @field:Size(max = 200)
    val companyName: String,

    val bizNo: String? = null,
    val ceo: String? = null,
    val industry: String? = null,
    val sinceDate: LocalDate? = null,
    val address: String? = null,
    val phone: String? = null,
    val payrollContact: String? = null,
    val payrollContactEmail: String? = null,
    val bankName: String? = null,
    val bankAccount: String? = null
)

data class CompanyUpdateRequest(
    @field:NotBlank(message = "고객사명은 필수입니다.")
    @field:Size(max = 200)
    val companyName: String,

    @field:NotBlank
    val status: String,

    val bizNo: String? = null,
    val ceo: String? = null,
    val industry: String? = null,
    val sinceDate: LocalDate? = null,
    val address: String? = null,
    val phone: String? = null,
    val payrollContact: String? = null,
    val payrollContactEmail: String? = null,
    val bankName: String? = null,
    val bankAccount: String? = null
)

data class CompanyResponse(
    val companyId: UUID,
    val companyCode: String,
    val companyName: String,
    val status: String,
    val bizNo: String?,
    val ceo: String?,
    val industry: String?,
    val sinceDate: LocalDate?,
    val address: String?,
    val phone: String?,
    val payrollContact: String?,
    val payrollContactEmail: String?,
    val bankName: String?,
    val bankAccount: String?
) {
    companion object {
        fun from(company: Company) = CompanyResponse(
            companyId = company.companyId,
            companyCode = company.companyCode,
            companyName = company.companyName,
            status = company.status,
            bizNo = company.bizNo,
            ceo = company.ceo,
            industry = company.industry,
            sinceDate = company.sinceDate,
            address = company.address,
            phone = company.phone,
            payrollContact = company.payrollContact,
            payrollContactEmail = company.payrollContactEmail,
            bankName = company.bankName,
            bankAccount = company.bankAccount
        )
    }
}
