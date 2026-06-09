package com.payroll.portal

import com.payroll.common.ApiResponse
import org.springframework.web.bind.annotation.CrossOrigin
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/portal")
@CrossOrigin(origins = ["*"])
class PortalController(private val portalService: PortalService) {

    @PostMapping("/login")
    fun login(@RequestBody req: PortalLoginRequest): ApiResponse<PortalEmployeeInfo> {
        return ApiResponse.ok(portalService.login(req))
    }

    @GetMapping("/{eid}/slips")
    fun slips(@PathVariable eid: UUID): ApiResponse<List<PortalSlipSummary>> {
        return ApiResponse.ok(portalService.getSlips(eid))
    }

    @GetMapping("/{eid}/slips/{sid}")
    fun slipDetail(@PathVariable eid: UUID, @PathVariable sid: UUID): ApiResponse<PortalSlipDetail> {
        return ApiResponse.ok(portalService.getSlipDetail(eid, sid))
    }

    @GetMapping("/{eid}/notifications")
    fun notifs(@PathVariable eid: UUID): ApiResponse<List<NotificationDto>> {
        return ApiResponse.ok(portalService.getNotifications(eid))
    }

    @PostMapping("/{eid}/notifications/read-all")
    fun readAll(@PathVariable eid: UUID): ApiResponse<Unit> {
        portalService.markAllRead(eid)
        return ApiResponse.ok(Unit)
    }

    @GetMapping("/{eid}/unread-count")
    fun unread(@PathVariable eid: UUID): ApiResponse<Map<String, Long>> {
        val count = portalService.getUnreadCount(eid)
        return ApiResponse.ok(mapOf("count" to count))
    }

    @GetMapping("/{eid}/bank-account")
    fun bankAccount(@PathVariable eid: UUID): ApiResponse<BankAccountInfo> =
        ApiResponse.ok(portalService.getBankAccount(eid))
}
