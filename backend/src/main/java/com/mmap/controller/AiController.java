package com.mmap.controller;

import com.mmap.service.GeminiService;
import com.mmap.service.ProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST Controller cho các tính năng AI.
 *
 * Endpoints:
 *  POST /api/ai/review-note  → Nhận xét ghi chú học tập
 *  POST /api/ai/voice-chat   → Trợ lý giọng nói (hỏi đáp real-time)
 */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final GeminiService geminiService;
    private final ProfileService profileService;

    @PostMapping("/review-note")
    public ResponseEntity<Map<String, String>> reviewNote(@RequestBody Map<String, String> body) {
        String noteContent = body.get("noteContent");
        if (noteContent == null || noteContent.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Note content cannot be empty"));
        }
        String feedback = geminiService.getFeedbackForNote(noteContent);
        return ResponseEntity.ok(Map.of("feedback", feedback));
    }

    /**
     * Voice chat — trả lời câu hỏi người học real-time.
     * Body: { question, dayTitle, phaseName, checklistItems: string[] }
     */
    @PostMapping("/voice-chat")
    public ResponseEntity<Map<String, String>> voiceChat(
            @AuthenticationPrincipal UserDetails user,
            @RequestBody Map<String, Object> body) {

        String question = (String) body.getOrDefault("question", "");
        if (question.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Câu hỏi không được để trống"));
        }

        String dayTitle   = (String) body.getOrDefault("dayTitle", "");
        String phaseName  = (String) body.getOrDefault("phaseName", "");

        @SuppressWarnings("unchecked")
        List<String> checklistItems = (List<String>) body.getOrDefault("checklistItems", List.of());

        @SuppressWarnings("unchecked")
        List<Map<String, String>> materials = (List<Map<String, String>>) body.getOrDefault("materials", List.of());

        // Lấy key riêng của user (nếu có), null → GeminiService dùng server key
        String userApiKey = profileService.getGroqApiKey(user.getUsername());

        String answer = geminiService.askVoiceQuestion(question, dayTitle, phaseName, checklistItems, materials, userApiKey);
        return ResponseEntity.ok(Map.of("answer", answer));
    }
}

