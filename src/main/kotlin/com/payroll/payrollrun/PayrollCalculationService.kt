package com.payroll.payrollrun

import com.payroll.attendance.OvertimeRepository
import com.payroll.attendance.LeaveRequestRepository
import com.payroll.employee.Employee
import com.payroll.insurancerate.InsuranceRateRepository
import com.payroll.payrollconfig.PayrollConfigService
import com.payroll.payrollitem.PayrollItem
import com.payroll.payrollitem.PayrollItemRepository
import com.payroll.payrollslip.PayrollSlip
import com.payroll.payrollslip.PayrollSlipRepository
import com.payroll.salarystandard.SalaryStandardRepository
import com.payroll.salarystep.SalaryStepRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.YearMonth

// 월 소정근로시간 (주 40h × 52주 / 12 + 공휴일 보정 = 209h)
private val MONTHLY_WORK_HOURS = BigDecimal("209")

@Service
class PayrollCalculationService(
    private val salaryStepRepository: SalaryStepRepository,
    private val salaryStandardRepository: SalaryStandardRepository,
    private val insuranceRateRepository: InsuranceRateRepository,
    private val payrollSlipRepository: PayrollSlipRepository,
    private val payrollItemRepository: PayrollItemRepository,
    private val payrollConfigService: PayrollConfigService,
    private val overtimeRepository: OvertimeRepository,
    private val leaveRequestRepository: LeaveRequestRepository
) {

    @Transactional
    fun calculateForEmployee(payrollRun: PayrollRun, employee: Employee): PayrollSlip {
        val rate = insuranceRateRepository
            .findByCompanyAndApplyYear(employee.company, payrollRun.payrollYear)
            .orElseThrow { IllegalStateException("${payrollRun.payrollYear}년 보험요율이 등록되지 않았습니다.") }

        val salaryStep = salaryStepRepository
            .findByJobGradeAndStepAndApplyYear(employee.jobGrade, employee.currentStep, payrollRun.payrollYear)
            .orElseThrow {
                IllegalStateException(
                    "호봉기준 없음: ${employee.jobGrade.gradeName} ${employee.currentStep}호봉 ${payrollRun.payrollYear}년"
                )
            }

        val standard = salaryStandardRepository
            .findCurrentByEmployee(employee, LocalDate.of(payrollRun.payrollYear, payrollRun.payrollMonth, 1))
            .firstOrNull()

        val fullBaseSalary = salaryStep.baseSalary
        val fullMealAllowance = standard?.mealAllowance ?: BigDecimal.ZERO
        val fullTransportAllowance = standard?.transportAllowance ?: BigDecimal.ZERO
        val fullPositionAllowance = standard?.positionAllowance ?: BigDecimal.ZERO

        // ── 월할계산: 입사일이 해당 급여월 내에 있으면 재직일수 비율로 감액 ──────────────
        val payYearMonth = YearMonth.of(payrollRun.payrollYear, payrollRun.payrollMonth)
        val prorationRatio = calcProrationRatio(employee.hireDate, payYearMonth)

        val baseSalary         = applyProration(fullBaseSalary, prorationRatio)
        val mealAllowance      = applyProration(fullMealAllowance, prorationRatio)
        val transportAllowance = applyProration(fullTransportAllowance, prorationRatio)
        val positionAllowance  = applyProration(fullPositionAllowance, prorationRatio)

        // ── 비과세 한도 ────────────────────────────────────────────────────────────────
        val (mealNonTaxableLimit, transportNonTaxableLimit) =
            payrollConfigService.getNonTaxableLimits(employee.company.companyId, payrollRun.payrollYear)

        val mealNonTaxable = mealAllowance.min(mealNonTaxableLimit)
        val transportNonTaxable = if (employee.hasOwnCar) transportAllowance.min(transportNonTaxableLimit)
                                  else BigDecimal.ZERO
        val nonTaxable = mealNonTaxable.add(transportNonTaxable)

        val grossAmount   = baseSalary.add(mealAllowance).add(transportAllowance).add(positionAllowance)
        val taxableIncome = grossAmount.subtract(nonTaxable)

        // ── 4대보험 ────────────────────────────────────────────────────────────────────
        val pensionMaxBase = payrollConfigService
            .getPensionMaxBase(employee.company.companyId, payrollRun.payrollYear)

        val healthInsurance = taxableIncome.multiply(rate.healthEmployee).setScale(0, RoundingMode.FLOOR)
        val ltCare          = healthInsurance.multiply(rate.ltCareEmployee).setScale(0, RoundingMode.FLOOR)
        val pensionBase     = taxableIncome.min(pensionMaxBase)
        val pension         = pensionBase.multiply(rate.pensionEmployee).setScale(0, RoundingMode.FLOOR)
        val empInsurance    = taxableIncome.multiply(rate.empInsEmployee).setScale(0, RoundingMode.FLOOR)

        // ── 갑근세 (2026년 국세청 간이세액표) ─────────────────────────────────────────
        val incomeTax      = calcWithholdingTax(taxableIncome, employee.dependentCount)
        val localIncomeTax = incomeTax.multiply(BigDecimal("0.1")).setScale(0, RoundingMode.FLOOR)

        val deductionAmount = healthInsurance.add(ltCare).add(pension).add(empInsurance)
            .add(incomeTax).add(localIncomeTax)
        val netAmount = grossAmount.subtract(deductionAmount)

        val slip = PayrollSlip(
            payrollRun       = payrollRun,
            employee         = employee,
            grossAmount      = grossAmount,
            nonTaxableAmount = nonTaxable,
            taxableIncome    = taxableIncome,
            deductionAmount  = deductionAmount,
            netAmount        = netAmount
        )
        payrollSlipRepository.save(slip)

        // ── 급여항목 저장 ──────────────────────────────────────────────────────────────
        val items = mutableListOf<PayrollItem>()
        items.add(PayrollItem(payrollSlip = slip, itemType = "EARNING",    itemName = "기본급",     isTaxable = true,  amount = baseSalary))
        if (mealAllowance > BigDecimal.ZERO)
            items.add(PayrollItem(payrollSlip = slip, itemType = "EARNING", itemName = "식대",      isTaxable = false, amount = mealAllowance))
        if (transportAllowance > BigDecimal.ZERO)
            items.add(PayrollItem(payrollSlip = slip, itemType = "EARNING", itemName = "교통비",    isTaxable = false, amount = transportAllowance))
        if (positionAllowance > BigDecimal.ZERO)
            items.add(PayrollItem(payrollSlip = slip, itemType = "EARNING", itemName = "직책수당",  isTaxable = true,  amount = positionAllowance))

        items.add(PayrollItem(payrollSlip = slip, itemType = "DEDUCTION", itemName = "건강보험",    isTaxable = false, amount = healthInsurance))
        items.add(PayrollItem(payrollSlip = slip, itemType = "DEDUCTION", itemName = "장기요양보험", isTaxable = false, amount = ltCare))
        items.add(PayrollItem(payrollSlip = slip, itemType = "DEDUCTION", itemName = "국민연금",    isTaxable = false, amount = pension))
        items.add(PayrollItem(payrollSlip = slip, itemType = "DEDUCTION", itemName = "고용보험",    isTaxable = false, amount = empInsurance))
        items.add(PayrollItem(payrollSlip = slip, itemType = "DEDUCTION", itemName = "갑근세",      isTaxable = false, amount = incomeTax))
        items.add(PayrollItem(payrollSlip = slip, itemType = "DEDUCTION", itemName = "지방소득세",  isTaxable = false, amount = localIncomeTax))

        // ── 시간외수당 ──────────────────────────────────────────────────────────────────
        val hourlyWage = baseSalary.divide(MONTHLY_WORK_HOURS, 2, RoundingMode.FLOOR)
        val overtimes  = overtimeRepository.findApprovedByEmployeeAndMonth(
            employee.employeeId, payrollRun.payrollYear, payrollRun.payrollMonth)
        overtimes.groupBy { it.overtimeType }.forEach { (type, records) ->
            val totalHours = records.fold(BigDecimal.ZERO) { acc, r -> acc.add(r.hours) }
            val payRate    = records.first().payRate
            val otPay      = hourlyWage.multiply(totalHours).multiply(payRate).setScale(0, RoundingMode.FLOOR)
            if (otPay > BigDecimal.ZERO) {
                val name = when (type) {
                    "OVERTIME" -> "연장근로수당"
                    "NIGHT"    -> "야간근로수당"
                    "HOLIDAY"  -> "휴일근로수당"
                    else       -> "${type}수당"
                }
                items.add(PayrollItem(payrollSlip = slip, itemType = "EARNING", itemName = name,
                    isTaxable = true, amount = otPay))
                // 총지급·과세소득 반영
                slip.grossAmount     = slip.grossAmount.add(otPay)
                slip.taxableIncome   = slip.taxableIncome.add(otPay)
                slip.netAmount       = slip.netAmount.add(otPay)
            }
        }

        // ── 무급휴가 공제 ───────────────────────────────────────────────────────────────
        val unpaidLeaves = leaveRequestRepository.findApprovedUnpaidByEmployeeAndMonth(
            employee.employeeId, payrollRun.payrollYear, payrollRun.payrollMonth)
        if (unpaidLeaves.isNotEmpty()) {
            val totalUnpaidDays = unpaidLeaves.fold(BigDecimal.ZERO) { acc, lr -> acc.add(lr.days) }
            val dailyWage       = baseSalary.divide(BigDecimal("22"), 2, RoundingMode.FLOOR)
            val unpaidDeduction = dailyWage.multiply(totalUnpaidDays).setScale(0, RoundingMode.FLOOR)
            if (unpaidDeduction > BigDecimal.ZERO) {
                items.add(PayrollItem(payrollSlip = slip, itemType = "DEDUCTION", itemName = "무급휴가공제",
                    isTaxable = false, amount = unpaidDeduction))
                slip.deductionAmount = slip.deductionAmount.add(unpaidDeduction)
                slip.netAmount       = slip.netAmount.subtract(unpaidDeduction)
            }
        }

        payrollItemRepository.saveAll(items)
        return slip
    }

    // ─── 월할계산 헬퍼 ──────────────────────────────────────────────────────────────────

    /**
     * 입사일이 급여월 내에 있으면 (재직일수 / 해당월 총 일수) 비율을 반환한다.
     * 그 외(전월 이전 입사)는 null 을 반환하여 감액 없음을 나타낸다.
     */
    private fun calcProrationRatio(hireDate: LocalDate, payYearMonth: YearMonth): BigDecimal? {
        val monthStart = payYearMonth.atDay(1)
        val monthEnd   = payYearMonth.atEndOfMonth()

        // 입사일이 해당 급여월 범위 밖이면 월할 불필요
        if (hireDate < monthStart || hireDate > monthEnd) return null

        val totalDays    = payYearMonth.lengthOfMonth()
        // 재직일수: 입사일 ~ 월말 (양 끝 포함)
        val workingDays  = monthEnd.dayOfMonth - hireDate.dayOfMonth + 1

        return BigDecimal(workingDays).divide(BigDecimal(totalDays), 10, RoundingMode.FLOOR)
    }

    /** 비율이 null(전체 달 재직)이면 원래 금액, 아니면 floor 처리 후 반환. */
    private fun applyProration(amount: BigDecimal, ratio: BigDecimal?): BigDecimal =
        if (ratio == null) amount
        else amount.multiply(ratio).setScale(0, RoundingMode.FLOOR)

    // ─── 갑근세 (2026년 국세청 간이세액표, 월 과세소득 기준) ─────────────────────────────

    /**
     * 소득구간별 세율 및 부양가족 공제액:
     *
     * 구간                     | 산출세액                                      | 1인당 공제
     * ~1,060,000              | 0                                             | -
     * 1,060,001~1,500,000     | (소득 - 1,060,000) × 6%                      | 12,500
     * 1,500,001~3,000,000     | 26,400 + (소득 - 1,500,000) × 15%            | 21,000
     * 3,000,001~4,500,000     | 251,400 + (소득 - 3,000,000) × 24%           | 31,000
     * 4,500,001~8,000,000     | 611,400 + (소득 - 4,500,000) × 35%           | 43,000
     * 8,000,001~              | 1,836,400 + (소득 - 8,000,000) × 38%         | 56,000
     *
     * dependentCount = 0 이면 부양가족 공제 없음.
     * 최종 세액은 0원 미만이 되지 않도록 처리.
     */
    private fun calcWithholdingTax(taxableIncome: BigDecimal, dependentCount: Int): BigDecimal {
        val income = taxableIncome.toLong()

        val (baseTax, deductionPerDependent) = when {
            income <= 1_060_000L -> Pair(0L, 0L)
            income <= 1_500_000L -> Pair(
                ((income - 1_060_000L) * 6L + 50L) / 100L,   // ×6%
                12_500L
            )
            income <= 3_000_000L -> Pair(
                26_400L + ((income - 1_500_000L) * 15L + 50L) / 100L,
                21_000L
            )
            income <= 4_500_000L -> Pair(
                251_400L + ((income - 3_000_000L) * 24L + 50L) / 100L,
                31_000L
            )
            income <= 8_000_000L -> Pair(
                611_400L + ((income - 4_500_000L) * 35L + 50L) / 100L,
                43_000L
            )
            else -> Pair(
                1_836_400L + ((income - 8_000_000L) * 38L + 50L) / 100L,
                56_000L
            )
        }

        val totalDeduction = if (dependentCount > 0) dependentCount * deductionPerDependent else 0L
        return BigDecimal((baseTax - totalDeduction).coerceAtLeast(0L))
    }
}
