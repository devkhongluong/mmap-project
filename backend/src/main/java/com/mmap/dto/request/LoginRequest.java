package com.mmap.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Request body cho POST /api/auth/login
 */
public record LoginRequest(

        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        String email,

        @NotBlank(message = "Password không được để trống")
        String password
) {}
