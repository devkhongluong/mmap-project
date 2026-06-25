package com.mmap.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body cho POST /api/notes — Lưu note sau khi AI xác nhận.
 */
public record SaveNoteRequest(

        Long mapDayId,

        @NotBlank(message = "Nội dung note không được để trống")
        @Size(min = 20, message = "Note phải có tối thiểu 20 ký tự — hãy tự gõ, không được paste!")
        String noteContent
) {}
