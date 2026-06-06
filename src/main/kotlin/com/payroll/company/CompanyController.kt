package com.payroll.company

import com.payroll.common.ApiResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/companies")
class CompanyController(private val companyService: CompanyService) {

    @GetMapping
    fun getAll(): ApiResponse<List<CompanyResponse>> =
        ApiResponse.ok(companyService.getAll())

    @GetMapping("/{companyId}")
    fun getById(@PathVariable companyId: UUID): ApiResponse<CompanyResponse> =
        ApiResponse.ok(companyService.getById(companyId))

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@Valid @RequestBody request: CompanyCreateRequest): ApiResponse<CompanyResponse> =
        ApiResponse.ok(companyService.create(request), "고객사가 등록되었습니다.")

    @PutMapping("/{companyId}")
    fun update(
        @PathVariable companyId: UUID,
        @Valid @RequestBody request: CompanyUpdateRequest
    ): ApiResponse<CompanyResponse> =
        ApiResponse.ok(companyService.update(companyId, request), "고객사 정보가 수정되었습니다.")

    @DeleteMapping("/{companyId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@PathVariable companyId: UUID) =
        companyService.delete(companyId)
}
