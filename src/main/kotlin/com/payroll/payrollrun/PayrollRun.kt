package com.payroll.payrollrun

import com.payroll.company.Company
import jakarta.persistence.*
import java.time.LocalDate
import java.util.UUID

@Entity
@Table(name = "급여실행")
class PayrollRun(
    @Id
    @Column(name = "payroll_run_id", columnDefinition = "uuid")
    val payrollRunId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    val company: Company,

    @Column(name = "run_name", nullable = false, length = 200)
    var runName: String,

    @Column(name = "payroll_year", nullable = false)
    var payrollYear: Int,

    @Column(name = "payroll_month", nullable = false)
    var payrollMonth: Int,

    @Column(name = "pay_date", nullable = false)
    var payDate: LocalDate,

    // DRAFT → CALCULATED → APPROVED → PAID
    @Column(name = "status", nullable = false, length = 20)
    var status: String = "DRAFT"
)
