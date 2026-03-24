package com.payroll.email

import com.payroll.payrollitem.PayrollItemRepository
import com.payroll.payrollrun.PayrollRunRepository
import com.payroll.payrollslip.PayrollSlipRepository
import com.payroll.portal.PortalNotification
import com.payroll.portal.PortalNotificationRepository
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.MimeMessageHelper
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.util.UUID

@Service
@Transactional
class EmailService(
    private val mailSender: JavaMailSender,
    private val payrollRunRepository: PayrollRunRepository,
    private val payrollSlipRepository: PayrollSlipRepository,
    private val payrollItemRepository: PayrollItemRepository,
    private val portalNotificationRepository: PortalNotificationRepository
) {
    fun sendBatch(companyId: UUID, runId: UUID): Map<String, Int> {
        val run = payrollRunRepository.findById(runId)
            .orElseThrow { NoSuchElementException("급여실행 없음") }
        if (run.company.companyId != companyId) throw IllegalArgumentException("접근 권한 없음")
        if (run.status !in listOf("APPROVED", "PAID"))
            throw IllegalArgumentException("승인 또는 지급 완료 상태에서만 발송할 수 있습니다.")

        val slips = payrollSlipRepository.findByPayrollRun(run)
        var sent = 0; var skipped = 0; var failed = 0

        slips.forEach { slip ->
            val email = slip.employee.email
            if (email.isNullOrBlank()) { skipped++; return@forEach }
            try {
                val items = payrollItemRepository.findByPayrollSlip(slip)
                val html  = buildHtml(
                    empName       = slip.employee.fullName,
                    companyName   = slip.employee.company.companyName,
                    year          = run.payrollYear,
                    month         = run.payrollMonth,
                    payDate       = run.payDate.toString(),
                    gross         = slip.grossAmount,
                    deduction     = slip.deductionAmount,
                    net           = slip.netAmount,
                    earnings      = items.filter { it.itemType == "EARNING"   }.map { it.itemName to it.amount },
                    deductions    = items.filter { it.itemType == "DEDUCTION" }.map { it.itemName to it.amount }
                )
                val msg = mailSender.createMimeMessage()
                val h   = MimeMessageHelper(msg, true, "UTF-8")
                h.setTo(email)
                h.setSubject("[${slip.employee.company.companyName}] ${run.payrollYear}년 ${run.payrollMonth}월 급여명세서")
                h.setText(html, true)
                mailSender.send(msg)
                slip.deliveryStatus = "SENT"
                // 포털 알림 생성
                portalNotificationRepository.save(PortalNotification(
                    employee    = slip.employee,
                    payrollSlip = slip,
                    title       = "${run.payrollYear}년 ${run.payrollMonth}월 급여명세서가 이메일로 발송되었습니다.",
                    body        = "실수령액: ${String.format("%,d", slip.netAmount.toLong())}원"
                ))
                sent++
            } catch (e: Exception) {
                slip.deliveryStatus = "FAILED"
                failed++
            }
        }
        return mapOf("sent" to sent, "skipped" to skipped, "failed" to failed)
    }

    private fun fmt(n: BigDecimal) = String.format("%,d원", n.toLong())

    private fun buildHtml(
        empName: String, companyName: String,
        year: Int, month: Int, payDate: String,
        gross: BigDecimal, deduction: BigDecimal, net: BigDecimal,
        earnings: List<Pair<String, BigDecimal>>,
        deductions: List<Pair<String, BigDecimal>>
    ): String {
        val earnRows = earnings.joinToString("") { (name, amt) ->
            "<tr><td style='padding:6px 12px;color:#555;font-size:13px'>$name</td>" +
            "<td style='padding:6px 12px;text-align:right;font-size:13px'>${fmt(amt)}</td></tr>"
        }
        val deductRows = deductions.joinToString("") { (name, amt) ->
            "<tr><td style='padding:6px 12px;color:#555;font-size:13px'>$name</td>" +
            "<td style='padding:6px 12px;text-align:right;font-size:13px;color:#e74c3c'>-${fmt(amt)}</td></tr>"
        }
        return """<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,'Apple SD Gothic Neo',sans-serif;background:#f0f4ff;padding:24px;margin:0">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.12)">
    <div style="background:linear-gradient(135deg,#1a73e8,#0d47a1);padding:32px 28px;color:#fff;text-align:center">
      <div style="font-size:13px;opacity:.8;margin-bottom:6px">$companyName</div>
      <div style="font-size:24px;font-weight:800;letter-spacing:-.5px">${year}년 ${month}월 급여명세서</div>
      <div style="font-size:13px;opacity:.7;margin-top:6px">지급일: $payDate</div>
    </div>
    <div style="padding:24px;text-align:center;border-bottom:1px solid #f0f0f0">
      <div style="font-size:14px;color:#888;margin-bottom:8px">${empName}님의 실수령액</div>
      <div style="font-size:38px;font-weight:800;color:#00b386;letter-spacing:-1px">${fmt(net)}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;padding:16px 8px">
      <div style="padding:8px">
        <div style="font-weight:700;padding:6px 12px;background:#f0f7ff;border-radius:8px;margin-bottom:6px;font-size:13px">💰 지급 항목</div>
        <table style="width:100%;border-collapse:collapse">
          $earnRows
          <tr style="border-top:2px solid #e8eeff;font-weight:700">
            <td style="padding:8px 12px;font-size:13px">합계</td>
            <td style="padding:8px 12px;text-align:right;font-size:13px">${fmt(gross)}</td>
          </tr>
        </table>
      </div>
      <div style="padding:8px;border-left:1px solid #f0f0f0">
        <div style="font-weight:700;padding:6px 12px;background:#fff5f5;border-radius:8px;margin-bottom:6px;font-size:13px;color:#e74c3c">📉 공제 항목</div>
        <table style="width:100%;border-collapse:collapse">
          $deductRows
          <tr style="border-top:2px solid #ffe8e8;font-weight:700;color:#e74c3c">
            <td style="padding:8px 12px;font-size:13px">합계</td>
            <td style="padding:8px 12px;text-align:right;font-size:13px">-${fmt(deduction)}</td>
          </tr>
        </table>
      </div>
    </div>
    <div style="background:#f8f9fa;padding:16px 24px;text-align:center;font-size:12px;color:#aaa">
      본 메일은 자동 발송되었습니다 · 페이핏 급여관리 시스템<br>
      <a href="http://localhost:18080/portal/" style="color:#1a73e8">급여포털에서 상세 확인하기 →</a>
    </div>
  </div>
</body></html>"""
    }
}
