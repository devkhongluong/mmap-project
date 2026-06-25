package com.mmap.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

/**
 * Bảng user_day_progress — N-N: User ↔ MapDay.
 * Lưu tiến độ từng node trên Tree Map của mỗi user.
 * UNIQUE(user_id, map_day_id) — 1 user chỉ có 1 bản ghi tiến độ mỗi ngày.
 */
@Entity
@Table(name = "user_day_progress", uniqueConstraints = {
        @UniqueConstraint(name = "uq_user_day_progress", columnNames = {"user_id", "map_day_id"})
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class UserDayProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "map_day_id", nullable = false)
    private MapDay mapDay;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20,
            columnDefinition = "VARCHAR(20) DEFAULT 'LOCKED'")
    private DayProgressStatus status = DayProgressStatus.LOCKED;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;   // NULL khi chưa COMPLETED
}
