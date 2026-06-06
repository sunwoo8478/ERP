package com.payroll.payrollslip

import com.payroll.payrollrun.PayrollRun
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface PayrollSlipRepository : JpaRepository<PayrollSlip, UUID> {
    fun findByPayrollRun(payrollRun: PayrollRun): List<PayrollSlip>
}
