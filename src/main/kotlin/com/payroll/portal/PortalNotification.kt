package com.payroll.portal
import com.payroll.employee.Employee
import com.payroll.payrollslip.PayrollSlip
import jakarta.persistence.*
import java.time.LocalDateTime
import java.util.UUID

@Entity @Table(name = "포털알림")
class PortalNotification(
    @Id @Column(name="notification_id",columnDefinition="uuid") val notificationId:UUID=UUID.randomUUID(),
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="employee_id",nullable=false) val employee:Employee,
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="payroll_slip_id") val payrollSlip:PayrollSlip?=null,
    @Column(name="title",nullable=false,length=200) var title:String,
    @Column(name="body",columnDefinition="text") var body:String?=null,
    @Column(name="is_read",nullable=false) var isRead:Boolean=false,
    @Column(name="created_at",nullable=false) val createdAt:LocalDateTime=LocalDateTime.now()
)
