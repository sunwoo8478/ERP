package com.payroll.attendance

import com.payroll.employee.Employee
import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(name = "휴가신청")
class LeaveRequest(
    @Id
    @Column(name = "leave_request_id", columnDefinition = "uuid")
    val leaveRequestId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    val employee: Employee,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leave_type_id", nullable = false)
    var leaveType: LeaveType,

    @Column(name = "start_date", nullable = false)
    var startDate: LocalDate,

    @Column(name = "end_date", nullable = false)
    var endDate: LocalDate,

    @Column(name = "days", nullable = false, precision = 5, scale = 1)
    var days: BigDecimal,

    @Column(name = "reason", length = 500)
    var reason: String? = null,

    @Column(name = "status", nullable = false, length = 20)
    var status: String = "PENDING",

    @Column(name = "approved_by", length = 100)
    var approvedBy: String? = null,

    @Column(name = "approved_at")
    var approvedAt: LocalDateTime? = null
)
