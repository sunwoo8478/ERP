package com.payroll.severance

import com.payroll.employee.EmployeeRepository
import com.payroll.payrollslip.PayrollSlipRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.util.UUID

@Service
@Transactional(readOnly = true)
class SeveranceService(
    private val severanceRepository: SeveranceRepository,
    private val employeeRepository: EmployeeRepository,
    private val payrollSlipRepository: PayrollSlipRepository
) {
    @Transactional
    fun calculate(employeeId: UUID, req: SeveranceRequest): SeveranceResponse {
        val emp = employeeRepository.findById(employeeId)
            .orElseThrow { NoSuchElementException("직원을 찾을 수 없습니다.") }

        val calcDate  = req.calculationDate
        if (calcDate.isAfter(LocalDate.now()))
            throw IllegalArgumentException("퇴직금 계산일(${calcDate})은 오늘 이후 날짜로 설정할 수 없습니다.")
        if (calcDate.isBefore(emp.hireDate))
            throw IllegalArgumentException("계산일(${calcDate})이 입사일(${emp.hireDate})보다 이전입니다.")

        // 이미 확정된 퇴직금이 있으면 재계산 차단
        val confirmed = severanceRepository
            .findByEmployee_EmployeeIdOrderByCalculationDateDesc(employeeId)
            .firstOrNull { it.status == "CONFIRMED" }
        if (confirmed != null)
            throw IllegalArgumentException("이미 확정된 퇴직금(${confirmed.calculationDate}, ${confirmed.severanceAmount}원)이 있습니다.")
        val tenureDays = ChronoUnit.DAYS.between(emp.hireDate, calcDate).toInt()
        val tenureYears = tenureDays / 365.0

        if (tenureDays < 365)
            throw IllegalArgumentException("재직기간이 1년 미만(${tenureDays}일)으로 퇴직금이 발생하지 않습니다.")

        // 퇴직 전 3개월 PAID 슬립에서 평균임금 계산
        val recentSlips = payrollSlipRepository.findByEmployee(emp)
            .filter { it.payrollRun.status == "PAID" }
            .sortedByDescending { it.payrollRun.payDate }
            .take(3)

        val avgDailyWage = if (recentSlips.isNotEmpty()) {
            val totalGross = recentSlips.fold(BigDecimal.ZERO) { acc, s -> acc.add(s.grossAmount) }
            val months     = recentSlips.size
            // 3개월 평균월급 / 30일 = 평균임금
            totalGross.divide(BigDecimal(months), 2, RoundingMode.HALF_UP)
                      .divide(BigDecimal("30"), 2, RoundingMode.HALF_UP)
        } else {
            // 슬립 없으면 현재 기본급 기준 추정
            BigDecimal("0")
        }

        // 퇴직금 = 평균임금 × 30 × (재직일수 / 365)
        val severanceAmount = avgDailyWage
            .multiply(BigDecimal("30"))
            .multiply(BigDecimal(tenureDays))
            .divide(BigDecimal("365"), 0, RoundingMode.FLOOR)

        val calc = SeveranceCalculation(
            employee        = emp,
            calculationDate = calcDate,
            tenureDays      = tenureDays,
            avgDailyWage    = avgDailyWage,
            severanceAmount = severanceAmount,
            note            = req.note
        )
        severanceRepository.save(calc)
        return toResponse(calc)
    }

    fun getHistory(employeeId: UUID): List<SeveranceResponse> =
        severanceRepository.findByEmployee_EmployeeIdOrderByCalculationDateDesc(employeeId)
            .map { toResponse(it) }

    @Transactional
    fun confirm(severanceId: UUID): SeveranceResponse {
        val calc = severanceRepository.findById(severanceId)
            .orElseThrow { NoSuchElementException("퇴직금 계산을 찾을 수 없습니다.") }
        if (calc.status != "DRAFT") throw IllegalArgumentException("초안 상태에서만 확정할 수 있습니다.")
        calc.status = "CONFIRMED"
        return toResponse(calc)
    }

    private fun toResponse(c: SeveranceCalculation) = SeveranceResponse(
        severanceId     = c.severanceId,
        employeeId      = c.employee.employeeId,
        employeeNo      = c.employee.employeeNo,
        fullName        = c.employee.fullName,
        hireDate        = c.employee.hireDate,
        calculationDate = c.calculationDate,
        tenureDays      = c.tenureDays,
        tenureYears     = Math.round(c.tenureDays / 365.0 * 10) / 10.0,
        avgDailyWage    = c.avgDailyWage,
        severanceAmount = c.severanceAmount,
        status          = c.status,
        note            = c.note
    )
}
