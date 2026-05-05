package com.payroll.allowanceitem

import java.math.BigDecimal
import java.util.UUID

data class AllowanceItemCreateRequest(
    val itemCode: String,
    val itemName: String,
    val itemType: String = "EARNING",
    val isTaxable: Boolean = true,
    val isNonTaxableWithLimit: Boolean = false,
    val nonTaxableLimit: BigDecimal? = null,
    val defaultAmount: BigDecimal = BigDecimal.ZERO,
    val isActive: Boolean = true,
    val sortOrder: Int = 0
)

data class AllowanceItemUpdateRequest(
    val itemName: String? = null,
    val itemType: String? = null,
    val isTaxable: Boolean? = null,
    val isNonTaxableWithLimit: Boolean? = null,
    val nonTaxableLimit: BigDecimal? = null,
    val defaultAmount: BigDecimal? = null,
    val isActive: Boolean? = null,
    val sortOrder: Int? = null
)

data class AllowanceItemResponse(
    val allowanceItemId: UUID,
    val companyId: UUID,
    val itemCode: String,
    val itemName: String,
    val itemType: String,
    val isTaxable: Boolean,
    val isNonTaxableWithLimit: Boolean,
    val nonTaxableLimit: BigDecimal?,
    val defaultAmount: BigDecimal,
    val isActive: Boolean,
    val sortOrder: Int
) {
    companion object {
        fun from(entity: AllowanceItem) = AllowanceItemResponse(
            allowanceItemId = entity.allowanceItemId,
            companyId = entity.company.companyId,
            itemCode = entity.itemCode,
            itemName = entity.itemName,
            itemType = entity.itemType,
            isTaxable = entity.isTaxable,
            isNonTaxableWithLimit = entity.isNonTaxableWithLimit,
            nonTaxableLimit = entity.nonTaxableLimit,
            defaultAmount = entity.defaultAmount,
            isActive = entity.isActive,
            sortOrder = entity.sortOrder
        )
    }
}
