package com.payroll.attendance

import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import com.payroll.employee.EmployeeRepository
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

@Service
@Transactional(readOnly = true)
class LeaveRequestService(
    private val leaveRequestRepository: LeaveRequestRepository,
    private val leaveTypeRepository: LeaveTypeRepository,
    private val leaveBalanceRepository: LeaveBalanceRepository,
    private val employeeRepository: EmployeeRepository
) {

    fun getLeaveRequestsByCompany(
        companyId: UUID,
        year: Int?,
        month: Int?,
        employeeId: UUID?
    ): List<LeaveRequestResponse> =
        leaveRequestRepository.findByCompany(companyId, year, month, employeeId)
            .map { it.toResponse() }

    fun getLeaveRequestsByEmployee(employeeId: UUID): List<LeaveRequestResponse> =
        leaveRequestRepository.findByEmployee_EmployeeIdOrderByStartDateDesc(employeeId)
            .map { it.toResponse() }

    @Transactional
    fun createLeaveRequest(employeeId: UUID, request: LeaveRequestCreateRequest): LeaveRequestResponse {
        val employee = employeeRepository.findByIdOrNull(employeeId)
            ?: throw NoSuchElementException("직원을 찾을 수 없습니다: $employeeId")
        val leaveType = leaveTypeRepository.findByIdOrNull(request.leaveTypeId)
            ?: throw NoSuchElementException("휴가유형을 찾을 수 없습니다: ${request.leaveTypeId}")

        // ── 재직 상태 검증 (status 또는 leaveDate 기준) ──────
        val isRetired = employee.status != "ACTIVE" ||
            (employee.leaveDate != null && !employee.leaveDate!!.isAfter(LocalDate.now()))
        if (isRetired)
            throw IllegalArgumentException("퇴직한 직원(${employee.fullName})은 휴가를 신청할 수 없습니다.")

        // ── 날짜 논리 검증 ───────────────────────────────────
        if (request.endDate.isBefore(request.startDate))
            throw IllegalArgumentException("종료일(${request.endDate})은 시작일(${request.startDate}) 이후여야 합니다.")

        if (request.startDate.isBefore(employee.hireDate))
            throw IllegalArgumentException("휴가 시작일(${request.startDate})이 입사일(${employee.hireDate}) 이전입니다.")

        employee.leaveDate?.let { leaveDate ->
            if (request.endDate.isAfter(leaveDate))
                throw IllegalArgumentException("퇴직일(${leaveDate}) 이후 날짜로는 휴가를 신청할 수 없습니다.")
        }

        if (request.days.toDouble() <= 0)
            throw IllegalArgumentException("휴가 일수는 0보다 커야 합니다.")

        // ── 중복 신청 검증 ────────────────────────────────────
        val existing = leaveRequestRepository.findByEmployee_EmployeeIdOrderByStartDateDesc(employeeId)
            .filter { it.status != "REJECTED" && it.status != "CANCELLED" }
        val overlaps = existing.any { lr ->
            !request.startDate.isAfter(lr.endDate) && !request.endDate.isBefore(lr.startDate)
        }
        if (overlaps)
            throw IllegalArgumentException("해당 기간(${request.startDate} ~ ${request.endDate})에 이미 휴가 신청 내역이 있습니다.")

        // ── 연차 잔여일수 검증 (유급 연차만) ─────────────────
        if (leaveType.typeName == "연차" || leaveType.typeName.contains("연차")) {
            val balance = leaveBalanceRepository
                .findByEmployee_EmployeeIdAndLeaveType_LeaveTypeIdAndYear(
                    employeeId, request.leaveTypeId, request.startDate.year
                ).orElse(null)
            if (balance != null && balance.remainingDays < request.days)
                throw IllegalArgumentException(
                    "연차 잔여일수(${balance.remainingDays}일)가 부족합니다. 신청일수: ${request.days}일"
                )
        }

        val entity = LeaveRequest(
            employee = employee,
            leaveType = leaveType,
            startDate = request.startDate,
            endDate = request.endDate,
            days = request.days,
            reason = request.reason
        )
        return leaveRequestRepository.save(entity).toResponse()
    }

    @Transactional
    fun approveLeaveRequest(leaveRequestId: UUID, request: ApproveRejectRequest): LeaveRequestResponse {
        val entity = leaveRequestRepository.findByIdOrNull(leaveRequestId)
            ?: throw NoSuchElementException("LeaveRequest not found: $leaveRequestId")
        if (entity.status == "APPROVED")
            throw IllegalArgumentException("이미 승인된 휴가 신청입니다.")
        if (entity.status == "REJECTED")
            throw IllegalArgumentException("이미 반려된 휴가 신청입니다.")
        entity.status = "APPROVED"
        entity.approvedBy = request.approvedBy
        entity.approvedAt = LocalDateTime.now()
        return leaveRequestRepository.save(entity).toResponse()
    }

    @Transactional
    fun rejectLeaveRequest(leaveRequestId: UUID, request: ApproveRejectRequest): LeaveRequestResponse {
        val entity = leaveRequestRepository.findByIdOrNull(leaveRequestId)
            ?: throw NoSuchElementException("LeaveRequest not found: $leaveRequestId")
        if (entity.status == "APPROVED")
            throw IllegalArgumentException("이미 승인된 휴가 신청은 반려할 수 없습니다.")
        entity.status = "REJECTED"
        entity.approvedBy = request.approvedBy
        entity.approvedAt = LocalDateTime.now()
        return leaveRequestRepository.save(entity).toResponse()
    }
}
