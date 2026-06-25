package com.mmap.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * Request body cho POST /api/todos — Tạo todo mới.
 */
public record CreateTodoRequest(

        @NotBlank(message = "Nội dung công việc không được để trống")
        @Size(max = 255, message = "Nội dung tối đa 255 ký tự")
        String taskContent,

        @NotNull(message = "targetDate không được để trống")
        LocalDate targetDate,

        /**
         * Thời gian hẹn — Nullable.
         * Nếu null = "Cả ngày", sort NULLS LAST ở DB.
         */
        OffsetDateTime dueTime
) {}
