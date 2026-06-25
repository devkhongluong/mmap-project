package com.mmap.controller;

import com.mmap.dto.request.LoginRequest;
import com.mmap.dto.request.RegisterRequest;
import com.mmap.dto.response.AuthResponse;
import com.mmap.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller xử lý Đăng ký / Đăng nhập.
 *
 * PUBLIC — không cần JWT (configured trong SecurityConfig).
 *
 * Endpoints:
 *  POST /api/auth/register  → Tạo tài khoản mới
 *  POST /api/auth/login     → Đăng nhập, nhận JWT
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * Đăng ký tài khoản mới.
     * @return 201 Created + JWT token
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        AuthResponse response = authService.register(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Đăng nhập.
     * @return 200 OK + JWT token
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }
}
