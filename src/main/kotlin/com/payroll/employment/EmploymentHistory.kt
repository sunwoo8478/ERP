package com.payroll.employment

import com.payroll.employee.Employee
import jakarta.persistence.*
import java.time.LocalDate
import java.util.UUID

@Entity
@Table(name = "발령이력")
class EmploymentHistory(
    @Id
    @Column(name = "employment_history_id", columnDefinition = "uuid")
    val employmentHistoryId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    val employee: Employee,

    @Column(name = "change_type", nullable = false, length = 20)
    var changeType: String,

    @Column(name = "from_org_unit_name", length = 200)
    var fromOrgUnitName: String? = null,

    @Column(name = "to_org_unit_name", length = 200)
    var toOrgUnitName: String? = null,

    @Column(name = "from_grade_name", length = 100)
    var fromGradeName: String? = null,

    @Column(name = "to_grade_name", length = 100)
    var toGradeName: String? = null,

    @Column(name = "from_step")
    var fromStep: Int? = null,

    @Column(name = "to_step")
    var toStep: Int? = null,

    @Column(name = "change_date", nullable = false)
    var changeDate: LocalDate,

    @Column(name = "reason", length = 300)
    var reason: String? = null,

    @Column(name = "changed_by", length = 100)
    var changedBy: String? = null
)
