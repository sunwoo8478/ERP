package com.payroll.reporting

import com.payroll.common.ApiResponse
import com.payroll.company.CompanyRepository
import com.payroll.payrollitem.PayrollItemRepository
import com.payroll.payrollrun.PayrollRunRepository
import com.payroll.payrollslip.PayrollSlipRepository
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Service
import org.springframework.web.bind.annotation.*
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.util.UUID

// ──────────────────────────────────────────────
// DTOs
// ──────────────────────────────────────────────

data class WithholdingTaxRow(
    val employeeNo: String,
    val fullName: String,
    val taxableIncome: BigDecimal,
    val incomeTax: BigDecimal,
    val localTax: BigDecimal,
    val totalTax: BigDecimal
)

data class WithholdingTaxReportResponse(
    val companyId: UUID,
    val companyName: String,
    val bizNo: String?,
    val year: Int,
    val month: Int,
    val reportDate: LocalDate,
    val totalTaxBase: BigDecimal,
    val totalIncomeTax: BigDecimal,
    val totalLocalTax: BigDecimal,
    val totalTax: BigDecimal,
    val employeeCount: Int,
    val rows: List<WithholdingTaxRow>,
    val dueDate: String
)

// ──────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────

@Service
class WithholdingTaxReportService(
    private val companyRepository: CompanyRepository,
    private val payrollRunRepository: PayrollRunRepository,
    private val payrollSlipRepository: PayrollSlipRepository,
    private val payrollItemRepository: PayrollItemRepository
) {
    fun getReport(companyId: UUID, year: Int, month: Int): WithholdingTaxReportResponse {
        val company = companyRepository.findById(companyId)
            .orElseThrow { NoSuchElementException("회사를 찾을 수 없습니다: $companyId") }

        // 해당 연월의 PAID 상태 payroll_run 목록
        val runs = payrollRunRepository
            .findByCompanyOrderByPayrollYearDescPayrollMonthDesc(company)
            .filter { it.payrollYear == year && it.payrollMonth == month && it.status == "PAID" }

        val rows = mutableListOf<WithholdingTaxRow>()

        for (run in runs) {
            val slips = payrollSlipRepository.findByPayrollRun(run)
            for (slip in slips) {
                val items = payrollItemRepository.findByPayrollSlip(slip)

                // 갑근세 = DEDUCTION 항목 중 '갑근세' or '소득세'
                val incomeTax = items
                    .filter { it.itemType == "DEDUCTION" && (it.itemName.contains("갑근세") || it.itemName.contains("소득세")) }
                    .fold(BigDecimal.ZERO) { acc, i -> acc + i.amount }

                // 지방소득세 = DEDUCTION 항목 중 '지방소득세'
                val localTax = items
                    .filter { it.itemType == "DEDUCTION" && it.itemName.contains("지방소득세") }
                    .fold(BigDecimal.ZERO) { acc, i -> acc + i.amount }

                rows.add(
                    WithholdingTaxRow(
                        employeeNo = slip.employee.employeeNo,
                        fullName = slip.employee.fullName,
                        taxableIncome = slip.taxableIncome,
                        incomeTax = incomeTax,
                        localTax = localTax,
                        totalTax = incomeTax + localTax
                    )
                )
            }
        }

        val totalTaxBase = rows.fold(BigDecimal.ZERO) { acc, r -> acc + r.taxableIncome }
        val totalIncomeTax = rows.fold(BigDecimal.ZERO) { acc, r -> acc + r.incomeTax }
        val totalLocalTax = rows.fold(BigDecimal.ZERO) { acc, r -> acc + r.localTax }

        // 신고납부기한: 다음달 10일
        val dueMonth = if (month == 12) 1 else month + 1
        val dueYear = if (month == 12) year + 1 else year
        val dueDate = "%d년 %d월 10일".format(dueYear, dueMonth)

        return WithholdingTaxReportResponse(
            companyId = company.companyId,
            companyName = company.companyName,
            bizNo = company.bizNo,
            year = year,
            month = month,
            reportDate = LocalDate.now(),
            totalTaxBase = totalTaxBase,
            totalIncomeTax = totalIncomeTax,
            totalLocalTax = totalLocalTax,
            totalTax = totalIncomeTax + totalLocalTax,
            employeeCount = rows.size,
            rows = rows,
            dueDate = dueDate
        )
    }
}

// ──────────────────────────────────────────────
// Controller
// ──────────────────────────────────────────────

@RestController
@RequestMapping("/api/companies/{companyId}/reports")
class WithholdingTaxReportController(
    private val service: WithholdingTaxReportService
) {
    @GetMapping("/withholding-tax")
    fun getWithholdingTaxReport(
        @PathVariable companyId: UUID,
        @RequestParam year: Int,
        @RequestParam month: Int
    ): ResponseEntity<ApiResponse<WithholdingTaxReportResponse>> {
        val result = service.getReport(companyId, year, month)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }
}
