package com.payroll.attendance

import com.payroll.common.ApiResponse
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
class LeaveBalanceController(private val leaveBalanceService: LeaveBalanceService) {

    @GetMapping("/api/employees/{employeeId}/leave-balance")
    fun getBalance(
        @PathVariable employeeId: UUID,
        @RequestParam year: Int
    ): ApiResponse<List<LeaveBalanceResponse>> =
        ApiResponse.ok(leaveBalanceService.getBalance(employeeId, year))

    @PostMapping("/api/companies/{companyId}/leave-balance/init")
    fun initBalance(
        @PathVariable companyId: UUID,
        @RequestParam year: Int
    ): ApiResponse<Map<String, Int>> {
        val count = leaveBalanceService.initBalance(companyId, year)
        return ApiResponse.ok(mapOf("initialized" to count), "${count}명의 연차가 초기화되었습니다.")
    }
}
