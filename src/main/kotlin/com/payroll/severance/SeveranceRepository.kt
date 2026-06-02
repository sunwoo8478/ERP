package com.payroll.severance

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface SeveranceRepository : JpaRepository<SeveranceCalculation, UUID> {
    fun findByEmployee_EmployeeIdOrderByCalculationDateDesc(employeeId: UUID): List<SeveranceCalculation>
}
