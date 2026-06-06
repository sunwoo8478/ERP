package com.payroll.payrollrun

import com.payroll.company.Company
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface PayrollRunRepository : JpaRepository<PayrollRun, UUID> {
    fun findByCompanyOrderByPayrollYearDescPayrollMonthDesc(company: Company): List<PayrollRun>
    fun existsByCompanyAndPayrollYearAndPayrollMonth(company: Company, year: Int, month: Int): Boolean
}
