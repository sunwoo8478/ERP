package com.payroll.attendance

import org.springframework.data.jpa.repository.JpaRepository
import java.util.Optional
import java.util.UUID

interface LeaveBalanceRepository : JpaRepository<LeaveBalance, UUID> {
    fun findByEmployee_EmployeeIdAndYear(employeeId: UUID, year: Int): List<LeaveBalance>
    fun findByEmployee_EmployeeIdAndLeaveType_LeaveTypeIdAndYear(
        employeeId: UUID, leaveTypeId: UUID, year: Int
    ): Optional<LeaveBalance>
    fun findByEmployee_Company_CompanyIdAndYear(companyId: UUID, year: Int): List<LeaveBalance>
}
