package com.payroll.company

import jakarta.persistence.*
import java.util.UUID

@Entity
@Table(name = "company")
class Company(
    @Id
    @Column(name = "company_id", columnDefinition = "uuid")
    val companyId: UUID = UUID.randomUUID(),

    @Column(name = "company_code", nullable = false, unique = true, length = 50)
    var companyCode: String,

    @Column(name = "company_name", nullable = false, length = 200)
    var companyName: String,

    @Column(name = "status", nullable = false, length = 20)
    var status: String = "ACTIVE"
)
