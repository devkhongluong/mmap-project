package com.mmap.service;

import java.time.OffsetDateTime;

/**
 * Response DTO cho lịch sử Note — inline trong NoteService.
 * Tách ra file riêng để NoteController có thể import.
 */
public record NoteHistoryResponse(
        Long           noteId,
        Integer        dayIndex,
        String         dayTitle,
        String         noteContent,
        OffsetDateTime createdAt
) {}
