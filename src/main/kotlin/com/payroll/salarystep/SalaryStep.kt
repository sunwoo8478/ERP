package com.payroll.salarystep

import com.payroll.jobgrade.JobGrade
import jakarta.persistence.*
import java.math.BigDecimal
import java.util.UUID

@Entity
@Table(name = "호봉기준",
    uniqueConstraints = [UniqueConstraint(columnNames = ["job_grade_id", "step", "apply_year"])]
)
class SalaryStep(
    @Id
    @Column(name = "salary_step_id", columnDefinition = "uuid")
    val salaryStepId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_grade_id", nullable = false)
    val jobGrade: JobGrade,

    @Column(name = "step", nullable = false)
    var step: Int,

    @Column(name = "apply_year", nullable = false)
    var applyYear: Int,

    @Column(name = "base_salary", nullable = false, precision = 15, scale = 2)
    var baseSalary: BigDecimal
)
