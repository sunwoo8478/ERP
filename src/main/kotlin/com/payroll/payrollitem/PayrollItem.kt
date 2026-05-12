package com.payroll.payrollitem

import com.payroll.payrollslip.PayrollSlip
import jakarta.persistence.*
import java.math.BigDecimal
import java.util.UUID

@Entity
@Table(name = "급여항목")
class PayrollItem(
    @Id
    @Column(name = "payroll_item_id", columnDefinition = "uuid")
    val payrollItemId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payroll_slip_id", nullable = false)
    val payrollSlip: PayrollSlip,

    // EARNING(지급) / DEDUCTION(공제)
    @Column(name = "item_type", nullable = false, length = 20)
    var itemType: String,

    @Column(name = "item_name", nullable = false, length = 100)
    var itemName: String,

    @Column(name = "is_taxable", nullable = false)
    var isTaxable: Boolean = true,

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    var amount: BigDecimal
)
