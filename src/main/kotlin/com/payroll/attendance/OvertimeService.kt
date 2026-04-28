package com.payroll.attendance

import com.payroll.employee.EmployeeRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.util.UUID

@Service
@Transactional(readOnly = true)
class OvertimeService(
    private val overtimeRepository: OvertimeRepository,
    private val employeeRepository: EmployeeRepository
) {

    fun getOvertimeByCompany(companyId: UUID, year: Int?, month: Int?): List<OvertimeResponse> =
        overtimeRepository.findByCompany(companyId, year, month)
            .map { it.toResponse() }

    fun getOvertimeByEmployee(employeeId: UUID): List<OvertimeResponse> =
        overtimeRepository.findByEmployee_EmployeeIdOrderByWorkDateDesc(employeeId)
            .map { it.toResponse() }

    @Transactional
    fun createOvertime(employeeId: UUID, request: OvertimeCreateRequest): OvertimeResponse {
        val employee = employeeRepository.findByIdOrNull(employeeId)
            ?: throw NoSuchElementException("직원을 찾을 수 없습니다: $employeeId")

        // ── 재직 상태 검증 (status 또는 leaveDate 기준) ──────
        val isRetired = employee.status != "ACTIVE" ||
            (employee.leaveDate != null && !employee.leaveDate!!.isAfter(LocalDate.now()))
        if (isRetired)
            throw IllegalArgumentException("퇴직한 직원(${employee.fullName})은 시간외근무를 등록할 수 없습니다.")

        // ── 날짜 검증 ─────────────────────────────────────────
        if (request.workDate.isAfter(LocalDate.now()))
            throw IllegalArgumentException("시간외근무 날짜(${request.workDate})는 오늘 이후 날짜로 등록할 수 없습니다.")

        if (request.workDate.isBefore(employee.hireDate))
            throw IllegalArgumentException("시간외근무 날짜(${request.workDate})가 입사일(${employee.hireDate}) 이전입니다.")

        employee.leaveDate?.let { leaveDate ->
            if (request.workDate.isAfter(leaveDate))
                throw IllegalArgumentException("퇴직일(${leaveDate}) 이후 날짜로는 시간외근무를 등록할 수 없습니다.")
        }

        if (request.hours.toDouble() <= 0)
            throw IllegalArgumentException("시간외근무 시간은 0보다 커야 합니다.")

        if (request.hours.toDouble() > 12)
            throw IllegalArgumentException("1일 시간외근무는 12시간을 초과할 수 없습니다.")

        // ── 중복 등록 검증 (같은 날짜, 같은 유형) ────────────
        val duplicate = overtimeRepository.findByEmployee_EmployeeIdOrderByWorkDateDesc(employeeId)
            .any { it.workDate == request.workDate && it.overtimeType == request.overtimeType }
        if (duplicate)
            throw IllegalArgumentException("${request.workDate}에 이미 ${request.overtimeType} 유형의 시간외근무가 등록되어 있습니다.")

        val entity = OvertimeRecord(
            employee = employee,
            workDate = request.workDate,
            overtimeType = request.overtimeType,
            hours = request.hours,
            payRate = request.payRate,
            memo = request.memo
        )
        return overtimeRepository.save(entity).toResponse()
    }

    @Transactional
    fun approveOvertime(overtimeId: UUID): OvertimeResponse {
        val entity = overtimeRepository.findByIdOrNull(overtimeId)
            ?: throw NoSuchElementException("OvertimeRecord not found: $overtimeId")
        if (entity.approved)
            throw IllegalArgumentException("이미 승인된 시간외근무 기록입니다.")
        entity.approved = true
        return overtimeRepository.save(entity).toResponse()
    }
}
