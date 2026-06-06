package com.payroll.payrollconfig

import com.payroll.company.Company
import jakarta.persistence.*
import java.math.BigDecimal
import java.util.UUID

@Entity
@Table(
    name = "payroll_config",
    uniqueConstraints = [UniqueConstraint(columnNames = ["company_id", "apply_year"])]
)
class PayrollConfig(
    @Id
    @Column(name = "config_id", columnDefinition = "uuid")
    val configId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    val company: Company,

    @Column(name = "apply_year", nullable = false)
    val applyYear: Int,

    @Column(name = "meal_non_taxable", nullable = false, precision = 15, scale = 2)
    var mealNonTaxable: BigDecimal = BigDecimal("200000"),

    @Column(name = "transport_non_taxable", nullable = false, precision = 15, scale = 2)
    var transportNonTaxable: BigDecimal = BigDecimal("200000")
)
