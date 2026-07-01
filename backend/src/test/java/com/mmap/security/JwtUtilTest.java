package com.mmap.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class JwtUtilTest {

    private JwtUtil jwtUtil;
    private final String testSecret = "my_super_secret_key_which_must_be_at_least_256_bits_long_so_i_make_it_longer";

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil(testSecret, 3600000L, 604800000L);
    }

    @Test
    void generateAndValidateAccessToken() {
        String email = "test@example.com";
        String token = jwtUtil.generateAccessToken(email);

        assertNotNull(token);
        assertTrue(jwtUtil.isTokenValid(token));
        assertEquals(email, jwtUtil.extractEmail(token));
    }

    @Test
    void generateAndValidateRefreshToken() {
        String email = "test@example.com";
        String token = jwtUtil.generateRefreshToken(email);

        assertNotNull(token);
        assertTrue(jwtUtil.isTokenValid(token));
        assertEquals(email, jwtUtil.extractEmail(token));
    }

    @Test
    void validateToken_InvalidSignature_ReturnsFalse() {
        String email = "test@example.com";
        String token = jwtUtil.generateAccessToken(email);

        String invalidToken = token + "modified";

        assertFalse(jwtUtil.isTokenValid(invalidToken));
    }

    @Test
    void extractEmail_InvalidToken_ThrowsException() {
        String invalidToken = "invalid.token.here";

        assertThrows(Exception.class, () -> jwtUtil.extractEmail(invalidToken));
    }
}
