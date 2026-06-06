package com.payroll.employee

import com.payroll.company.Company
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface EmployeeRepository : JpaRepository<Employee, UUID> {
    fun findByCompany(company: Company): List<Employee>
    fun findByCompanyAndStatus(company: Company, status: String): List<Employee>
    fun existsByCompanyAndEmployeeNo(company: Company, employeeNo: String): Boolean
}
