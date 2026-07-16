package com.mmap.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

/**
 * Bảng map_days — Chi tiết từng ngày học trong một lộ trình.
 * Quan hệ: nhiều Day thuộc 1 Map (N-1).
 */
@Entity
@Table(name = "map_days", uniqueConstraints = {
        @UniqueConstraint(name = "uq_map_days_index", columnNames = {"map_id", "day_index"})
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class MapDay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "map_id", nullable = false)
    private LearningMap map;

    @Column(name = "phase_name", nullable = false, length = 150)
    private String phaseName;

    @Column(name = "week_name", length = 150)
    private String weekName;

    /** Thứ tự ngày học, bắt đầu từ 1. Unique trong mỗi map */
    @Column(name = "day_index", nullable = false)
    private Integer dayIndex;

    /** Tiêu đề ngày — dùng để vẽ node trên Tree Map */
    @Column(name = "day_title", nullable = false, length = 255)
    private String dayTitle;

    // ── Quan hệ ───────────────────────────────────────────────────────
    @OneToMany(mappedBy = "mapDay", cascade = CascadeType.ALL, fetch = FetchType.LAZY,
               orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    private List<MapDayChecklist> checklists;

    /** Tài liệu lý thuyết / link học liệu gắn với ngày này */
    @OneToMany(mappedBy = "mapDay", cascade = CascadeType.ALL, fetch = FetchType.LAZY,
               orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    private List<MapDayMaterial> materials;
}
