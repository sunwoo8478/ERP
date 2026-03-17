package com.payroll.auth

import org.springframework.boot.ApplicationRunner
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.crypto.password.PasswordEncoder

@Configuration
class DataInitializer(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder
) {
    @Bean
    fun initAdminUser() = ApplicationRunner {
        if (userRepository.findByUsername("admin").isEmpty) {
            userRepository.save(User(
                username = "admin",
                password = passwordEncoder.encode("admin123"),
                fullName = "시스템 관리자",
                role = "ADMIN"
            ))
        }
    }
}
