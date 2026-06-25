package com.mmap.controller;

import com.mmap.service.ChecklistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST Controller xử lý tick/untick Checkbox.
 *
 * PROTECTED — cần JWT.
 *
 * Endpoints:
 *  PUT /api/checklists/{checklistId}/toggle → Toggle trạng thái checkbox
 */
@RestController
@RequestMapping("/api/checklists")
@RequiredArgsConstructor
public class ChecklistController {

    private final ChecklistService checklistService;

    /**
     * Toggle checkbox.
     * Frontend gọi mỗi lần user tick/untick, response trả về trạng thái mới.
     */
    @PutMapping("/{checklistId}/toggle")
    public ResponseEntity<Map<String, Boolean>> toggleChecklist(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long checklistId) {
        boolean newState = checklistService.toggleChecklist(user.getUsername(), checklistId);
        return ResponseEntity.ok(Map.of("isChecked", newState));
    }
}
