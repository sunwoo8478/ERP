package com.payroll.jobgrade

import com.payroll.common.ApiResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/companies/{companyId}/job-grades")
class JobGradeController(private val jobGradeService: JobGradeService) {

    @GetMapping
    fun getAll(@PathVariable companyId: UUID): ApiResponse<List<JobGradeResponse>> =
        ApiResponse.ok(jobGradeService.getByCompany(companyId))

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @PathVariable companyId: UUID,
        @Valid @RequestBody request: JobGradeCreateRequest
    ): ApiResponse<JobGradeResponse> =
        ApiResponse.ok(jobGradeService.create(companyId, request), "직급이 등록되었습니다.")

    @PutMapping("/{jobGradeId}")
    fun update(
        @PathVariable companyId: UUID,
        @PathVariable jobGradeId: UUID,
        @Valid @RequestBody request: JobGradeUpdateRequest
    ): ApiResponse<JobGradeResponse> =
        ApiResponse.ok(jobGradeService.update(companyId, jobGradeId, request), "직급이 수정되었습니다.")

    @DeleteMapping("/{jobGradeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@PathVariable companyId: UUID, @PathVariable jobGradeId: UUID) =
        jobGradeService.delete(companyId, jobGradeId)
}
