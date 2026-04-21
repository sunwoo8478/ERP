package com.payroll.attendance

import com.payroll.common.ApiResponse
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
class LeaveRequestController(
    private val leaveRequestService: LeaveRequestService
) {

    @GetMapping("/api/companies/{companyId}/leave-requests")
    fun getLeaveRequestsByCompany(
        @PathVariable companyId: UUID,
        @RequestParam(required = false) year: Int?,
        @RequestParam(required = false) month: Int?,
        @RequestParam(required = false) employeeId: UUID?
    ): ApiResponse<List<LeaveRequestResponse>> =
        ApiResponse.ok(leaveRequestService.getLeaveRequestsByCompany(companyId, year, month, employeeId))

    @GetMapping("/api/employees/{employeeId}/leave-requests")
    fun getLeaveRequestsByEmployee(
        @PathVariable employeeId: UUID
    ): ApiResponse<List<LeaveRequestResponse>> =
        ApiResponse.ok(leaveRequestService.getLeaveRequestsByEmployee(employeeId))

    @PostMapping("/api/employees/{employeeId}/leave-requests")
    @ResponseStatus(HttpStatus.CREATED)
    fun createLeaveRequest(
        @PathVariable employeeId: UUID,
        @RequestBody request: LeaveRequestCreateRequest
    ): ApiResponse<LeaveRequestResponse> =
        ApiResponse.ok(leaveRequestService.createLeaveRequest(employeeId, request))

    @PostMapping("/api/leave-requests/{id}/approve")
    fun approveLeaveRequest(
        @PathVariable id: UUID,
        @RequestBody(required = false) request: ApproveRejectRequest?
    ): ApiResponse<LeaveRequestResponse> =
        ApiResponse.ok(leaveRequestService.approveLeaveRequest(id, request ?: ApproveRejectRequest()))

    @PostMapping("/api/leave-requests/{id}/reject")
    fun rejectLeaveRequest(
        @PathVariable id: UUID,
        @RequestBody(required = false) request: ApproveRejectRequest?
    ): ApiResponse<LeaveRequestResponse> =
        ApiResponse.ok(leaveRequestService.rejectLeaveRequest(id, request ?: ApproveRejectRequest()))
}
