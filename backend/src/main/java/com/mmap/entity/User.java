package com.mmap.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Bảng users — Tài khoản người dùng hệ thống.
 * Implements UserDetails không đặt ở đây để tách biệt domain entity với security concern.
 */
@Entity
@Table(name = "users", uniqueConstraints = {
        @UniqueConstraint(name = "uq_users_email",    columnNames = "email"),
        @UniqueConstraint(name = "uq_users_username", columnNames = "username")
})
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String username;

    @Column(nullable = false, length = 100)
    private String email;

    /** BCrypt hash — KHÔNG lưu plain text */
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    /** Groq API key do user tự nhập — NULL = chưa cài, dùng server key */
    @Column(name = "groq_api_key", length = 255)
    private String groqApiKey;


    // ── Quan hệ ───────────────────────────────────────────────────────
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<UserMap> userMaps;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<UserSkill> userSkills;
}
