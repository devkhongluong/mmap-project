package com.mmap.dto.response;

/**
 * Một dòng checklist kèm trạng thái đã check chưa.
 */
public record ChecklistItemResponse(
        Long    checklistId,
        String  checkpointContent,
        Integer displayOrder,
        boolean isChecked
) {}
