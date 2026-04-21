package com.payroll.attendance

import com.payroll.employee.Employee
import jakarta.persistence.*
import java.math.BigDecimal
import java.util.UUID

@Entity
@Table(name = "연차잔여",
    uniqueConstraints = [UniqueConstraint(columnNames = ["employee_id","leave_type_id","year"])])
class LeaveBalance(
    @Id @Column(name = "leave_balance_id", columnDefinition = "uuid")
    val leaveBalanceId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    val employee: Employee,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leave_type_id", nullable = false)
    val leaveType: LeaveType,

    @Column(nullable = false)
    val year: Int,

    @Column(name = "total_days", nullable = false, precision = 5, scale = 1)
    var totalDays: BigDecimal = BigDecimal.ZERO,

    @Column(name = "used_days", nullable = false, precision = 5, scale = 1)
    var usedDays: BigDecimal = BigDecimal.ZERO
) {
    val remainingDays: BigDecimal get() = totalDays.subtract(usedDays)
}
