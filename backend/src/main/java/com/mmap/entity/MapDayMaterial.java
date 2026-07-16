package com.mmap.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Bảng map_day_materials — Tài liệu lý thuyết / link học liệu gắn với từng ngày học.
 * Quan hệ: nhiều Material thuộc 1 Day (N-1).
 *
 * content_type:
 *   "text"    → nội dung văn bản thuần, hiển thị inline
 *   "link"    → URL web, render thành clickable card
 *   "youtube" → link YouTube, hiển thị thumbnail + nút xem
 */
@Entity
@Table(name = "map_day_materials")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class MapDayMaterial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "map_day_id", nullable = false)
    private MapDay mapDay;

    /** Tiêu đề tài liệu, VD: "Video: OOP trong Java", "Đề luyện tập số 1" */
    @Column(name = "title", nullable = false, length = 255)
    private String title;

    /**
     * Loại nội dung: "text" | "link" | "youtube"
     * Dùng để FE biết cách render card phù hợp.
     */
    @Column(name = "content_type", nullable = false, length = 20)
    private String contentType;

    /** Nội dung thuần (text) hoặc URL đầy đủ (link/youtube) */
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    /** Thứ tự hiển thị trong ngày, bắt đầu từ 1 */
    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;
}
