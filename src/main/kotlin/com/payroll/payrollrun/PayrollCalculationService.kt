package com.payroll.payrollrun

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

@Service
class PayrollCalculationService(
    private val salaryStepRepository: SalaryStepRepository,
    private val salaryStandardRepository: SalaryStandardRepository,
    private val insuranceRateRepository: InsuranceRateRepository,
    private val payrollSlipRepository: PayrollSlipRepository,
    private val payrollItemRepository: PayrollItemRepository,
    private val payrollConfigService: PayrollConfigService
) {

    // 국민연금 과세소득 상한 (2026년 기준 617만원)
    private val pensionMaxBase = BigDecimal("6170000")

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

        val baseSalary = salaryStep.baseSalary
        val mealAllowance = standard?.mealAllowance ?: BigDecimal.ZERO
        val transportAllowance = standard?.transportAllowance ?: BigDecimal.ZERO
        val positionAllowance = standard?.positionAllowance ?: BigDecimal.ZERO

        // 비과세 한도 — DB 설정 우선, 없으면 법정 기본값 사용
        val (mealNonTaxableLimit, transportNonTaxableLimit) =
            payrollConfigService.getNonTaxableLimits(employee.company.companyId, payrollRun.payrollYear)

        // 비과세 계산 (한도 초과분은 과세)
        val mealNonTaxable = mealAllowance.min(mealNonTaxableLimit)
        val transportNonTaxable = transportAllowance.min(transportNonTaxableLimit)
        val nonTaxable = mealNonTaxable.add(transportNonTaxable)

        val grossAmount = baseSalary.add(mealAllowance).add(transportAllowance).add(positionAllowance)
        val taxableIncome = grossAmount.subtract(nonTaxable)

        // 4대보험 계산
        val healthInsurance = taxableIncome.multiply(rate.healthEmployee).setScale(0, RoundingMode.FLOOR)
        val ltCare = healthInsurance.multiply(rate.ltCareEmployee).setScale(0, RoundingMode.FLOOR)
        val pensionBase = taxableIncome.min(pensionMaxBase)
        val pension = pensionBase.multiply(rate.pensionEmployee).setScale(0, RoundingMode.FLOOR)
        val empInsurance = taxableIncome.multiply(rate.empInsEmployee).setScale(0, RoundingMode.FLOOR)

        // 갑근세 (간이세액표 근사 계산 — 정확한 연말정산은 별도 처리)
        val incomeTax = calcWithholdingTax(taxableIncome, employee.dependentCount)
        val localIncomeTax = incomeTax.multiply(BigDecimal("0.1")).setScale(0, RoundingMode.FLOOR)

        val deductionAmount = healthInsurance.add(ltCare).add(pension).add(empInsurance)
            .add(incomeTax).add(localIncomeTax)
        val netAmount = grossAmount.subtract(deductionAmount)

        val slip = PayrollSlip(
            payrollRun = payrollRun,
            employee = employee,
            grossAmount = grossAmount,
            nonTaxableAmount = nonTaxable,
            taxableIncome = taxableIncome,
            deductionAmount = deductionAmount,
            netAmount = netAmount
        )
        payrollSlipRepository.save(slip)

        // 급여항목 저장
        val items = mutableListOf<PayrollItem>()
        items.add(PayrollItem(payrollSlip = slip, itemType = "EARNING", itemName = "기본급", isTaxable = true, amount = baseSalary))
        if (mealAllowance > BigDecimal.ZERO)
            items.add(PayrollItem(payrollSlip = slip, itemType = "EARNING", itemName = "식대", isTaxable = false, amount = mealAllowance))
        if (transportAllowance > BigDecimal.ZERO)
            items.add(PayrollItem(payrollSlip = slip, itemType = "EARNING", itemName = "교통비", isTaxable = false, amount = transportAllowance))
        if (positionAllowance > BigDecimal.ZERO)
            items.add(PayrollItem(payrollSlip = slip, itemType = "EARNING", itemName = "직책수당", isTaxable = true, amount = positionAllowance))

        items.add(PayrollItem(payrollSlip = slip, itemType = "DEDUCTION", itemName = "건강보험", isTaxable = false, amount = healthInsurance))
        items.add(PayrollItem(payrollSlip = slip, itemType = "DEDUCTION", itemName = "장기요양보험", isTaxable = false, amount = ltCare))
        items.add(PayrollItem(payrollSlip = slip, itemType = "DEDUCTION", itemName = "국민연금", isTaxable = false, amount = pension))
        items.add(PayrollItem(payrollSlip = slip, itemType = "DEDUCTION", itemName = "고용보험", isTaxable = false, amount = empInsurance))
        items.add(PayrollItem(payrollSlip = slip, itemType = "DEDUCTION", itemName = "갑근세", isTaxable = false, amount = incomeTax))
        items.add(PayrollItem(payrollSlip = slip, itemType = "DEDUCTION", itemName = "지방소득세", isTaxable = false, amount = localIncomeTax))

        payrollItemRepository.saveAll(items)
        return slip
    }

    // 간이세액표 근사 계산 (월 과세소득 기준, 부양가족 수 반영)
    private fun calcWithholdingTax(taxableIncome: BigDecimal, dependentCount: Int): BigDecimal {
        val income = taxableIncome.toLong()
        val base = when {
            income <= 1_060_000 -> 0L
            income <= 1_500_000 -> ((income - 1_060_000) * 0.06).toLong()
            income <= 3_000_000 -> (26_400 + (income - 1_500_000) * 0.15).toLong()
            income <= 4_500_000 -> (251_400 + (income - 3_000_000) * 0.24).toLong()
            income <= 8_800_000 -> (611_400 + (income - 4_500_000) * 0.35).toLong()
            else -> (2_116_400 + (income - 8_800_000) * 0.38).toLong()
        }
        // 부양가족 공제 (1인당 월 12,500원 감면)
        val deduction = (dependentCount * 12_500).coerceAtLeast(0)
        return BigDecimal((base - deduction).coerceAtLeast(0))
    }
}
