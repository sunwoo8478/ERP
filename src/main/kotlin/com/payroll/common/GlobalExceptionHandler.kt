package com.payroll.common

import org.springframework.http.HttpStatus
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.servlet.resource.NoResourceFoundException

@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(NoSuchElementException::class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    fun handleNotFound(e: NoSuchElementException) =
        ApiResponse.fail<Nothing>(e.message ?: "리소스를 찾을 수 없습니다.")

    @ExceptionHandler(IllegalArgumentException::class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    fun handleBadRequest(e: IllegalArgumentException) =
        ApiResponse.fail<Nothing>(e.message ?: "잘못된 요청입니다.")

    @ExceptionHandler(MethodArgumentNotValidException::class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    fun handleValidation(e: MethodArgumentNotValidException): ApiResponse<Nothing> {
        val message = e.bindingResult.fieldErrors.joinToString(", ") {
            "${it.field}: ${it.defaultMessage}"
        }
        return ApiResponse.fail(message)
    }

    // 정적 리소스 없음 → 404 그대로 반환 (Spring이 처리하도록 위임)
    @ExceptionHandler(NoResourceFoundException::class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    fun handleNoResource(e: NoResourceFoundException) =
        ApiResponse.fail<Nothing>("리소스를 찾을 수 없습니다: ${e.resourcePath}")

    @ExceptionHandler(Exception::class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    fun handleGeneral(e: Exception): ApiResponse<Nothing> {
        // NoResourceFoundException은 위에서 처리됨 — 여기선 진짜 서버 오류만
        return ApiResponse.fail("서버 오류: ${e.message}")
    }
}
