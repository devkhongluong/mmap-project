package com.mmap.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Bảng daily_todos — To-do List toàn cục (Global), không gắn với Map học.
 * Khi user đổi Map học, danh sách todo hôm nay KHÔNG thay đổi.
 *
 * Lưu ý: due_time dùng OffsetDateTime (TIMESTAMPTZ) thay vì TIME
 * để xử lý timezone đúng cách.
 */
@Entity
@Table(name = "daily_todos",
       indexes = @Index(name = "idx_daily_todos_user_date",
                        columnList = "user_id, target_date"))
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class DailyTodo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "task_content", nullable = false, length = 255)
    private String taskContent;

    @Column(name = "target_date", nullable = false)
    private LocalDate targetDate;

    /**
     * Thời gian cụ thể (TIMESTAMPTZ).
     * NULL = "Cả ngày" — sort NULL LAST.
     */
    @Column(name = "due_time")
    private OffsetDateTime dueTime;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20,
            columnDefinition = "VARCHAR(20) DEFAULT 'PENDING'")
    private TodoStatus status = TodoStatus.PENDING;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
