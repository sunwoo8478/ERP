package com.payroll.payrollconfig

import com.payroll.company.Company
import org.springframework.data.jpa.repository.JpaRepository
import java.util.Optional
import java.util.UUID

interface PayrollConfigRepository : JpaRepository<PayrollConfig, UUID> {
    fun findByCompanyOrderByApplyYearDesc(company: Company): List<PayrollConfig>
    fun findByCompanyAndApplyYear(company: Company, applyYear: Int): Optional<PayrollConfig>
}
