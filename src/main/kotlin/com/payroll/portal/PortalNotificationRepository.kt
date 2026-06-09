package com.payroll.portal
import com.payroll.employee.Employee
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID
interface PortalNotificationRepository:JpaRepository<PortalNotification,UUID>{
    fun findByEmployeeOrderByCreatedAtDesc(employee:Employee):List<PortalNotification>
    fun countByEmployeeAndIsRead(employee:Employee,isRead:Boolean):Long
    fun findByPayrollSlip_PayrollSlipId(payrollSlipId:UUID):List<PortalNotification>
    fun deleteByPayrollSlip_PayrollSlipId(payrollSlipId:UUID)
}
