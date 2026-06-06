package com.payroll.orgunit

import com.payroll.company.Company
import jakarta.persistence.*
import java.util.UUID

@Entity
@Table(name = "org_unit")
class OrgUnit(
    @Id
    @Column(name = "org_unit_id", columnDefinition = "uuid")
    val orgUnitId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    val company: Company,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_org_unit_id")
    var parentOrgUnit: OrgUnit? = null,

    @Column(name = "org_unit_name", nullable = false, length = 100)
    var orgUnitName: String,

    @Column(name = "active_flag", nullable = false)
    var activeFlag: Boolean = true
)
