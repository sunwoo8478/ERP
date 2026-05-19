package com.payroll.payrollrun

import com.payroll.company.CompanyRepository
import com.payroll.employee.EmployeeRepository
import com.payroll.employee.EmployeeService
import com.payroll.employee.StepIncrementRequest
import com.payroll.employee.StepIncrementResult
import com.payroll.payrollitem.PayrollItemRepository
import com.payroll.payrollslip.PayrollSlipRepository
import com.payroll.portal.PortalNotificationRepository
import jakarta.servlet.http.HttpServletResponse
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

@Service
@Transactional(readOnly = true)
class PayrollRunService(
    private val payrollRunRepository: PayrollRunRepository,
    private val companyRepository: CompanyRepository,
    private val employeeRepository: EmployeeRepository,
    private val payrollSlipRepository: PayrollSlipRepository,
    private val payrollItemRepository: PayrollItemRepository,
    private val payrollCalculationService: PayrollCalculationService,
    private val employeeService: EmployeeService,
    private val portalNotificationRepository: PortalNotificationRepository
) {

    fun getByCompany(companyId: UUID): List<PayrollRunResponse> {
        val company = companyRepository.findById(companyId)
            .orElseThrow { NoSuchElementException("고객사를 찾을 수 없습니다. id=$companyId") }
        return payrollRunRepository.findByCompanyOrderByPayrollYearDescPayrollMonthDesc(company)
            .map { PayrollRunResponse.from(it) }
    }

    fun getById(companyId: UUID, payrollRunId: UUID): PayrollRunResponse {
        val run = payrollRunRepository.findById(payrollRunId)
            .orElseThrow { NoSuchElementException("급여실행을 찾을 수 없습니다. id=$payrollRunId") }
        if (run.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")
        return PayrollRunResponse.from(run)
    }

    @Transactional
    fun create(companyId: UUID, request: PayrollRunCreateRequest): PayrollRunResponse {
        val company = companyRepository.findById(companyId)
            .orElseThrow { NoSuchElementException("고객사를 찾을 수 없습니다. id=$companyId") }
        if (payrollRunRepository.existsByCompanyAndPayrollYearAndPayrollMonth(company, request.payrollYear, request.payrollMonth)) {
            throw IllegalArgumentException("${request.payrollYear}년 ${request.payrollMonth}월 급여실행이 이미 존재합니다.")
        }
        if (request.payrollYear < 2000 || request.payrollYear > LocalDate.now().year + 1)
            throw IllegalArgumentException("급여 연도(${request.payrollYear})가 올바르지 않습니다.")
        if (request.payDate.isBefore(LocalDate.now()))
            throw IllegalArgumentException("지급일(${request.payDate})은 오늘 이전 날짜로 설정할 수 없습니다.")
        val run = PayrollRun(
            company = company,
            runName = request.runName,
            payrollYear = request.payrollYear,
            payrollMonth = request.payrollMonth,
            payDate = request.payDate
        )
        return PayrollRunResponse.from(payrollRunRepository.save(run))
    }

    @Transactional
    fun calculate(companyId: UUID, payrollRunId: UUID): List<PayrollSlipSummary> {
        val run = payrollRunRepository.findById(payrollRunId)
            .orElseThrow { NoSuchElementException("급여실행을 찾을 수 없습니다. id=$payrollRunId") }
        if (run.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")
        if (run.status !in listOf("DRAFT", "CALCULATED")) {
            throw IllegalArgumentException("계산할 수 없는 상태입니다: ${run.status}")
        }

        // 기존 계산 결과 초기화 (FK 순서 준수: 알림 → 항목 → 슬립)
        payrollSlipRepository.findByPayrollRun(run).forEach { slip ->
            portalNotificationRepository.deleteByPayrollSlip_PayrollSlipId(slip.payrollSlipId)
            payrollItemRepository.deleteByPayrollSlip(slip)
            payrollSlipRepository.delete(slip)
        }

        // 재직 중인 직원 전체 계산
        val employees = employeeRepository.findByCompanyAndStatus(run.company, "ACTIVE")
        val slips = employees.map { employee ->
            payrollCalculationService.calculateForEmployee(run, employee)
        }

        run.status = "CALCULATED"

        return slips.map { slip ->
            PayrollSlipSummary(
                payrollSlipId = slip.payrollSlipId,
                employeeId = slip.employee.employeeId,
                employeeNo = slip.employee.employeeNo,
                fullName = slip.employee.fullName,
                gradeName = slip.employee.jobGrade.gradeName,
                grossAmount = slip.grossAmount,
                deductionAmount = slip.deductionAmount,
                netAmount = slip.netAmount,
                deliveryStatus = slip.deliveryStatus
            )
        }
    }

    @Transactional
    fun approve(companyId: UUID, payrollRunId: UUID): PayrollRunResponse {
        val run = payrollRunRepository.findById(payrollRunId)
            .orElseThrow { NoSuchElementException("급여실행을 찾을 수 없습니다. id=$payrollRunId") }
        if (run.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")
        if (run.status != "CALCULATED") throw IllegalArgumentException("계산 완료 상태에서만 승인할 수 있습니다.")
        run.status = "APPROVED"
        return PayrollRunResponse.from(run)
    }

    @Transactional
    fun markAsPaid(companyId: UUID, payrollRunId: UUID): PayrollRunResponse {
        val run = payrollRunRepository.findById(payrollRunId)
            .orElseThrow { NoSuchElementException("급여실행을 찾을 수 없습니다. id=$payrollRunId") }
        if (run.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")
        if (run.status != "APPROVED") throw IllegalArgumentException("승인 완료 상태에서만 지급 처리할 수 있습니다.")
        run.status = "PAID"
        return PayrollRunResponse.from(run)
    }

    @Transactional
    fun update(companyId: UUID, payrollRunId: UUID, request: PayrollRunUpdateRequest): PayrollRunResponse {
        val run = payrollRunRepository.findById(payrollRunId)
            .orElseThrow { NoSuchElementException("급여실행을 찾을 수 없습니다. id=$payrollRunId") }
        if (run.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")
        if (run.status != "DRAFT") throw IllegalArgumentException("초안 상태의 급여 실행만 수정할 수 있습니다.")
        run.runName = request.runName
        run.payDate = request.payDate
        return PayrollRunResponse.from(run)
    }

    @Transactional
    fun delete(companyId: UUID, payrollRunId: UUID) {
        val run = payrollRunRepository.findById(payrollRunId)
            .orElseThrow { NoSuchElementException("급여실행을 찾을 수 없습니다. id=$payrollRunId") }
        if (run.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")
        if (run.status != "DRAFT") throw IllegalArgumentException("초안 상태의 급여 실행만 삭제할 수 있습니다.")
        payrollSlipRepository.findByPayrollRun(run).forEach { payrollSlipRepository.delete(it) }
        payrollRunRepository.delete(run)
    }

    @Transactional
    fun reset(companyId: UUID, payrollRunId: UUID): PayrollRunResponse {
        val run = payrollRunRepository.findById(payrollRunId)
            .orElseThrow { NoSuchElementException("급여실행을 찾을 수 없습니다. id=$payrollRunId") }
        if (run.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")
        val slips = payrollSlipRepository.findByPayrollRun(run)
        slips.forEach { slip ->
            portalNotificationRepository.deleteByPayrollSlip_PayrollSlipId(slip.payrollSlipId)
            payrollItemRepository.deleteByPayrollSlip(slip)
            payrollSlipRepository.delete(slip)
        }
        run.status = "DRAFT"
        return PayrollRunResponse.from(run)
    }

    fun writeTransferFile(companyId: UUID, payrollRunId: UUID, response: HttpServletResponse) {
        val run = payrollRunRepository.findById(payrollRunId)
            .orElseThrow { NoSuchElementException("급여실행을 찾을 수 없습니다. id=$payrollRunId") }
        if (run.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")
        if (run.status !in listOf("APPROVED", "PAID"))
            throw IllegalArgumentException("승인 또는 지급 완료 상태에서만 이체 파일을 생성할 수 있습니다.")

        val slips = payrollSlipRepository.findByPayrollRun(run)
        val filename = "transfer_${run.payrollYear}${run.payrollMonth.toString().padStart(2,'0')}.csv"

        response.contentType = "text/csv;charset=UTF-8"
        response.setHeader("Content-Disposition", "attachment; filename=\"$filename\"")

        val bom = "﻿"
        val header = "사번,성명,부서,직급,실수령액,지급일\r\n"
        val rows = slips.joinToString("") { slip ->
            "${slip.employee.employeeNo},${slip.employee.fullName},${slip.employee.orgUnit.orgUnitName}," +
            "${slip.employee.jobGrade.gradeName},${slip.netAmount},${run.payDate}\r\n"
        }
        val total = slips.fold(BigDecimal.ZERO) { acc, s -> acc + s.netAmount }
        val footer = "합계,,,,${total},\r\n"

        response.writer.use { it.write(bom + header + rows + footer) }
    }

    @Transactional
    fun stepIncrement(companyId: UUID, request: StepIncrementRequest): StepIncrementResult =
        employeeService.stepIncrement(companyId, request)
}
