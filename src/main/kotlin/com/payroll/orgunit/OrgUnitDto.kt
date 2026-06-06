package com.payroll.orgunit

import jakarta.validation.constraints.NotBlank
import java.util.UUID

data class OrgUnitCreateRequest(
    @field:NotBlank(message = "조직단위명은 필수입니다.")
    val orgUnitName: String,
    val parentOrgUnitId: UUID? = null
)

data class OrgUnitUpdateRequest(
    @field:NotBlank(message = "조직단위명은 필수입니다.")
    val orgUnitName: String,
    val parentOrgUnitId: UUID? = null,
    val activeFlag: Boolean = true
)

data class OrgUnitResponse(
    val orgUnitId: UUID,
    val companyId: UUID,
    val orgUnitName: String,
    val parentOrgUnitId: UUID?,
    val activeFlag: Boolean
) {
    companion object {
        fun from(orgUnit: OrgUnit) = OrgUnitResponse(
            orgUnitId = orgUnit.orgUnitId,
            companyId = orgUnit.company.companyId,
            orgUnitName = orgUnit.orgUnitName,
            parentOrgUnitId = orgUnit.parentOrgUnit?.orgUnitId,
            activeFlag = orgUnit.activeFlag
        )
    }
}
