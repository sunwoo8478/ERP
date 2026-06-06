package com.payroll.insurancerate

import com.payroll.common.ApiResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/companies/{companyId}/insurance-rates")
class InsuranceRateController(private val insuranceRateService: InsuranceRateService) {

    @GetMapping
    fun getAll(@PathVariable companyId: UUID): ApiResponse<List<InsuranceRateResponse>> =
        ApiResponse.ok(insuranceRateService.getByCompany(companyId))

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @PathVariable companyId: UUID,
        @Valid @RequestBody request: InsuranceRateCreateRequest
    ): ApiResponse<InsuranceRateResponse> =
        ApiResponse.ok(insuranceRateService.create(companyId, request), "보험요율이 등록되었습니다.")

    @PutMapping("/{rateId}")
    fun update(
        @PathVariable companyId: UUID,
        @PathVariable rateId: UUID,
        @Valid @RequestBody request: InsuranceRateCreateRequest
    ): ApiResponse<InsuranceRateResponse> =
        ApiResponse.ok(insuranceRateService.update(companyId, rateId, request), "보험요율이 수정되었습니다.")
}
