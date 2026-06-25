package com.mmap.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Utility class xử lý toàn bộ JWT logic.
 * Dùng jjwt 0.12.x — API mới (Jwts.parser() thay Jwts.parserBuilder()).
 */
@Component
@Slf4j
public class JwtUtil {

    private final SecretKey secretKey;
    private final long expirationMs;
    private final long refreshExpirationMs;

    public JwtUtil(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-ms}") long expirationMs,
            @Value("${jwt.refresh-expiration-ms}") long refreshExpirationMs
    ) {
        // Tạo HMAC-SHA256 key từ secret string
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
        this.refreshExpirationMs = refreshExpirationMs;
    }

    // ── Generate ────────────────────────────────────────────────────────

    /** Tạo Access Token (24h) — subject = email */
    public String generateAccessToken(String email) {
        return buildToken(email, expirationMs);
    }

    /** Tạo Refresh Token (7 ngày) */
    public String generateRefreshToken(String email) {
        return buildToken(email, refreshExpirationMs);
    }

    private String buildToken(String subject, long expMs) {
        Date now    = new Date();
        Date expiry = new Date(now.getTime() + expMs);

        return Jwts.builder()
                .subject(subject)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)          // jjwt 0.12: tự detect algorithm từ key
                .compact();
    }

    // ── Parse & Validate ────────────────────────────────────────────────

    /** Lấy email (subject) từ token. Throw exception nếu token không hợp lệ. */
    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    /** Kiểm tra token còn hợp lệ không (chưa hết hạn + đúng chữ ký). */
    public boolean isTokenValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("JWT validation failed: {}", e.getMessage());
            return false;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)        // jjwt 0.12: verifyWith thay vì setSigningKey
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
