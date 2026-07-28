package com.mmap.config;

import com.mmap.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.mmap.security.UserDetailsServiceImpl;

/**
 * Spring Security 6 configuration — Stateless JWT.
 *
 * Nguyên tắc:
 *  - Session: STATELESS (không dùng HttpSession, JWT đảm nhiệm)
 *  - CSRF: Disabled (API REST + JWT không cần CSRF)
 *  - Public routes: /api/auth/** + OPTIONS (preflight)
 *  - Protected: tất cả routes còn lại cần JWT hợp lệ
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final UserDetailsServiceImpl userDetailsService;
    private final JwtAuthFilter          jwtAuthFilter;

    // ── Public endpoints (không cần JWT) ────────────────────────────────
    private static final String[] PUBLIC_ROUTES = {
            "/api/auth/**",             // Login, Register
            "/actuator/health",         // Health check cho Render.com
            "/api/ping",                // Keep-alive ping — UptimeRobot + frontend
    };


    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                // 1. Tắt CSRF — không cần với Stateless REST API
                .csrf(AbstractHttpConfigurer::disable)

                // 2. Session management: STATELESS
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // 3. Authorization rules
                .authorizeHttpRequests(auth -> auth
                        // Cho phép preflight CORS request (OPTIONS)
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Public routes
                        .requestMatchers(PUBLIC_ROUTES).permitAll()
                        // Tất cả routes khác phải có JWT
                        .anyRequest().authenticated()
                )

                // 4. AuthenticationProvider
                .authenticationProvider(authenticationProvider())

                // 5. Thêm JwtAuthFilter trước UsernamePasswordAuthenticationFilter
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)

                .build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    /**
     * BCrypt với strength 12 — cân bằng giữa bảo mật và hiệu năng.
     * Strength 12 ≈ ~250ms/hash trên server trung bình (chấp nhận được).
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
