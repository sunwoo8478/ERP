package com.payroll.company

import jakarta.persistence.*
import java.time.LocalDate
import java.util.UUID

@Entity
@Table(name = "고객사")
class Company(
    @Id
    @Column(name = "company_id", columnDefinition = "uuid")
    val companyId: UUID = UUID.randomUUID(),

    @Column(name = "company_code", nullable = false, unique = true, length = 50)
    var companyCode: String,

    @Column(name = "company_name", nullable = false, length = 200)
    var companyName: String,

    @Column(name = "status", nullable = false, length = 20)
    var status: String = "ACTIVE",

    @Column(name = "biz_no", length = 20)
    var bizNo: String? = null,

    @Column(name = "ceo", length = 100)
    var ceo: String? = null,

    @Column(name = "industry", length = 100)
    var industry: String? = null,

    @Column(name = "since_date")
    var sinceDate: LocalDate? = null,

    @Column(name = "address", length = 300)
    var address: String? = null,

    @Column(name = "phone", length = 30)
    var phone: String? = null,

    @Column(name = "payroll_contact", length = 100)
    var payrollContact: String? = null,

    @Column(name = "payroll_contact_email", length = 200)
    var payrollContactEmail: String? = null,

    @Column(name = "bank_name", length = 50)
    var bankName: String? = null,

    @Column(name = "bank_account", length = 50)
    var bankAccount: String? = null
)
