package com.payroll.attendance

import com.payroll.company.Company
import jakarta.persistence.*
import java.util.UUID

@Entity
@Table(name = "휴가유형")
class LeaveType(
    @Id
    @Column(name = "leave_type_id", columnDefinition = "uuid")
    val leaveTypeId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    val company: Company,

    @Column(name = "type_name", nullable = false, length = 50)
    var typeName: String,

    @Column(name = "is_paid", nullable = false)
    var isPaid: Boolean = true,

    @Column(name = "max_days_per_year")
    var maxDaysPerYear: Int? = null,

    @Column(name = "sort_order", nullable = false)
    var sortOrder: Int = 0
)
