package com.payroll.salarystandard

import com.payroll.employee.Employee
import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

@Entity
@Table(name = "급여기준")
class SalaryStandard(
    @Id
    @Column(name = "salary_standard_id", columnDefinition = "uuid")
    val salaryStandardId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    val employee: Employee,

    @Column(name = "effective_start_date", nullable = false)
    var effectiveStartDate: LocalDate,

    @Column(name = "effective_end_date")
    var effectiveEndDate: LocalDate? = null,

    @Column(name = "meal_allowance", nullable = false, precision = 15, scale = 2)
    var mealAllowance: BigDecimal = BigDecimal.ZERO,

    @Column(name = "transport_allowance", nullable = false, precision = 15, scale = 2)
    var transportAllowance: BigDecimal = BigDecimal.ZERO,

    @Column(name = "position_allowance", nullable = false, precision = 15, scale = 2)
    var positionAllowance: BigDecimal = BigDecimal.ZERO,

    @Column(name = "change_reason", length = 200)
    var changeReason: String? = null
)
