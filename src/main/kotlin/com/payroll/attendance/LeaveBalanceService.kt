package com.payroll.attendance

import com.payroll.company.CompanyRepository
import com.payroll.employee.EmployeeRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.util.UUID

data class LeaveBalanceResponse(
    val leaveBalanceId: UUID,
    val employeeId: UUID,
    val employeeNo: String,
    val fullName: String,
    val leaveTypeId: UUID,
    val leaveTypeName: String,
    val year: Int,
    val totalDays: BigDecimal,
    val usedDays: BigDecimal,
    val remainingDays: BigDecimal
)

@Service
@Transactional(readOnly = true)
class LeaveBalanceService(
    private val leaveBalanceRepository: LeaveBalanceRepository,
    private val leaveTypeRepository: LeaveTypeRepository,
    private val employeeRepository: EmployeeRepository,
    private val companyRepository: CompanyRepository
) {
    fun getBalance(employeeId: UUID, year: Int): List<LeaveBalanceResponse> =
        leaveBalanceRepository.findByEmployee_EmployeeIdAndYear(employeeId, year)
            .map { toResponse(it) }

    @Transactional
    fun initBalance(companyId: UUID, year: Int): Int {
        val company   = companyRepository.findById(companyId).orElseThrow()
        val employees = employeeRepository.findByCompanyAndStatus(company, "ACTIVE")
        val leaveTypes = leaveTypeRepository.findByCompanyOrderBySortOrder(company)
        val annualType = leaveTypes.firstOrNull { it.typeName == "연차" } ?: return 0

        var count = 0
        employees.forEach { emp ->
            val existing = leaveBalanceRepository
                .findByEmployee_EmployeeIdAndLeaveType_LeaveTypeIdAndYear(
                    emp.employeeId, annualType.leaveTypeId, year)
            if (existing.isEmpty) {
                val totalDays = calcAnnualLeave(emp.hireDate, year)
                leaveBalanceRepository.save(LeaveBalance(
                    employee  = emp,
                    leaveType = annualType,
                    year      = year,
                    totalDays = totalDays
                ))
                count++
            }
        }
        return count
    }

    @Transactional
    fun deductOnApproval(request: LeaveRequest) {
        if (request.status != "APPROVED") return
        val year = request.startDate.year
        val balance = leaveBalanceRepository.findByEmployee_EmployeeIdAndLeaveType_LeaveTypeIdAndYear(
            request.employee.employeeId, request.leaveType.leaveTypeId, year
        ).orElse(null) ?: return
        balance.usedDays = balance.usedDays.add(request.days)
    }

    // 연차 발생 계산 (한국 근로기준법 기준)
    private fun calcAnnualLeave(hireDate: LocalDate, targetYear: Int): BigDecimal {
        val jan1 = LocalDate.of(targetYear, 1, 1)
        val yearsWorked = ChronoUnit.YEARS.between(hireDate, jan1).toInt()
        return when {
            yearsWorked < 1  -> {
                // 1년 미만: 월 1일 (입사월 기준)
                val months = ChronoUnit.MONTHS.between(hireDate, jan1).toInt().coerceAtMost(11)
                BigDecimal(months)
            }
            yearsWorked < 3  -> BigDecimal("15")
            else -> {
                // 3년 이상: 2년마다 1일 추가, 최대 25일
                val extra = (yearsWorked - 1) / 2
                BigDecimal((15 + extra).coerceAtMost(25))
            }
        }
    }

    private fun toResponse(b: LeaveBalance) = LeaveBalanceResponse(
        leaveBalanceId = b.leaveBalanceId,
        employeeId     = b.employee.employeeId,
        employeeNo     = b.employee.employeeNo,
        fullName       = b.employee.fullName,
        leaveTypeId    = b.leaveType.leaveTypeId,
        leaveTypeName  = b.leaveType.typeName,
        year           = b.year,
        totalDays      = b.totalDays,
        usedDays       = b.usedDays,
        remainingDays  = b.remainingDays
    )
}
