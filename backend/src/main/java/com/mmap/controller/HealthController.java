package com.mmap.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.Map;

/**
 * Health / Keep-alive endpoint — PUBLIC (không cần JWT).
 *
 * GET /api/ping  → { "status": "ok", "ts": "..." }
 *
 * Mục đích:
 *  1. Frontend ping mỗi 30s để Render free tier không ngủ
 *  2. UptimeRobot / cron-job.org ping 5 phút/lần để server luôn sống
 */
@RestController
public class HealthController {

    @GetMapping("/api/ping")
    public ResponseEntity<Map<String, String>> ping() {
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "ts", OffsetDateTime.now().toString()
        ));
    }
}
