package com.mmap.service;

import com.mmap.dto.request.LoginRequest;
import com.mmap.dto.request.RegisterRequest;
import com.mmap.dto.response.AuthResponse;
import com.mmap.entity.User;
import com.mmap.exception.BusinessException;
import com.mmap.repository.UserRepository;
import com.mmap.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service xử lý nghiệp vụ Authentication:
 *  - Đăng ký tài khoản mới
 *  - Đăng nhập + phát JWT
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository        userRepository;
    private final PasswordEncoder       passwordEncoder;
    private final JwtUtil               jwtUtil;
    private final AuthenticationManager authManager;

    @Value("${jwt.expiration-ms}")
    private long expirationMs;

    // ── Register ────────────────────────────────────────────────────────

    /**
     * Đăng ký tài khoản mới.
     * Validate email/username chưa tồn tại → hash password → lưu DB → trả JWT.
     */
    @Transactional
    public AuthResponse register(RegisterRequest req) {

        if (userRepository.existsByEmail(req.email())) {
            throw new BusinessException("Email đã được đăng ký. Vui lòng dùng email khác.");
        }
        if (userRepository.existsByUsername(req.username())) {
            throw new BusinessException("Username đã tồn tại. Vui lòng chọn username khác.");
        }

        User user = User.builder()
                .email(req.email())
                .username(req.username())
                .passwordHash(passwordEncoder.encode(req.password()))
                .build();

        userRepository.save(user);
        log.info("User mới đã đăng ký: {}", req.email());

        String token = jwtUtil.generateAccessToken(user.getEmail());
        return AuthResponse.of(token, expirationMs, user.getEmail(), user.getUsername());
    }

    // ── Login ────────────────────────────────────────────────────────────

    /**
     * Đăng nhập — xác thực qua AuthenticationManager (Spring Security).
     * Nếu sai email/password → AuthenticationException → 401.
     */
    public AuthResponse login(LoginRequest req) {
        try {
            // AuthenticationManager tự gọi UserDetailsServiceImpl + BCrypt verify
            authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.email(), req.password())
            );
        } catch (BadCredentialsException e) {
            throw new BusinessException("Email hoặc mật khẩu không đúng.");
        }

        User user = userRepository.findByEmail(req.email())
                .orElseThrow(() -> new BusinessException("Tài khoản không tồn tại."));

        log.info("User đăng nhập: {}", req.email());
        String token = jwtUtil.generateAccessToken(user.getEmail());
        return AuthResponse.of(token, expirationMs, user.getEmail(), user.getUsername());
    }
}
