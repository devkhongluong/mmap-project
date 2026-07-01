package com.mmap.service;

import com.mmap.dto.request.LoginRequest;
import com.mmap.dto.request.RegisterRequest;
import com.mmap.dto.response.AuthResponse;
import com.mmap.entity.User;
import com.mmap.exception.BusinessException;
import com.mmap.repository.UserRepository;
import com.mmap.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtUtil jwtUtil;
    @Mock private AuthenticationManager authManager;

    @InjectMocks
    private AuthService authService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "expirationMs", 3600000L);
    }

    @Test
    void register_Success() {
        // Arrange
        RegisterRequest req = new RegisterRequest("test@test.com", "testuser", "password123");
        when(userRepository.existsByEmail(req.email())).thenReturn(false);
        when(userRepository.existsByUsername(req.username())).thenReturn(false);
        when(passwordEncoder.encode(req.password())).thenReturn("hashed_pw");
        when(jwtUtil.generateAccessToken(req.email())).thenReturn("jwt_token");

        // Act
        AuthResponse response = authService.register(req);

        // Assert
        assertNotNull(response);
        assertEquals("jwt_token", response.accessToken());
        assertEquals("test@test.com", response.email());
        assertEquals("testuser", response.username());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_EmailAlreadyExists_ThrowsException() {
        // Arrange
        RegisterRequest req = new RegisterRequest("test@test.com", "testuser", "password123");
        when(userRepository.existsByEmail(req.email())).thenReturn(true);

        // Act & Assert
        BusinessException ex = assertThrows(BusinessException.class, () -> authService.register(req));
        assertTrue(ex.getMessage().contains("Email đã được đăng ký"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_UsernameAlreadyExists_ThrowsException() {
        // Arrange
        RegisterRequest req = new RegisterRequest("test@test.com", "testuser", "password123");
        when(userRepository.existsByEmail(req.email())).thenReturn(false);
        when(userRepository.existsByUsername(req.username())).thenReturn(true);

        // Act & Assert
        BusinessException ex = assertThrows(BusinessException.class, () -> authService.register(req));
        assertTrue(ex.getMessage().contains("Username đã tồn tại"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void login_Success() {
        // Arrange
        LoginRequest req = new LoginRequest("test@test.com", "password123");
        User mockUser = User.builder().email("test@test.com").username("testuser").build();
        when(userRepository.findByEmail(req.email())).thenReturn(Optional.of(mockUser));
        when(jwtUtil.generateAccessToken(req.email())).thenReturn("jwt_token");

        // Act
        AuthResponse response = authService.login(req);

        // Assert
        assertNotNull(response);
        assertEquals("jwt_token", response.accessToken());
        assertEquals("testuser", response.username());
        verify(authManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }

    @Test
    void login_BadCredentials_ThrowsException() {
        // Arrange
        LoginRequest req = new LoginRequest("test@test.com", "wrong_password");
        doThrow(new BadCredentialsException("Bad credentials"))
                .when(authManager).authenticate(any(UsernamePasswordAuthenticationToken.class));

        // Act & Assert
        BusinessException ex = assertThrows(BusinessException.class, () -> authService.login(req));
        assertTrue(ex.getMessage().contains("Email hoặc mật khẩu không đúng"));
    }
}
