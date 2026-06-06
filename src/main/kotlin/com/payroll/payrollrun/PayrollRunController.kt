package com.payroll.payrollrun

import com.payroll.common.ApiResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/companies/{companyId}/payroll-runs")
class PayrollRunController(private val payrollRunService: PayrollRunService) {

    @GetMapping
    fun getAll(@PathVariable companyId: UUID): ApiResponse<List<PayrollRunResponse>> =
        ApiResponse.ok(payrollRunService.getByCompany(companyId))

    @GetMapping("/{payrollRunId}")
    fun getById(
        @PathVariable companyId: UUID,
        @PathVariable payrollRunId: UUID
    ): ApiResponse<PayrollRunResponse> =
        ApiResponse.ok(payrollRunService.getById(companyId, payrollRunId))

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @PathVariable companyId: UUID,
        @Valid @RequestBody request: PayrollRunCreateRequest
    ): ApiResponse<PayrollRunResponse> =
        ApiResponse.ok(payrollRunService.create(companyId, request), "급여실행이 생성되었습니다.")

    @PostMapping("/{payrollRunId}/calculate")
    fun calculate(
        @PathVariable companyId: UUID,
        @PathVariable payrollRunId: UUID
    ): ApiResponse<List<PayrollSlipSummary>> =
        ApiResponse.ok(payrollRunService.calculate(companyId, payrollRunId), "급여 계산이 완료되었습니다.")

    @PostMapping("/{payrollRunId}/approve")
    fun approve(
        @PathVariable companyId: UUID,
        @PathVariable payrollRunId: UUID
    ): ApiResponse<PayrollRunResponse> =
        ApiResponse.ok(payrollRunService.approve(companyId, payrollRunId), "급여가 승인되었습니다.")

    @PostMapping("/{payrollRunId}/mark-paid")
    fun markAsPaid(
        @PathVariable companyId: UUID,
        @PathVariable payrollRunId: UUID
    ): ApiResponse<PayrollRunResponse> =
        ApiResponse.ok(payrollRunService.markAsPaid(companyId, payrollRunId), "지급 처리가 완료되었습니다.")

    @PutMapping("/{payrollRunId}")
    fun update(
        @PathVariable companyId: UUID,
        @PathVariable payrollRunId: UUID,
        @Valid @RequestBody request: PayrollRunUpdateRequest
    ): ApiResponse<PayrollRunResponse> =
        ApiResponse.ok(payrollRunService.update(companyId, payrollRunId, request), "급여실행이 수정되었습니다.")

    @DeleteMapping("/{payrollRunId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(
        @PathVariable companyId: UUID,
        @PathVariable payrollRunId: UUID
    ) = payrollRunService.delete(companyId, payrollRunId)
}
