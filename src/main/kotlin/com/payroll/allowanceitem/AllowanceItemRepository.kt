package com.payroll.allowanceitem

import com.payroll.company.Company
import org.springframework.data.jpa.repository.JpaRepository
import java.util.Optional
import java.util.UUID

interface AllowanceItemRepository : JpaRepository<AllowanceItem, UUID> {

    fun findByCompanyAndIsActiveOrderBySortOrder(
        company: Company,
        isActive: Boolean
    ): List<AllowanceItem>

    fun findByCompanyAndItemCode(
        company: Company,
        itemCode: String
    ): Optional<AllowanceItem>

    fun findByCompanyOrderBySortOrder(company: Company): List<AllowanceItem>
}
