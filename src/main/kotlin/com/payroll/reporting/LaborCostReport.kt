package com.payroll.reporting

import com.payroll.common.ApiResponse
import com.payroll.company.CompanyRepository
import com.payroll.payrollrun.PayrollRunRepository
import com.payroll.payrollslip.PayrollSlipRepository
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Service
import org.springframework.web.bind.annotation.*
import java.math.BigDecimal
import java.math.RoundingMode
import java.util.UUID

// ──────────────────────────────────────────────
// DTOs
// ──────────────────────────────────────────────

data class LaborCostSummary(
    val grossTotal: BigDecimal,
    val netTotal: BigDecimal,
    val deductionTotal: BigDecimal,
    val employeeCount: Int,
    val avgGross: BigDecimal,
    val avgNet: BigDecimal
)

data class LaborCostByDept(
    val deptName: String,
    val employeeCount: Int,
    val grossTotal: BigDecimal,
    val netTotal: BigDecimal,
    /** 전체 대비 비율 (%) */
    val pct: BigDecimal
)

data class LaborCostTrendItem(
    val month: Int,
    val grossTotal: BigDecimal,
    val netTotal: BigDecimal,
    val employeeCount: Int
)

data class LaborCostTrend(
    val year: Int,
    val items: List<LaborCostTrendItem>
)

// ──────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────

@Service
class LaborCostReportService(
    private val companyRepository: CompanyRepository,
    private val payrollRunRepository: PayrollRunRepository,
    private val payrollSlipRepository: PayrollSlipRepository
) {
    /** 월별 인건비 요약 */
    fun getMonthlySummary(companyId: UUID, year: Int, month: Int): LaborCostSummary {
        val company = companyRepository.findById(companyId)
            .orElseThrow { NoSuchElementException("회사를 찾을 수 없습니다: $companyId") }

        val slips = payrollRunRepository
            .findByCompanyOrderByPayrollYearDescPayrollMonthDesc(company)
            .filter { it.payrollYear == year && it.payrollMonth == month && it.status == "PAID" }
            .flatMap { payrollSlipRepository.findByPayrollRun(it) }

        return buildSummary(slips)
    }

    /** 부서별 인건비 */
    fun getByDept(companyId: UUID, year: Int, month: Int): List<LaborCostByDept> {
        val company = companyRepository.findById(companyId)
            .orElseThrow { NoSuchElementException("회사를 찾을 수 없습니다: $companyId") }

        val slips = payrollRunRepository
            .findByCompanyOrderByPayrollYearDescPayrollMonthDesc(company)
            .filter { it.payrollYear == year && it.payrollMonth == month && it.status == "PAID" }
            .flatMap { payrollSlipRepository.findByPayrollRun(it) }

        val grandGross = slips.fold(BigDecimal.ZERO) { a, s -> a + s.grossAmount }

        data class DeptAcc(
            val deptName: String,
            var count: Int = 0,
            var grossTotal: BigDecimal = BigDecimal.ZERO,
            var netTotal: BigDecimal = BigDecimal.ZERO
        )

        val map = LinkedHashMap<String, DeptAcc>()
        for (slip in slips) {
            val dept = slip.employee.orgUnit.orgUnitName
            val acc = map.getOrPut(dept) { DeptAcc(deptName = dept) }
            acc.count++
            acc.grossTotal += slip.grossAmount
            acc.netTotal += slip.netAmount
        }

        return map.values.map { acc ->
            val pct = if (grandGross.compareTo(BigDecimal.ZERO) == 0) BigDecimal.ZERO
            else acc.grossTotal.divide(grandGross, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal("100"))
                .setScale(2, RoundingMode.HALF_UP)

            LaborCostByDept(
                deptName = acc.deptName,
                employeeCount = acc.count,
                grossTotal = acc.grossTotal,
                netTotal = acc.netTotal,
                pct = pct
            )
        }.sortedByDescending { it.grossTotal }
    }

    /** 연간 월별 추이 */
    fun getAnnualTrend(companyId: UUID, year: Int): LaborCostTrend {
        val company = companyRepository.findById(companyId)
            .orElseThrow { NoSuchElementException("회사를 찾을 수 없습니다: $companyId") }

        val allRuns = payrollRunRepository
            .findByCompanyOrderByPayrollYearDescPayrollMonthDesc(company)
            .filter { it.payrollYear == year && it.status == "PAID" }

        val items = (1..12).map { m ->
            val slips = allRuns
                .filter { it.payrollMonth == m }
                .flatMap { payrollSlipRepository.findByPayrollRun(it) }

            LaborCostTrendItem(
                month = m,
                grossTotal = slips.fold(BigDecimal.ZERO) { a, s -> a + s.grossAmount },
                netTotal = slips.fold(BigDecimal.ZERO) { a, s -> a + s.netAmount },
                employeeCount = slips.size
            )
        }

        return LaborCostTrend(year = year, items = items)
    }

    // ── helpers ──

    private fun buildSummary(slips: List<com.payroll.payrollslip.PayrollSlip>): LaborCostSummary {
        val grossTotal = slips.fold(BigDecimal.ZERO) { a, s -> a + s.grossAmount }
        val netTotal = slips.fold(BigDecimal.ZERO) { a, s -> a + s.netAmount }
        val deductionTotal = slips.fold(BigDecimal.ZERO) { a, s -> a + s.deductionAmount }
        val count = slips.size

        val avgGross = if (count == 0) BigDecimal.ZERO
        else grossTotal.divide(BigDecimal(count), 2, RoundingMode.HALF_UP)

        val avgNet = if (count == 0) BigDecimal.ZERO
        else netTotal.divide(BigDecimal(count), 2, RoundingMode.HALF_UP)

        return LaborCostSummary(
            grossTotal = grossTotal,
            netTotal = netTotal,
            deductionTotal = deductionTotal,
            employeeCount = count,
            avgGross = avgGross,
            avgNet = avgNet
        )
    }
}

// ──────────────────────────────────────────────
// Controller
// ──────────────────────────────────────────────

@RestController
@RequestMapping("/api/companies/{companyId}/reports/labor-cost")
class LaborCostReportController(
    private val service: LaborCostReportService
) {
    /** GET /api/companies/{companyId}/reports/labor-cost?year=&month= */
    @GetMapping
    fun getMonthlySummary(
        @PathVariable companyId: UUID,
        @RequestParam year: Int,
        @RequestParam month: Int
    ): ResponseEntity<ApiResponse<LaborCostSummary>> {
        val result = service.getMonthlySummary(companyId, year, month)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }

    /** GET /api/companies/{companyId}/reports/labor-cost/by-dept?year=&month= */
    @GetMapping("/by-dept")
    fun getByDept(
        @PathVariable companyId: UUID,
        @RequestParam year: Int,
        @RequestParam month: Int
    ): ResponseEntity<ApiResponse<List<LaborCostByDept>>> {
        val result = service.getByDept(companyId, year, month)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }

    /** GET /api/companies/{companyId}/reports/labor-cost/trend?year= */
    @GetMapping("/trend")
    fun getAnnualTrend(
        @PathVariable companyId: UUID,
        @RequestParam year: Int
    ): ResponseEntity<ApiResponse<LaborCostTrend>> {
        val result = service.getAnnualTrend(companyId, year)
        return ResponseEntity.ok(ApiResponse.ok(result))
    }
}
