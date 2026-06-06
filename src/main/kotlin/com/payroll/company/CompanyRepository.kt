package com.payroll.company

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface CompanyRepository : JpaRepository<Company, UUID> {
    fun findByStatus(status: String): List<Company>
    fun existsByCompanyCode(companyCode: String): Boolean
}
