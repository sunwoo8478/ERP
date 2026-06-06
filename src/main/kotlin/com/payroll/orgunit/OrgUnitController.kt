package com.payroll.orgunit

import com.payroll.common.ApiResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/companies/{companyId}/org-units")
class OrgUnitController(private val orgUnitService: OrgUnitService) {

    @GetMapping
    fun getAll(@PathVariable companyId: UUID): ApiResponse<List<OrgUnitResponse>> =
        ApiResponse.ok(orgUnitService.getByCompany(companyId))

    @GetMapping("/{orgUnitId}")
    fun getById(
        @PathVariable companyId: UUID,
        @PathVariable orgUnitId: UUID
    ): ApiResponse<OrgUnitResponse> =
        ApiResponse.ok(orgUnitService.getById(companyId, orgUnitId))

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @PathVariable companyId: UUID,
        @Valid @RequestBody request: OrgUnitCreateRequest
    ): ApiResponse<OrgUnitResponse> =
        ApiResponse.ok(orgUnitService.create(companyId, request), "조직단위가 등록되었습니다.")

    @PutMapping("/{orgUnitId}")
    fun update(
        @PathVariable companyId: UUID,
        @PathVariable orgUnitId: UUID,
        @Valid @RequestBody request: OrgUnitUpdateRequest
    ): ApiResponse<OrgUnitResponse> =
        ApiResponse.ok(orgUnitService.update(companyId, orgUnitId, request), "조직단위가 수정되었습니다.")

    @DeleteMapping("/{orgUnitId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@PathVariable companyId: UUID, @PathVariable orgUnitId: UUID) =
        orgUnitService.delete(companyId, orgUnitId)
}
