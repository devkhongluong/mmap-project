package com.mmap.controller;

import com.mmap.service.GeminiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final GeminiService geminiService;

    @PostMapping("/review-note")
    public ResponseEntity<Map<String, String>> reviewNote(@RequestBody Map<String, String> body) {
        String noteContent = body.get("noteContent");
        if (noteContent == null || noteContent.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Note content cannot be empty"));
        }

        String feedback = geminiService.getFeedbackForNote(noteContent);
        return ResponseEntity.ok(Map.of("feedback", feedback));
    }
}
