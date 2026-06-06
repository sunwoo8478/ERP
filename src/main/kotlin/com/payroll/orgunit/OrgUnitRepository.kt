package com.payroll.orgunit

import com.payroll.company.Company
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface OrgUnitRepository : JpaRepository<OrgUnit, UUID> {
    fun findByCompany(company: Company): List<OrgUnit>
    fun findByCompanyAndActiveFlag(company: Company, activeFlag: Boolean): List<OrgUnit>
}
