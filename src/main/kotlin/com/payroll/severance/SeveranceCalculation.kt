package com.payroll.severance

import com.payroll.employee.Employee
import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(name = "퇴직금")
class SeveranceCalculation(
    @Id @Column(name = "severance_id", columnDefinition = "uuid")
    val severanceId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    val employee: Employee,

    @Column(name = "calculation_date", nullable = false)
    var calculationDate: LocalDate,

    @Column(name = "tenure_days", nullable = false)
    var tenureDays: Int,

    @Column(name = "avg_daily_wage", nullable = false, precision = 15, scale = 2)
    var avgDailyWage: BigDecimal,

    @Column(name = "severance_amount", nullable = false, precision = 15, scale = 2)
    var severanceAmount: BigDecimal,

    @Column(nullable = false, length = 20)
    var status: String = "DRAFT",

    @Column(columnDefinition = "text")
    var note: String? = null,

    @Column(name = "created_at")
    val createdAt: LocalDateTime = LocalDateTime.now()
)
