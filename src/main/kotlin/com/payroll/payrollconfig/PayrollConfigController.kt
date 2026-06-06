package com.payroll.payrollconfig

import com.payroll.common.ApiResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/companies/{companyId}/payroll-configs")
class PayrollConfigController(private val payrollConfigService: PayrollConfigService) {

    @GetMapping
    fun getAll(@PathVariable companyId: UUID): ApiResponse<List<PayrollConfigResponse>> =
        ApiResponse.ok(payrollConfigService.getByCompany(companyId))

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @PathVariable companyId: UUID,
        @Valid @RequestBody request: PayrollConfigCreateRequest
    ): ApiResponse<PayrollConfigResponse> =
        ApiResponse.ok(payrollConfigService.create(companyId, request), "비과세 한도가 등록되었습니다.")

    @PutMapping("/{configId}")
    fun update(
        @PathVariable companyId: UUID,
        @PathVariable configId: UUID,
        @RequestBody request: PayrollConfigUpdateRequest
    ): ApiResponse<PayrollConfigResponse> =
        ApiResponse.ok(payrollConfigService.update(companyId, configId, request), "비과세 한도가 수정되었습니다.")
}
