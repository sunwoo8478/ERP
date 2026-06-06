package com.payroll.salarystandard

import com.payroll.employee.Employee
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.time.LocalDate
import java.util.Optional
import java.util.UUID

interface SalaryStandardRepository : JpaRepository<SalaryStandard, UUID> {
    fun findByEmployeeOrderByEffectiveStartDateDesc(employee: Employee): List<SalaryStandard>

    @Query("""
        SELECT s FROM SalaryStandard s
        WHERE s.employee = :employee
          AND s.effectiveStartDate <= :targetDate
          AND (s.effectiveEndDate IS NULL OR s.effectiveEndDate >= :targetDate)
        ORDER BY s.effectiveStartDate DESC
    """)
    fun findCurrentByEmployee(employee: Employee, targetDate: LocalDate): List<SalaryStandard>
}
