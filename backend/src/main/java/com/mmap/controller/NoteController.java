package com.mmap.controller;

import com.mmap.dto.request.SaveNoteRequest;
import com.mmap.service.NoteHistoryResponse;
import com.mmap.service.NoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST Controller quản lý Note bài học.
 *
 * PROTECTED — cần JWT.
 *
 * Endpoints:
 *  POST /api/notes              → Lưu note + hoàn thành ngày học
 *  GET  /api/notes/{mapId}      → Lịch sử note của map
 */
@RestController
@RequestMapping("/api/notes")
@RequiredArgsConstructor
public class NoteController {

    private final NoteService noteService;

    /**
     * Lưu note sau khi AI xác nhận.
     * Kích hoạt: mark day COMPLETED, unlock next day, check map done.
     * @return 200 OK + message
     */
    @PostMapping
    public ResponseEntity<Map<String, String>> saveNote(
            @AuthenticationPrincipal UserDetails user,
            @Valid @RequestBody SaveNoteRequest req) {
        noteService.saveNote(user.getUsername(), req);
        return ResponseEntity.ok(Map.of(
                "message", "Note đã được lưu thành công! Ngày học hoàn thành 🎉"
        ));
    }

    /**
     * Lấy lịch sử note của user trong 1 map — dùng cho popup "Lịch sử Note".
     */
    @GetMapping("/{mapId}")
    public ResponseEntity<List<NoteHistoryResponse>> getNoteHistory(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Integer mapId) {
        return ResponseEntity.ok(noteService.getNoteHistory(user.getUsername(), mapId));
    }
}
