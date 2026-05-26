package com.payroll.payrollslip

import com.payroll.common.ApiResponse
import org.springframework.web.bind.annotation.*
import java.util.UUID
import java.time.LocalDate

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

    // 명세서 발송 처리 (발송 상태 SENT 로 업데이트)
    @PostMapping("/api/companies/{companyId}/payroll-runs/{payrollRunId}/slips/send")
    fun sendSlips(
        @PathVariable companyId: UUID,
        @PathVariable payrollRunId: UUID
    ): ApiResponse<Map<String, Int>> =
        ApiResponse.ok(payrollSlipService.markAsSent(companyId, payrollRunId), "명세서 발송이 완료되었습니다.")

    // 급여 대장 (전 직원 집계)
    @GetMapping("/api/companies/{companyId}/payroll-runs/{payrollRunId}/ledger")
    fun getLedger(
        @PathVariable companyId: UUID,
        @PathVariable payrollRunId: UUID
    ): ApiResponse<PayrollLedgerResponse> =
        ApiResponse.ok(payrollSlipService.getLedger(companyId, payrollRunId))
}
