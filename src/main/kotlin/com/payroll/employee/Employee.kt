package com.payroll.employee

import com.payroll.company.Company
import com.payroll.jobgrade.JobGrade
import com.payroll.orgunit.OrgUnit
import jakarta.persistence.*
import java.time.LocalDate
import java.util.UUID

@Entity
@Table(name = "직원")
class Employee(
    @Id
    @Column(name = "employee_id", columnDefinition = "uuid")
    val employeeId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    val company: Company,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_unit_id", nullable = false)
    var orgUnit: OrgUnit,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_grade_id", nullable = false)
    var jobGrade: JobGrade,

    @Column(name = "employee_no", nullable = false, length = 50)
    var employeeNo: String,

    @Column(name = "full_name", nullable = false, length = 100)
    var fullName: String,

    @Column(name = "employment_type", nullable = false, length = 20)
    var employmentType: String = "FULL_TIME",

    @Column(name = "current_step", nullable = false)
    var currentStep: Int = 1,

    @Column(name = "dependent_count", nullable = false)
    var dependentCount: Int = 0,

    @Column(name = "hire_date", nullable = false)
    var hireDate: LocalDate,

    @Column(name = "status", nullable = false, length = 20)
    var status: String = "ACTIVE",

    @Column(name = "has_own_car", nullable = false)
    var hasOwnCar: Boolean = false,

    @Column(name = "email", length = 200)
    var email: String? = null,

    @Column(name = "bank_name", length = 50)
    var bankName: String? = null,

    @Column(name = "bank_account", length = 50)
    var bankAccount: String? = null,

    @Column(name = "resident_no", length = 200)
    var residentNo: String? = null,

    @Column(name = "leave_date")
    var leaveDate: LocalDate? = null
)
