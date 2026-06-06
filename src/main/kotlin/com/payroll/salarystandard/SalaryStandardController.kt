package com.payroll.salarystandard

import com.payroll.common.ApiResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/companies/{companyId}/employees/{employeeId}/salary-standards")
class SalaryStandardController(private val salaryStandardService: SalaryStandardService) {

    @GetMapping
    fun getHistory(
        @PathVariable companyId: UUID,
        @PathVariable employeeId: UUID
    ): ApiResponse<List<SalaryStandardResponse>> =
        ApiResponse.ok(salaryStandardService.getHistory(companyId, employeeId))

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @PathVariable companyId: UUID,
        @PathVariable employeeId: UUID,
        @Valid @RequestBody request: SalaryStandardCreateRequest
    ): ApiResponse<SalaryStandardResponse> =
        ApiResponse.ok(salaryStandardService.create(companyId, employeeId, request), "급여기준이 등록되었습니다.")
}
