package com.payroll.attendance

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface LeaveRequestRepository : JpaRepository<LeaveRequest, UUID> {

    @Query("""
        SELECT lr FROM LeaveRequest lr
        WHERE lr.employee.company.companyId = :companyId
          AND (:year IS NULL OR YEAR(lr.startDate) = :year)
          AND (:month IS NULL OR MONTH(lr.startDate) = :month)
          AND (:employeeId IS NULL OR lr.employee.employeeId = :employeeId)
        ORDER BY lr.startDate DESC
    """)
    fun findByCompany(
        @Param("companyId") companyId: UUID,
        @Param("year") year: Int?,
        @Param("month") month: Int?,
        @Param("employeeId") employeeId: UUID?
    ): List<LeaveRequest>

    fun findByEmployee_EmployeeIdOrderByStartDateDesc(employeeId: UUID): List<LeaveRequest>

    @Query("""
        SELECT lr FROM LeaveRequest lr
        WHERE lr.employee.employeeId = :employeeId
          AND lr.status = 'APPROVED'
          AND lr.leaveType.isPaid = false
          AND ((YEAR(lr.startDate) = :year AND MONTH(lr.startDate) = :month)
            OR (YEAR(lr.endDate) = :year AND MONTH(lr.endDate) = :month))
    """)
    fun findApprovedUnpaidByEmployeeAndMonth(
        @Param("employeeId") employeeId: java.util.UUID,
        @Param("year") year: Int,
        @Param("month") month: Int
    ): List<LeaveRequest>
}
