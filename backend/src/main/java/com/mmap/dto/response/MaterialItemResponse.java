package com.mmap.dto.response;

/**
 * Một tài liệu lý thuyết / link học liệu gắn với ngày học.
 *
 * contentType: "text" | "link" | "youtube"
 *   - "text"    → hiển thị nội dung inline, có thể collapse
 *   - "link"    → render clickable card với domain + nút "Mở tài liệu"
 *   - "youtube" → render thumbnail + nút "Xem video"
 */
public record MaterialItemResponse(
        Long    materialId,
        String  title,
        String  contentType,
        String  content,
        Integer displayOrder
) {}
