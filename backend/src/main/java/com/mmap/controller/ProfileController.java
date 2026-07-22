package com.mmap.controller;

import com.mmap.service.ProfileResponse;
import com.mmap.service.ProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST Controller cho trang Profile.
 *
 * PROTECTED — cần JWT.
 *
 * Endpoints:
 *  GET  /api/me              → Thông tin user + skills + stats
 *  PUT  /api/me/groq-key     → Lưu Groq API key của user
 *  GET  /api/me/groq-key     → Kiểm tra key đã cài chưa (trả về masked)
 *  DELETE /api/me/groq-key   → Xoá key (dùng lại server key)
 */
@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping
    public ResponseEntity<ProfileResponse> getProfile(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(profileService.getProfile(user.getUsername()));
    }

    /** Lưu Groq API key — body: { "apiKey": "gsk_..." } */
    @PutMapping("/groq-key")
    public ResponseEntity<Map<String, String>> saveGroqKey(
            @AuthenticationPrincipal UserDetails user,
            @RequestBody Map<String, String> body) {
        String apiKey = body.getOrDefault("apiKey", "").trim();
        profileService.saveGroqKey(user.getUsername(), apiKey);
        return ResponseEntity.ok(Map.of("message", "Đã lưu Groq API key thành công!"));
    }

    /** Kiểm tra key — trả về { hasKey: bool, maskedKey: "gsk_xxxx••••" } */
    @GetMapping("/groq-key")
    public ResponseEntity<Map<String, Object>> getGroqKeyStatus(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(profileService.getGroqKeyStatus(user.getUsername()));
    }

    /** Xoá key → dùng lại server key */
    @DeleteMapping("/groq-key")
    public ResponseEntity<Map<String, String>> deleteGroqKey(
            @AuthenticationPrincipal UserDetails user) {
        profileService.saveGroqKey(user.getUsername(), null);
        return ResponseEntity.ok(Map.of("message", "Đã xoá Groq API key. Hệ thống sẽ dùng key mặc định."));
    }
}
