package com.mmap.dto.response;

import java.time.OffsetDateTime;

/**
 * Response DTO cho lịch sử Note của một map.
 */
public record NoteHistoryResponse(
        Long           noteId,
        Integer        dayIndex,
        String         dayTitle,
        String         noteContent,
        OffsetDateTime createdAt
) {}
