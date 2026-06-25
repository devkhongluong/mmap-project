package com.mmap.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Bảng learning_maps — Template lộ trình học (dùng chung nhiều user).
 */
@Entity
@Table(name = "learning_maps")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class LearningMap {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "total_days", nullable = false)
    private Integer totalDays;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    // ── Quan hệ ───────────────────────────────────────────────────────
    @OneToMany(mappedBy = "map", cascade = CascadeType.ALL, fetch = FetchType.LAZY,
               orphanRemoval = true)
    @OrderBy("dayIndex ASC")
    private List<MapDay> mapDays;

    @OneToMany(mappedBy = "map", cascade = CascadeType.ALL, fetch = FetchType.LAZY,
               orphanRemoval = true)
    private List<MapSkill> mapSkills;
}
