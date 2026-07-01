package com.mmap.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

/**
 * Bảng user_maps — N-N giữa User và LearningMap.
 * Lưu trạng thái user đang học lộ trình nào, tiến độ ra sao.
 *
 * UNIQUE(user_id, map_id) đảm bảo mỗi user chỉ đăng ký 1 map 1 lần.
 */
@Entity
@Table(name = "user_maps", uniqueConstraints = {
        @UniqueConstraint(name = "uq_user_maps", columnNames = {"user_id", "map_id"})
})
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class UserMap {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "map_id", nullable = false)
    private LearningMap map;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20,
            columnDefinition = "VARCHAR(20) DEFAULT 'IN_PROGRESS'")
    private UserMapStatus status = UserMapStatus.IN_PROGRESS;

    /**
     * Cột quan trọng: dùng ORDER BY DESC để xác định Active Map khi login.
     * Cập nhật mỗi khi user chọn/mở map này.
     */
    @Column(name = "last_accessed_at", nullable = false)
    private OffsetDateTime lastAccessedAt;

    @CreatedDate
    @Column(name = "started_at", nullable = false, updatable = false)
    private OffsetDateTime startedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;   // NULL khi chưa xong

    @PrePersist
    public void prePersist() {
        if (lastAccessedAt == null) lastAccessedAt = OffsetDateTime.now();
    }
}
