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
import java.util.UUID

// ──────────────────────────────────────────────
// DTOs
// ──────────────────────────────────────────────

data class YearEndRow(
    val employeeNo: String,
    val fullName: String,
    val annualGross: BigDecimal,
    val annualTaxable: BigDecimal,
    val annualIncomeTax: BigDecimal,
    val annualLocalTax: BigDecimal
)

data class YearEndResponse(
    val year: Int,
    val employeeCount: Int,
    val totalAnnualGross: BigDecimal,
    val totalAnnualTaxable: BigDecimal,
    val totalAnnualTax: BigDecimal,
    val rows: List<YearEndRow>,
    val note: String = "※ 실제 연말정산은 소득공제/세액공제 적용 후 확정세액 기준입니다."
)

// ──────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────

@Service
class YearEndSettlementService(
    private val companyRepository: CompanyRepository,
    private val payrollRunRepository: PayrollRunRepository,
    private val payrollSlipRepository: PayrollSlipRepository,
    private val payrollItemRepository: PayrollItemRepository
) {
    fun getReport(companyId: UUID, year: Int): YearEndResponse {
        val company = companyRepository.findById(companyId)
            .orElseThrow { NoSuchElementException("회사를 찾을 수 없습니다: $companyId") }

        // 해당 연도 1~12월 PAID payroll_run
        val runs = payrollRunRepository
            .findByCompanyOrderByPayrollYearDescPayrollMonthDesc(company)
            .filter { it.payrollYear == year && it.status == "PAID" }

        // employeeNo → 누적 집계
        data class EmployeeAccumulator(
            val employeeNo: String,
            val fullName: String,
            var annualGross: BigDecimal = BigDecimal.ZERO,
            var annualTaxable: BigDecimal = BigDecimal.ZERO,
            var annualIncomeTax: BigDecimal = BigDecimal.ZERO,
            var annualLocalTax: BigDecimal = BigDecimal.ZERO
        )

        val accMap = LinkedHashMap<String, EmployeeAccumulator>()

        for (run in runs) {
            val slips = payrollSlipRepository.findByPayrollRun(run)
            for (slip in slips) {
                val empNo = slip.employee.employeeNo
                val acc = accMap.getOrPut(empNo) {
                    EmployeeAccumulator(employeeNo = empNo, fullName = slip.employee.fullName)
                }

                val items = payrollItemRepository.findByPayrollSlip(slip)

                val incomeTax = items
                    .filter { it.itemType == "DEDUCTION" && (it.itemName.contains("갑근세") || it.itemName.contains("소득세")) }
                    .fold(BigDecimal.ZERO) { a, i -> a + i.amount }

                val localTax = items
                    .filter { it.itemType == "DEDUCTION" && it.itemName.contains("지방소득세") }
                    .fold(BigDecimal.ZERO) { a, i -> a + i.amount }

                acc.annualGross += slip.grossAmount
                acc.annualTaxable += slip.taxableIncome
                acc.annualIncomeTax += incomeTax
                acc.annualLocalTax += localTax
            }
        }

        val rows = accMap.values.map {
            YearEndRow(
                employeeNo = it.employeeNo,
                fullName = it.fullName,
                annualGross = it.annualGross,
                annualTaxable = it.annualTaxable,
                annualIncomeTax = it.annualIncomeTax,
                annualLocalTax = it.annualLocalTax
            )
        }

        val totalAnnualGross = rows.fold(BigDecimal.ZERO) { a, r -> a + r.annualGross }
        val totalAnnualTaxable = rows.fold(BigDecimal.ZERO) { a, r -> a + r.annualTaxable }
        val totalAnnualTax = rows.fold(BigDecimal.ZERO) { a, r -> a + r.annualIncomeTax + r.annualLocalTax }

        return YearEndResponse(
            year = year,
            employeeCount = rows.size,
            totalAnnualGross = totalAnnualGross,
            totalAnnualTaxable = totalAnnualTaxable,
            totalAnnualTax = totalAnnualTax,
            rows = rows
        )
    }
}

// ──────────────────────────────────────────────
// Controller
// ──────────────────────────────────────────────

@RestController
@RequestMapping("/api/companies/{companyId}/reports")
class YearEndSettlementController(
    private val service: YearEndSettlementService
) {
    @GetMapping("/year-end")
    fun getYearEndReport(
        @PathVariable companyId: UUID,
        @RequestParam year: Int
    ): ResponseEntity<ApiResponse<YearEndResponse>> {
        val result = service.getReport(companyId, year)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }
}
