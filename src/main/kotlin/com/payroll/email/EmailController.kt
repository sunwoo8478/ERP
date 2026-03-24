package com.payroll.email

import com.payroll.common.ApiResponse
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/companies/{companyId}/payroll-runs/{runId}")
class EmailController(private val emailService: EmailService) {

    @PostMapping("/send-email")
    fun sendEmail(
        @PathVariable companyId: UUID,
        @PathVariable runId: UUID
    ): ApiResponse<Map<String, Int>> {
        val result = emailService.sendBatch(companyId, runId)
        val sent    = result["sent"] ?: 0
        val skipped = result["skipped"] ?: 0
        val failed  = result["failed"] ?: 0
        return ApiResponse.ok(result,
            "발송 완료: ${sent}명 성공, ${skipped}명 이메일 미등록, ${failed}명 실패")
    }
}
