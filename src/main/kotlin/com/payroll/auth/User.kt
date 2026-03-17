package com.payroll.auth

import jakarta.persistence.*

@Entity
@Table(name = "erp사용자")
class User(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,
    @Column(unique = true, nullable = false, length = 50)
    var username: String,
    @Column(nullable = false, length = 200)
    var password: String,
    @Column(name = "full_name", nullable = false, length = 100)
    var fullName: String,
    @Column(nullable = false, length = 20)
    var role: String = "ADMIN",
    @Column(nullable = false)
    var enabled: Boolean = true
)
