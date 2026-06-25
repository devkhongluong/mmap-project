package com.mmap.dto.response;

/**
 * Response body cho /api/auth/login và /api/auth/register
 */
public record AuthResponse(
        String accessToken,
        String tokenType,    // Luôn là "Bearer"
        long   expiresIn,    // Số giây còn hiệu lực
        String email,
        String username
) {
    /** Factory method tiện dụng */
    public static AuthResponse of(String token, long expiresInMs,
                                   String email, String username) {
        return new AuthResponse(token, "Bearer", expiresInMs / 1000, email, username);
    }
}
