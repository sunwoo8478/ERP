package com.payroll.company

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.util.UUID

data class CompanyCreateRequest(
    @field:NotBlank(message = "고객사 코드는 필수입니다.")
    @field:Size(max = 50)
    val companyCode: String,

    @field:NotBlank(message = "고객사명은 필수입니다.")
    @field:Size(max = 200)
    val companyName: String
)

data class CompanyUpdateRequest(
    @field:NotBlank(message = "고객사명은 필수입니다.")
    @field:Size(max = 200)
    val companyName: String,

    @field:NotBlank
    val status: String
)

data class CompanyResponse(
    val companyId: UUID,
    val companyCode: String,
    val companyName: String,
    val status: String
) {
    companion object {
        fun from(company: Company) = CompanyResponse(
            companyId = company.companyId,
            companyCode = company.companyCode,
            companyName = company.companyName,
            status = company.status
        )
    }
}
