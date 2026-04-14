package com.payroll.employment

import com.payroll.employee.Employee
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface EmploymentHistoryRepository : JpaRepository<EmploymentHistory, UUID> {

    fun findByEmployeeOrderByChangeDateDesc(employee: Employee): List<EmploymentHistory>

    fun findByEmployee_Company_CompanyIdOrderByChangeDateDesc(companyId: UUID): List<EmploymentHistory>
}
