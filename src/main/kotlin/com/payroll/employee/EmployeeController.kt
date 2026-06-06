package com.payroll.employee

import com.payroll.common.ApiResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/companies/{companyId}/employees")
class EmployeeController(private val employeeService: EmployeeService) {

    @GetMapping
    fun getAll(@PathVariable companyId: UUID): ApiResponse<List<EmployeeResponse>> =
        ApiResponse.ok(employeeService.getByCompany(companyId))

    @GetMapping("/{employeeId}")
    fun getById(
        @PathVariable companyId: UUID,
        @PathVariable employeeId: UUID
    ): ApiResponse<EmployeeResponse> =
        ApiResponse.ok(employeeService.getById(companyId, employeeId))

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @PathVariable companyId: UUID,
        @Valid @RequestBody request: EmployeeCreateRequest
    ): ApiResponse<EmployeeResponse> =
        ApiResponse.ok(employeeService.create(companyId, request), "직원이 등록되었습니다.")

    @PutMapping("/{employeeId}")
    fun update(
        @PathVariable companyId: UUID,
        @PathVariable employeeId: UUID,
        @Valid @RequestBody request: EmployeeUpdateRequest
    ): ApiResponse<EmployeeResponse> =
        ApiResponse.ok(employeeService.update(companyId, employeeId, request), "직원 정보가 수정되었습니다.")
}
