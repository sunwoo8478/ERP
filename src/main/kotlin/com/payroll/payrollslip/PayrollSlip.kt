package com.payroll.payrollslip

import com.payroll.employee.Employee
import com.payroll.payrollrun.PayrollRun
import jakarta.persistence.*
import java.math.BigDecimal
import java.util.UUID

@Entity
@Table(name = "급여명세")
class PayrollSlip(
    @Id
    @Column(name = "payroll_slip_id", columnDefinition = "uuid")
    val payrollSlipId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payroll_run_id", nullable = false)
    val payrollRun: PayrollRun,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    val employee: Employee,

    @Column(name = "gross_amount", nullable = false, precision = 15, scale = 2)
    var grossAmount: BigDecimal = BigDecimal.ZERO,

    @Column(name = "non_taxable_amount", nullable = false, precision = 15, scale = 2)
    var nonTaxableAmount: BigDecimal = BigDecimal.ZERO,

    @Column(name = "taxable_income", nullable = false, precision = 15, scale = 2)
    var taxableIncome: BigDecimal = BigDecimal.ZERO,

    @Column(name = "deduction_amount", nullable = false, precision = 15, scale = 2)
    var deductionAmount: BigDecimal = BigDecimal.ZERO,

    @Column(name = "net_amount", nullable = false, precision = 15, scale = 2)
    var netAmount: BigDecimal = BigDecimal.ZERO,

    @Column(name = "delivery_method", length = 20)
    var deliveryMethod: String? = "EMAIL",

    @Column(name = "delivery_status", length = 20)
    var deliveryStatus: String = "PENDING",

    @Column(name = "file_url", columnDefinition = "text")
    var fileUrl: String? = null
)
