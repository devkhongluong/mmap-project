package com.mmap.controller;

import com.mmap.service.ExcelImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * REST Controller cho import lộ trình từ Excel.
 *
 * PROTECTED — cần JWT.
 *
 * Endpoints:
 *  POST /api/maps/import  → Upload file .xlsx tạo lộ trình mới
 */
@RestController
@RequestMapping("/api/maps")
@RequiredArgsConstructor
public class ImportController {

    private final ExcelImportService importService;

    /**
     * Import file Excel để tạo lộ trình học mới.
     *
     * Request: multipart/form-data
     *   - file:        file .xlsx
     *   - mapTitle:    tên lộ trình (String)
     *   - mapDesc:     mô tả (String, optional)
     *
     * Response: { mapId: 3, message: "Import thành công: 98 ngày" }
     */
    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importMap(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam("file")     MultipartFile file,
            @RequestParam("mapTitle") String mapTitle,
            @RequestParam(value = "mapDesc", defaultValue = "") String mapDesc
    ) throws IOException {

        Integer mapId = importService.importMap(
                user.getUsername(), mapTitle, mapDesc, file);

        return ResponseEntity.ok(Map.of(
                "mapId",   mapId,
                "message", "Import lộ trình thành công!"
        ));
    }
}
