package com.mmap.dto.response;

import com.mmap.entity.TodoStatus;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * Response cho một Todo item.
 */
public record TodoResponse(
        Long          id,
        String        taskContent,
        LocalDate     targetDate,
        OffsetDateTime dueTime,    // null = "Cả ngày"
        TodoStatus    status,
        boolean       done         // Shorthand: status == COMPLETED
) {}
