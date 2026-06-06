package com.payroll.insurancerate

import com.payroll.company.Company
import org.springframework.data.jpa.repository.JpaRepository
import java.util.Optional
import java.util.UUID

interface InsuranceRateRepository : JpaRepository<InsuranceRate, UUID> {
    fun findByCompanyAndApplyYear(company: Company, applyYear: Int): Optional<InsuranceRate>
    fun findByCompanyOrderByApplyYearDesc(company: Company): List<InsuranceRate>
}
