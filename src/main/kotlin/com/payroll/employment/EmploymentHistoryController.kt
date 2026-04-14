package com.payroll.employment

import com.payroll.common.ApiResponse
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
class EmploymentHistoryController(private val employmentHistoryService: EmploymentHistoryService) {

    @GetMapping("/api/employees/{employeeId}/employment-history")
    fun getByEmployee(@PathVariable employeeId: UUID): ApiResponse<List<EmploymentHistoryResponse>> =
        ApiResponse.ok(employmentHistoryService.getByEmployee(employeeId))

    @GetMapping("/api/companies/{companyId}/employment-history")
    fun getByCompany(@PathVariable companyId: UUID): ApiResponse<List<EmploymentHistoryResponse>> =
        ApiResponse.ok(employmentHistoryService.getByCompany(companyId))

    @PostMapping("/api/employees/{employeeId}/employment-history")
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @PathVariable employeeId: UUID,
        @RequestBody request: EmploymentHistoryCreateRequest
    ): ApiResponse<EmploymentHistoryResponse> {
        val effectiveRequest = if (request.employeeId != employeeId) {
            request.copy(employeeId = employeeId)
        } else {
            request
        }
        return ApiResponse.ok(employmentHistoryService.create(effectiveRequest), "인사이력이 등록되었습니다.")
    }
}
