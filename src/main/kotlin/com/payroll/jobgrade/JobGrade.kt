package com.payroll.jobgrade

import com.payroll.company.Company
import jakarta.persistence.*
import java.util.UUID

@Entity
@Table(name = "직급")
class JobGrade(
    @Id
    @Column(name = "job_grade_id", columnDefinition = "uuid")
    val jobGradeId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    val company: Company,

    @Column(name = "grade_name", nullable = false, length = 50)
    var gradeName: String,

    @Column(name = "position_name", length = 50)
    var positionName: String? = null,

    @Column(name = "sort_order", nullable = false)
    var sortOrder: Int = 0
)
