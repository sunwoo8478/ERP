package com.payroll.attendance

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface OvertimeRepository : JpaRepository<OvertimeRecord, UUID> {

    @Query("""
        SELECT o FROM OvertimeRecord o
        WHERE o.employee.company.companyId = :companyId
          AND (:year IS NULL OR YEAR(o.workDate) = :year)
          AND (:month IS NULL OR MONTH(o.workDate) = :month)
        ORDER BY o.workDate DESC
    """)
    fun findByCompany(
        @Param("companyId") companyId: UUID,
        @Param("year") year: Int?,
        @Param("month") month: Int?
    ): List<OvertimeRecord>

    fun findByEmployee_EmployeeIdOrderByWorkDateDesc(employeeId: UUID): List<OvertimeRecord>

    @Query("""
        SELECT o FROM OvertimeRecord o
        WHERE o.employee.employeeId = :employeeId
          AND o.approved = true
          AND YEAR(o.workDate) = :year
          AND MONTH(o.workDate) = :month
    """)
    fun findApprovedByEmployeeAndMonth(
        @Param("employeeId") employeeId: java.util.UUID,
        @Param("year") year: Int,
        @Param("month") month: Int
    ): List<OvertimeRecord>
}
