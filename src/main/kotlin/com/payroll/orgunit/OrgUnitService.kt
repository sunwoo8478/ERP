package com.payroll.orgunit

import com.payroll.company.CompanyRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class OrgUnitService(
    private val orgUnitRepository: OrgUnitRepository,
    private val companyRepository: CompanyRepository
) {

    fun getByCompany(companyId: UUID): List<OrgUnitResponse> {
        val company = companyRepository.findById(companyId)
            .orElseThrow { NoSuchElementException("고객사를 찾을 수 없습니다. id=$companyId") }
        return orgUnitRepository.findByCompany(company).map { OrgUnitResponse.from(it) }
    }

    fun getById(companyId: UUID, orgUnitId: UUID): OrgUnitResponse {
        val orgUnit = orgUnitRepository.findById(orgUnitId)
            .orElseThrow { NoSuchElementException("조직단위를 찾을 수 없습니다. id=$orgUnitId") }
        if (orgUnit.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")
        return OrgUnitResponse.from(orgUnit)
    }

    @Transactional
    fun create(companyId: UUID, request: OrgUnitCreateRequest): OrgUnitResponse {
        val company = companyRepository.findById(companyId)
            .orElseThrow { NoSuchElementException("고객사를 찾을 수 없습니다. id=$companyId") }
        val parent = request.parentOrgUnitId?.let {
            orgUnitRepository.findById(it)
                .orElseThrow { NoSuchElementException("상위 조직단위를 찾을 수 없습니다. id=$it") }
        }
        val orgUnit = OrgUnit(
            company = company,
            parentOrgUnit = parent,
            orgUnitName = request.orgUnitName
        )
        return OrgUnitResponse.from(orgUnitRepository.save(orgUnit))
    }

    @Transactional
    fun update(companyId: UUID, orgUnitId: UUID, request: OrgUnitUpdateRequest): OrgUnitResponse {
        val orgUnit = orgUnitRepository.findById(orgUnitId)
            .orElseThrow { NoSuchElementException("조직단위를 찾을 수 없습니다. id=$orgUnitId") }
        if (orgUnit.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")
        val parent = request.parentOrgUnitId?.let {
            orgUnitRepository.findById(it)
                .orElseThrow { NoSuchElementException("상위 조직단위를 찾을 수 없습니다. id=$it") }
        }
        orgUnit.orgUnitName = request.orgUnitName
        orgUnit.parentOrgUnit = parent
        orgUnit.activeFlag = request.activeFlag
        return OrgUnitResponse.from(orgUnit)
    }

    @Transactional
    fun delete(companyId: UUID, orgUnitId: UUID) {
        val orgUnit = orgUnitRepository.findById(orgUnitId)
            .orElseThrow { NoSuchElementException("조직단위를 찾을 수 없습니다. id=$orgUnitId") }
        if (orgUnit.company.companyId != companyId) throw IllegalArgumentException("접근 권한이 없습니다.")
        orgUnitRepository.delete(orgUnit)
    }
}
