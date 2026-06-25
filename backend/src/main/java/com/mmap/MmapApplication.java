package com.mmap;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.data.auditing.DateTimeProvider;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

import java.time.OffsetDateTime;
import java.util.Optional;

/**
 * Entry point của MMAP Backend Application.
 *
 * Tech Stack:
 *  - Spring Boot 3.3.1 + Java 21
 *  - Spring Data JPA + PostgreSQL (Neon.tech)
 *  - Spring Security + JWT (jjwt 0.12.x)
 *  - Apache POI (Excel Import)
 *  - Gemini AI Integration
 */
@SpringBootApplication
@EnableJpaAuditing(dateTimeProviderRef = "auditingDateTimeProvider")   // Bật auto-fill createdAt/updatedAt qua @CreatedDate, @LastModifiedDate
public class MmapApplication {

    public static void main(String[] args) {
        SpringApplication.run(MmapApplication.class, args);
    }

    @Bean(name = "auditingDateTimeProvider")
    public DateTimeProvider dateTimeProvider() {
        return () -> Optional.of(OffsetDateTime.now());
    }
}
