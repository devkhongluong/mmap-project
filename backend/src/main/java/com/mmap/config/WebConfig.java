package com.mmap.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;

/**
 * CORS Configuration — cho phép Frontend (Vercel) gọi API Backend (Render).
 *
 * Allowed Origins được đọc từ environment variable CORS_ALLOWED_ORIGINS,
 * có thể truyền nhiều domain phân cách bằng dấu phẩy.
 */
@Configuration
public class WebConfig {

    @Value("${cors.allowed-origins}")
    private String allowedOriginsStr;

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();

        // Origins: lấy từ env variable, split bằng ","
        List<String> origins = Arrays.asList(allowedOriginsStr.split(","));
        config.setAllowedOrigins(origins);

        // Methods được phép
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));

        // Headers được phép — quan trọng: include Authorization để JWT đi qua
        config.setAllowedHeaders(List.of("*"));

        // Expose Authorization header để FE đọc được JWT từ response
        config.setExposedHeaders(List.of("Authorization", "Content-Disposition"));

        // Cho phép credentials (cookie, Authorization header)
        config.setAllowCredentials(true);

        // Cache preflight trong 3600s (1 giờ) để giảm OPTIONS requests
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return new CorsFilter((CorsConfigurationSource) source);
    }
}
