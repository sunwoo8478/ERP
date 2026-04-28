package com.payroll.attendance

import com.payroll.employee.Employee
import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

@Entity
@Table(name = "시간외근무")
class OvertimeRecord(
    @Id
    @Column(name = "overtime_id", columnDefinition = "uuid")
    val overtimeId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    val employee: Employee,

    @Column(name = "work_date", nullable = false)
    var workDate: LocalDate,

    @Column(name = "overtime_type", nullable = false, length = 20)
    var overtimeType: String,

    @Column(name = "hours", nullable = false, precision = 5, scale = 2)
    var hours: BigDecimal,

    @Column(name = "pay_rate", nullable = false, precision = 4, scale = 2)
    var payRate: BigDecimal = BigDecimal("1.5"),

    @Column(name = "approved", nullable = false)
    var approved: Boolean = false,

    @Column(name = "memo", length = 500)
    var memo: String? = null
)
