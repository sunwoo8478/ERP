package com.payroll.attendance

import com.payroll.common.ApiResponse
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
class OvertimeController(
    private val overtimeService: OvertimeService
) {

    @GetMapping("/api/companies/{companyId}/overtime")
    fun getOvertimeByCompany(
        @PathVariable companyId: UUID,
        @RequestParam(required = false) year: Int?,
        @RequestParam(required = false) month: Int?
    ): ApiResponse<List<OvertimeResponse>> =
        ApiResponse.ok(overtimeService.getOvertimeByCompany(companyId, year, month))

    @GetMapping("/api/employees/{employeeId}/overtime")
    fun getOvertimeByEmployee(
        @PathVariable employeeId: UUID
    ): ApiResponse<List<OvertimeResponse>> =
        ApiResponse.ok(overtimeService.getOvertimeByEmployee(employeeId))

    @PostMapping("/api/employees/{employeeId}/overtime")
    @ResponseStatus(HttpStatus.CREATED)
    fun createOvertime(
        @PathVariable employeeId: UUID,
        @RequestBody request: OvertimeCreateRequest
    ): ApiResponse<OvertimeResponse> =
        ApiResponse.ok(overtimeService.createOvertime(employeeId, request))

    @PostMapping("/api/overtime/{id}/approve")
    fun approveOvertime(
        @PathVariable id: UUID
    ): ApiResponse<OvertimeResponse> =
        ApiResponse.ok(overtimeService.approveOvertime(id))
}
