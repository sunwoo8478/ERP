package com.payroll.attendance

import com.payroll.company.CompanyRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class LeaveTypeService(
    private val leaveTypeRepository: LeaveTypeRepository,
    private val companyRepository: CompanyRepository
) {

    fun getLeaveTypes(companyId: UUID): List<LeaveTypeResponse> =
        leaveTypeRepository.findByCompany_CompanyIdOrderBySortOrderAsc(companyId)
            .map { it.toResponse() }

    fun getLeaveType(leaveTypeId: UUID): LeaveTypeResponse =
        leaveTypeRepository.findByIdOrNull(leaveTypeId)?.toResponse()
            ?: throw NoSuchElementException("LeaveType not found: $leaveTypeId")

    @Transactional
    fun createLeaveType(companyId: UUID, request: LeaveTypeCreateRequest): LeaveTypeResponse {
        val company = companyRepository.findByIdOrNull(companyId)
            ?: throw NoSuchElementException("Company not found: $companyId")
        val entity = LeaveType(
            company = company,
            typeName = request.typeName,
            isPaid = request.isPaid,
            maxDaysPerYear = request.maxDaysPerYear,
            sortOrder = request.sortOrder
        )
        return leaveTypeRepository.save(entity).toResponse()
    }

    @Transactional
    fun updateLeaveType(leaveTypeId: UUID, request: LeaveTypeUpdateRequest): LeaveTypeResponse {
        val entity = leaveTypeRepository.findByIdOrNull(leaveTypeId)
            ?: throw NoSuchElementException("LeaveType not found: $leaveTypeId")
        request.typeName?.let { entity.typeName = it }
        request.isPaid?.let { entity.isPaid = it }
        entity.maxDaysPerYear = request.maxDaysPerYear
        request.sortOrder?.let { entity.sortOrder = it }
        return leaveTypeRepository.save(entity).toResponse()
    }

    @Transactional
    fun deleteLeaveType(leaveTypeId: UUID) {
        if (!leaveTypeRepository.existsById(leaveTypeId))
            throw NoSuchElementException("LeaveType not found: $leaveTypeId")
        leaveTypeRepository.deleteById(leaveTypeId)
    }
}
