package com.mmap.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.OffsetDateTime;

/**
 * Bảng user_checklist_progress — N-N: User ↔ MapDayChecklist.
 * Lưu trạng thái tick/untick checkbox của mỗi user.
 * UNIQUE(user_id, checklist_id) — 1 user chỉ có 1 trạng thái mỗi checkbox.
 */
@Entity
@Table(name = "user_checklist_progress", uniqueConstraints = {
        @UniqueConstraint(name = "uq_user_checklist_progress",
                          columnNames = {"user_id", "checklist_id"})
})
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class UserChecklistProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "checklist_id", nullable = false)
    private MapDayChecklist checklist;

    @Column(name = "is_checked", nullable = false)
    private Boolean isChecked = false;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
