package com.payroll.severance

import com.payroll.common.ApiResponse
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
class SeveranceController(private val severanceService: SeveranceService) {

    @PostMapping("/api/employees/{employeeId}/severance/calculate")
    fun calculate(
        @PathVariable employeeId: UUID,
        @RequestBody req: SeveranceRequest
    ): ApiResponse<SeveranceResponse> =
        ApiResponse.ok(severanceService.calculate(employeeId, req), "퇴직금이 계산되었습니다.")

    @GetMapping("/api/employees/{employeeId}/severance")
    fun getHistory(@PathVariable employeeId: UUID): ApiResponse<List<SeveranceResponse>> =
        ApiResponse.ok(severanceService.getHistory(employeeId))

    @PostMapping("/api/severance/{severanceId}/confirm")
    fun confirm(@PathVariable severanceId: UUID): ApiResponse<SeveranceResponse> =
        ApiResponse.ok(severanceService.confirm(severanceId), "퇴직금이 확정되었습니다.")
}
