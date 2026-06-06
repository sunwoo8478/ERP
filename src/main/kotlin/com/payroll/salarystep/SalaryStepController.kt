package com.payroll.salarystep

import com.payroll.common.ApiResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/job-grades/{jobGradeId}/salary-steps")
class SalaryStepController(private val salaryStepService: SalaryStepService) {

    @GetMapping
    fun getAll(@PathVariable jobGradeId: UUID): ApiResponse<List<SalaryStepResponse>> =
        ApiResponse.ok(salaryStepService.getByJobGrade(jobGradeId))

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @PathVariable jobGradeId: UUID,
        @Valid @RequestBody request: SalaryStepCreateRequest
    ): ApiResponse<SalaryStepResponse> =
        ApiResponse.ok(salaryStepService.create(jobGradeId, request), "호봉기준이 등록되었습니다.")

    @PutMapping("/{salaryStepId}")
    fun update(
        @PathVariable jobGradeId: UUID,
        @PathVariable salaryStepId: UUID,
        @Valid @RequestBody request: SalaryStepUpdateRequest
    ): ApiResponse<SalaryStepResponse> =
        ApiResponse.ok(salaryStepService.update(salaryStepId, request), "호봉기준이 수정되었습니다.")

    @DeleteMapping("/{salaryStepId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@PathVariable jobGradeId: UUID, @PathVariable salaryStepId: UUID) =
        salaryStepService.delete(salaryStepId)
}
