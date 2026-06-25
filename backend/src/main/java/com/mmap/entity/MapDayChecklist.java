package com.mmap.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Bảng map_day_checklists — Các mục tiêu cần đạt trong 1 ngày học.
 * Quan hệ: nhiều Checklist thuộc 1 Day (N-1).
 */
@Entity
@Table(name = "map_day_checklists")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class MapDayChecklist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "map_day_id", nullable = false)
    private MapDay mapDay;

    @Column(name = "checkpoint_content", nullable = false, length = 500)
    private String checkpointContent;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;
}
