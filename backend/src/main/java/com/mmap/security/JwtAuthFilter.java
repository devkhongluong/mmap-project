package com.mmap.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filter chạy 1 lần mỗi request — Extract JWT từ Authorization header
 * và set Authentication vào SecurityContext.
 *
 * Flow: Request → JwtAuthFilter → SecurityConfig → Controller
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtUtil jwtUtil;
    private final UserDetailsServiceImpl userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest  request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain         filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        // Không có header Authorization hoặc không bắt đầu bằng "Bearer " → bỏ qua
        if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt   = authHeader.substring(BEARER_PREFIX.length());
        final String email;

        try {
            email = jwtUtil.extractEmail(jwt);
        } catch (Exception e) {
            log.debug("Không thể extract email từ JWT: {}", e.getMessage());
            filterChain.doFilter(request, response);
            return;
        }

        // Chỉ authenticate nếu chưa có Authentication trong context
        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {

            if (jwtUtil.isTokenValid(jwt)) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(email);

                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities()
                        );
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // Set Authentication → request này được xem là đã đăng nhập
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        filterChain.doFilter(request, response);
    }
}
