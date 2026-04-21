package com.payroll.attendance

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface LeaveTypeRepository : JpaRepository<LeaveType, UUID> {
    fun findByCompany_CompanyIdOrderBySortOrderAsc(companyId: UUID): List<LeaveType>
    fun findByCompanyOrderBySortOrder(company: com.payroll.company.Company): List<LeaveType>
}
