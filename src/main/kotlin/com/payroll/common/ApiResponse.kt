package com.payroll.common

data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val message: String? = null
) {
    companion object {
        fun <T> ok(data: T) = ApiResponse(success = true, data = data)
        fun <T> ok(data: T, message: String) = ApiResponse(success = true, data = data, message = message)
        fun <T> fail(message: String) = ApiResponse<T>(success = false, message = message)
    }
}
