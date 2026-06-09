package com.payroll.portal
import java.math.BigDecimal; import java.time.LocalDate; import java.time.LocalDateTime; import java.util.UUID

data class PortalLoginRequest(val companyCode:String, val employeeNo:String)
data class PortalEmployeeInfo(val employeeId:UUID, val employeeNo:String, val fullName:String, val companyName:String, val gradeName:String, val orgUnitName:String, val currentStep:Int)
data class PortalSlipSummary(val payrollSlipId:UUID, val year:Int, val month:Int, val payDate:LocalDate, val netAmount:BigDecimal, val grossAmount:BigDecimal, val deductionAmount:BigDecimal, val deliveryStatus:String, val isNew:Boolean)
data class PortalSlipDetail(val payrollSlipId:UUID, val year:Int, val month:Int, val payDate:LocalDate, val employeeNo:String, val fullName:String, val gradeName:String, val orgUnitName:String, val currentStep:Int, val grossAmount:BigDecimal, val nonTaxableAmount:BigDecimal, val taxableIncome:BigDecimal, val deductionAmount:BigDecimal, val netAmount:BigDecimal, val earnings:List<PortalItem>, val deductions:List<PortalItem>)
data class PortalItem(val itemName:String, val amount:BigDecimal, val isTaxable:Boolean)
data class NotificationDto(val notificationId:UUID, val title:String, val body:String?, val isRead:Boolean, val createdAt:LocalDateTime, val payrollSlipId:UUID?)
data class BankTransaction(val txId:UUID, val date:LocalDate, val description:String, val amount:BigDecimal, val balance:BigDecimal, val txType:String, val payrollSlipId:UUID?)
data class BankAccountInfo(val bankName:String, val accountNo:String, val ownerName:String, val companyName:String, val balance:BigDecimal, val transactions:List<BankTransaction>)
