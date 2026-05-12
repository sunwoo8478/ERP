package com.payroll.insurancerate

import com.payroll.company.Company
import jakarta.persistence.*
import java.math.BigDecimal
import java.util.UUID

@Entity
@Table(name = "보험요율",
    uniqueConstraints = [UniqueConstraint(columnNames = ["company_id", "apply_year"])]
)
class InsuranceRate(
    @Id
    @Column(name = "rate_id", columnDefinition = "uuid")
    val rateId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    val company: Company,

    @Column(name = "apply_year", nullable = false)
    var applyYear: Int,

    // 건강보험 (2026: 직원 3.545%, 회사 3.545%)
    @Column(name = "health_employee", nullable = false, precision = 6, scale = 4)
    var healthEmployee: BigDecimal = BigDecimal("0.03545"),
    @Column(name = "health_employer", nullable = false, precision = 6, scale = 4)
    var healthEmployer: BigDecimal = BigDecimal("0.03545"),

    // 장기요양 (건강보험료의 12.95%)
    @Column(name = "lt_care_employee", nullable = false, precision = 6, scale = 4)
    var ltCareEmployee: BigDecimal = BigDecimal("0.1295"),
    @Column(name = "lt_care_employer", nullable = false, precision = 6, scale = 4)
    var ltCareEmployer: BigDecimal = BigDecimal("0.1295"),

    // 국민연금 (직원 4.5%, 회사 4.5%)
    @Column(name = "pension_employee", nullable = false, precision = 6, scale = 4)
    var pensionEmployee: BigDecimal = BigDecimal("0.045"),
    @Column(name = "pension_employer", nullable = false, precision = 6, scale = 4)
    var pensionEmployer: BigDecimal = BigDecimal("0.045"),

    // 고용보험 (직원 0.9%, 회사 0.9%)
    @Column(name = "emp_ins_employee", nullable = false, precision = 6, scale = 4)
    var empInsEmployee: BigDecimal = BigDecimal("0.009"),
    @Column(name = "emp_ins_employer", nullable = false, precision = 6, scale = 4)
    var empInsEmployer: BigDecimal = BigDecimal("0.009"),

    // 산재보험 (회사만 부담, 업종별 상이 — 기본값 0.9%)
    @Column(name = "accident_employer", nullable = false, precision = 6, scale = 4)
    var accidentEmployer: BigDecimal = BigDecimal("0.009")
)
