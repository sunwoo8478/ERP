package com.payroll.payrollslip

import com.payroll.common.ApiResponse
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
class PayrollSlipController(private val payrollSlipService: PayrollSlipService) {

    // 급여실행 전체 명세 목록 (항목 상세 포함)
    @GetMapping("/api/companies/{companyId}/payroll-runs/{payrollRunId}/slips")
    fun getSlipsByRun(
        @PathVariable companyId: UUID,
        @PathVariable payrollRunId: UUID
    ): ApiResponse<List<PayrollSlipDetailResponse>> =
        ApiResponse.ok(payrollSlipService.getSlipsByRun(companyId, payrollRunId))

    // 직원 개별 급여명세 상세 (갑근세/4대보험 항목별)
    @GetMapping("/api/companies/{companyId}/payroll-slips/{payrollSlipId}")
    fun getSlipDetail(
        @PathVariable companyId: UUID,
        @PathVariable payrollSlipId: UUID
    ): ApiResponse<PayrollSlipDetailResponse> =
        ApiResponse.ok(payrollSlipService.getSlipDetail(companyId, payrollSlipId))
}
