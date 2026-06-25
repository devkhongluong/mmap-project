package com.mmap.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.OffsetDateTime;

/**
 * Bảng user_skills — N-N: User ↔ Skill đã mở khóa (hiển thị trên Profile).
 * UNIQUE(user_id, skill_id) ngăn duplicate badge.
 */
@Entity
@Table(name = "user_skills", uniqueConstraints = {
        @UniqueConstraint(name = "uq_user_skills", columnNames = {"user_id", "skill_id"})
})
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class UserSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;

    @CreatedDate
    @Column(name = "unlocked_at", nullable = false, updatable = false)
    private OffsetDateTime unlockedAt;
}
