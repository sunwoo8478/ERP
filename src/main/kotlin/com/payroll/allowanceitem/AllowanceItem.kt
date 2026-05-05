package com.payroll.allowanceitem

import com.payroll.company.Company
import jakarta.persistence.*
import java.math.BigDecimal
import java.util.UUID

@Entity
@Table(name = "수당마스터",
    uniqueConstraints = [UniqueConstraint(columnNames = ["company_id", "item_code"])]
)
class AllowanceItem(
    @Id
    @Column(name = "allowance_item_id", columnDefinition = "uuid")
    val allowanceItemId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    val company: Company,

    @Column(name = "item_code", nullable = false, length = 50)
    var itemCode: String,

    @Column(name = "item_name", nullable = false, length = 100)
    var itemName: String,

    @Column(name = "item_type", nullable = false, length = 20)
    var itemType: String = "EARNING",

    @Column(name = "is_taxable", nullable = false)
    var isTaxable: Boolean = true,

    @Column(name = "is_non_taxable_with_limit", nullable = false)
    var isNonTaxableWithLimit: Boolean = false,

    @Column(name = "non_taxable_limit", precision = 15, scale = 2)
    var nonTaxableLimit: BigDecimal? = null,

    @Column(name = "default_amount", nullable = false, precision = 15, scale = 2)
    var defaultAmount: BigDecimal = BigDecimal.ZERO,

    @Column(name = "is_active", nullable = false)
    var isActive: Boolean = true,

    @Column(name = "sort_order", nullable = false)
    var sortOrder: Int = 0
)
