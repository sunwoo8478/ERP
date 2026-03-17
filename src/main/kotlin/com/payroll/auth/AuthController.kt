package com.payroll.auth

import com.payroll.common.ApiResponse
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.web.bind.annotation.*
import java.time.LocalDateTime

data class LoginRequest(val username: String, val password: String)
data class LoginResponse(val token: String, val fullName: String, val role: String, val expiresAt: LocalDateTime)

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val userRepository: UserRepository,
    private val jwtTokenProvider: JwtTokenProvider,
    private val passwordEncoder: PasswordEncoder
) {
    @PostMapping("/login")
    fun login(@RequestBody req: LoginRequest): ApiResponse<LoginResponse> {
        val user = userRepository.findByUsername(req.username)
            .orElseThrow { IllegalArgumentException("아이디 또는 비밀번호가 올바르지 않습니다.") }
        if (!user.enabled) throw IllegalArgumentException("비활성화된 계정입니다.")
        if (!passwordEncoder.matches(req.password, user.password))
            throw IllegalArgumentException("아이디 또는 비밀번호가 올바르지 않습니다.")
        val token = jwtTokenProvider.generateToken(user.username)
        return ApiResponse.ok(
            LoginResponse(token, user.fullName, user.role, LocalDateTime.now().plusDays(1)),
            "로그인 성공"
        )
    }

    @GetMapping("/me")
    fun me(@RequestHeader("Authorization") header: String): ApiResponse<Map<String, String>> {
        val token = header.removePrefix("Bearer ")
        val username = jwtTokenProvider.getUsername(token)
        val user = userRepository.findByUsername(username)
            .orElseThrow { NoSuchElementException("사용자 없음") }
        return ApiResponse.ok(mapOf("username" to user.username, "fullName" to user.fullName, "role" to user.role))
    }
}
