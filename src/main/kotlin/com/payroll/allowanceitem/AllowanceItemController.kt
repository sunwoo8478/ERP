package com.payroll.allowanceitem

import com.payroll.common.ApiResponse
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/companies/{companyId}/allowance-items")
class AllowanceItemController(
    private val allowanceItemService: AllowanceItemService
) {

    @GetMapping
    fun getByCompany(
        @PathVariable companyId: UUID
    ): ApiResponse<List<AllowanceItemResponse>> {
        return ApiResponse.ok(allowanceItemService.getByCompany(companyId))
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @PathVariable companyId: UUID,
        @RequestBody request: AllowanceItemCreateRequest
    ): ApiResponse<AllowanceItemResponse> {
        return ApiResponse.ok(allowanceItemService.create(companyId, request))
    }

    @PutMapping("/{itemId}")
    fun update(
        @PathVariable companyId: UUID,
        @PathVariable itemId: UUID,
        @RequestBody request: AllowanceItemUpdateRequest
    ): ApiResponse<AllowanceItemResponse> {
        return ApiResponse.ok(allowanceItemService.update(companyId, itemId, request))
    }

    @DeleteMapping("/{itemId}")
    fun delete(
        @PathVariable companyId: UUID,
        @PathVariable itemId: UUID
    ): ApiResponse<Unit> {
        allowanceItemService.delete(companyId, itemId)
        return ApiResponse.ok(Unit, "Deleted successfully")
    }

    @PostMapping("/init-defaults")
    @ResponseStatus(HttpStatus.CREATED)
    fun initDefaults(
        @PathVariable companyId: UUID
    ): ApiResponse<List<AllowanceItemResponse>> {
        return ApiResponse.ok(allowanceItemService.initDefaults(companyId), "Default items initialized")
    }
}
