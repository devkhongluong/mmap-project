package com.mmap.controller;

import com.mmap.service.ProfileResponse;
import com.mmap.service.ProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller cho trang Profile.
 *
 * PROTECTED — cần JWT.
 *
 * Endpoints:
 *  GET /api/me → Thông tin user + skills + stats
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
}
