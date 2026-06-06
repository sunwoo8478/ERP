package com.payroll.jobgrade

import com.payroll.company.Company
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface JobGradeRepository : JpaRepository<JobGrade, UUID> {
    fun findByCompanyOrderBySortOrder(company: Company): List<JobGrade>
}
