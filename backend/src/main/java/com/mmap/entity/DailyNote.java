package com.mmap.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.OffsetDateTime;

/**
 * Bảng daily_notes — Ghi chú tóm tắt bài học sau khi AI xác nhận.
 * UNIQUE(user_id, map_day_id): mỗi user chỉ có 1 note mỗi ngày.
 * Note có thể UPDATE sau (trường updated_at lưu lần sửa cuối).
 */
@Entity
@Table(name = "daily_notes", uniqueConstraints = {
        @UniqueConstraint(name = "uq_daily_notes", columnNames = {"user_id", "map_day_id"})
})
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class DailyNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "map_day_id", nullable = false)
    private MapDay mapDay;

    /**
     * Nội dung note do user tự gõ (paste bị chặn ở frontend).
     * Tối thiểu 20 ký tự — validate ở Service layer.
     */
    @Column(name = "note_content", nullable = false, columnDefinition = "TEXT")
    private String noteContent;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
