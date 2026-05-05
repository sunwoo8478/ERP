package com.payroll.allowanceitem

import com.payroll.company.CompanyRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.util.UUID

@Service
@Transactional(readOnly = true)
class AllowanceItemService(
    private val allowanceItemRepository: AllowanceItemRepository,
    private val companyRepository: CompanyRepository
) {

    fun getByCompany(companyId: UUID): List<AllowanceItemResponse> {
        val company = companyRepository.findById(companyId)
            .orElseThrow { NoSuchElementException("Company not found: $companyId") }
        return allowanceItemRepository.findByCompanyAndIsActiveOrderBySortOrder(company, true)
            .map { AllowanceItemResponse.from(it) }
    }

    @Transactional
    fun create(companyId: UUID, request: AllowanceItemCreateRequest): AllowanceItemResponse {
        val company = companyRepository.findById(companyId)
            .orElseThrow { NoSuchElementException("Company not found: $companyId") }

        allowanceItemRepository.findByCompanyAndItemCode(company, request.itemCode).ifPresent {
            throw IllegalArgumentException("Item code already exists: ${request.itemCode}")
        }

        val entity = AllowanceItem(
            company = company,
            itemCode = request.itemCode,
            itemName = request.itemName,
            itemType = request.itemType,
            isTaxable = request.isTaxable,
            isNonTaxableWithLimit = request.isNonTaxableWithLimit,
            nonTaxableLimit = request.nonTaxableLimit,
            defaultAmount = request.defaultAmount,
            isActive = request.isActive,
            sortOrder = request.sortOrder
        )
        return AllowanceItemResponse.from(allowanceItemRepository.save(entity))
    }

    @Transactional
    fun update(companyId: UUID, itemId: UUID, request: AllowanceItemUpdateRequest): AllowanceItemResponse {
        val entity = allowanceItemRepository.findById(itemId)
            .orElseThrow { NoSuchElementException("AllowanceItem not found: $itemId") }

        if (entity.company.companyId != companyId) {
            throw IllegalArgumentException("Item does not belong to company: $companyId")
        }

        request.itemName?.let { entity.itemName = it }
        request.itemType?.let { entity.itemType = it }
        request.isTaxable?.let { entity.isTaxable = it }
        request.isNonTaxableWithLimit?.let { entity.isNonTaxableWithLimit = it }
        request.nonTaxableLimit?.let { entity.nonTaxableLimit = it }
        request.defaultAmount?.let { entity.defaultAmount = it }
        request.isActive?.let { entity.isActive = it }
        request.sortOrder?.let { entity.sortOrder = it }

        return AllowanceItemResponse.from(allowanceItemRepository.save(entity))
    }

    @Transactional
    fun delete(companyId: UUID, itemId: UUID) {
        val entity = allowanceItemRepository.findById(itemId)
            .orElseThrow { NoSuchElementException("AllowanceItem not found: $itemId") }

        if (entity.company.companyId != companyId) {
            throw IllegalArgumentException("Item does not belong to company: $companyId")
        }

        entity.isActive = false
        allowanceItemRepository.save(entity)
    }

    @Transactional
    fun initDefaults(companyId: UUID): List<AllowanceItemResponse> {
        val company = companyRepository.findById(companyId)
            .orElseThrow { NoSuchElementException("Company not found: $companyId") }

        data class DefaultItem(
            val itemCode: String,
            val itemName: String,
            val itemType: String,
            val isTaxable: Boolean,
            val isNonTaxableWithLimit: Boolean,
            val nonTaxableLimit: BigDecimal?,
            val defaultAmount: BigDecimal,
            val sortOrder: Int
        )

        val defaults = listOf(
            DefaultItem("BASIC", "기본급", "EARNING", true, false, null, BigDecimal.ZERO, 1),
            DefaultItem("MEAL", "식대", "EARNING", false, true, BigDecimal("200000"), BigDecimal.ZERO, 2),
            DefaultItem("TRANSPORT", "교통비", "EARNING", false, true, BigDecimal("200000"), BigDecimal.ZERO, 3),
            DefaultItem("POSITION", "직책수당", "EARNING", true, false, null, BigDecimal.ZERO, 4)
        )

        val results = mutableListOf<AllowanceItemResponse>()
        for (d in defaults) {
            val existing = allowanceItemRepository.findByCompanyAndItemCode(company, d.itemCode)
            if (existing.isEmpty) {
                val entity = AllowanceItem(
                    company = company,
                    itemCode = d.itemCode,
                    itemName = d.itemName,
                    itemType = d.itemType,
                    isTaxable = d.isTaxable,
                    isNonTaxableWithLimit = d.isNonTaxableWithLimit,
                    nonTaxableLimit = d.nonTaxableLimit,
                    defaultAmount = d.defaultAmount,
                    isActive = true,
                    sortOrder = d.sortOrder
                )
                results.add(AllowanceItemResponse.from(allowanceItemRepository.save(entity)))
            } else {
                results.add(AllowanceItemResponse.from(existing.get()))
            }
        }
        return results
    }
}
