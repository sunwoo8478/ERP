package com.payroll.payrollitem

import com.payroll.payrollslip.PayrollSlip
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface PayrollItemRepository : JpaRepository<PayrollItem, UUID> {
    fun findByPayrollSlip(payrollSlip: PayrollSlip): List<PayrollItem>
    fun deleteByPayrollSlip(payrollSlip: PayrollSlip)
}
