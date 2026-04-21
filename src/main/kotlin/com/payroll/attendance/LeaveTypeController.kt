package com.payroll.attendance

import com.payroll.common.ApiResponse
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
class LeaveTypeController(
    private val leaveTypeService: LeaveTypeService
) {

    @GetMapping("/api/companies/{companyId}/leave-types")
    fun getLeaveTypes(@PathVariable companyId: UUID): ApiResponse<List<LeaveTypeResponse>> =
        ApiResponse.ok(leaveTypeService.getLeaveTypes(companyId))

    @GetMapping("/api/companies/{companyId}/leave-types/{leaveTypeId}")
    fun getLeaveType(
        @PathVariable companyId: UUID,
        @PathVariable leaveTypeId: UUID
    ): ApiResponse<LeaveTypeResponse> =
        ApiResponse.ok(leaveTypeService.getLeaveType(leaveTypeId))

    @PostMapping("/api/companies/{companyId}/leave-types")
    @ResponseStatus(HttpStatus.CREATED)
    fun createLeaveType(
        @PathVariable companyId: UUID,
        @RequestBody request: LeaveTypeCreateRequest
    ): ApiResponse<LeaveTypeResponse> =
        ApiResponse.ok(leaveTypeService.createLeaveType(companyId, request))

    @PutMapping("/api/companies/{companyId}/leave-types/{leaveTypeId}")
    fun updateLeaveType(
        @PathVariable companyId: UUID,
        @PathVariable leaveTypeId: UUID,
        @RequestBody request: LeaveTypeUpdateRequest
    ): ApiResponse<LeaveTypeResponse> =
        ApiResponse.ok(leaveTypeService.updateLeaveType(leaveTypeId, request))

    @DeleteMapping("/api/companies/{companyId}/leave-types/{leaveTypeId}")
    fun deleteLeaveType(
        @PathVariable companyId: UUID,
        @PathVariable leaveTypeId: UUID
    ): ApiResponse<Unit> {
        leaveTypeService.deleteLeaveType(leaveTypeId)
        return ApiResponse.ok(Unit, "삭제되었습니다.")
    }
}
