package com.mmap.controller;

import com.mmap.dto.response.DayDetailResponse;
import com.mmap.dto.response.UserMapResponse;
import com.mmap.service.UserMapService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller quản lý Lộ trình học của User.
 *
 * PROTECTED — cần JWT.
 *
 * Endpoints:
 *  GET  /api/maps                          → Tất cả maps của user (kèm tiến độ)
 *  GET  /api/maps/{mapId}/days/current     → Ngày học hiện tại + checklists
 *  PUT  /api/maps/{userMapId}/access       → Cập nhật last_accessed_at khi đổi Map
 */
@RestController
@RequestMapping("/api/maps")
@RequiredArgsConstructor
public class MapController {

    private final UserMapService userMapService;

    /** Lấy danh sách lộ trình và tiến độ. Map đầu tiên = Active Map. */
    @GetMapping
    public ResponseEntity<List<UserMapResponse>> getUserMaps(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(userMapService.getUserMaps(user.getUsername()));
    }

    /** Lấy nội dung ngày học hiện tại của map. */
    @GetMapping("/{mapId}/days/current")
    public ResponseEntity<DayDetailResponse> getCurrentDay(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Integer mapId) {
        return ResponseEntity.ok(userMapService.getCurrentDay(user.getUsername(), mapId));
    }

    /** Cập nhật Active Map khi user chọn lộ trình khác ở Header. */
    @PutMapping("/{userMapId}/access")
    public ResponseEntity<Void> updateAccess(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long userMapId) {
        userMapService.updateLastAccessed(user.getUsername(), userMapId);
        return ResponseEntity.noContent().build();
    }
}
