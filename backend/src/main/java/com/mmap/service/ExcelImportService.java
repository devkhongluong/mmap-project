package com.mmap.service;

import com.mmap.entity.*;
import com.mmap.exception.BusinessException;
import com.mmap.exception.ResourceNotFoundException;
import com.mmap.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Service import lộ trình học từ file Excel (.xlsx).
 *
 * ═══ Format file Excel ═══
 * Sheet tên: "Lộ trình" (hoặc sheet đầu tiên nếu không tìm thấy)
 *
 * Row 1 (Header — bỏ qua):
 * | Phase | Week | Day | Title | Check 1 | Check 2 | Check 3 | ... |
 *
 * Row 2+:
 * | Phase 1: Java Core | Tuần 1 | 1 | OOP Basics | Hiểu class | Tạo object | ... |
 *
 * Cột A: phase_name  (bắt buộc)
 * Cột B: week_name   (optional, có thể trống)
 * Cột C: day_index   (bắt buộc, số nguyên)
 * Cột D: day_title   (bắt buộc)
 * Cột E+: checklist items (optional, bỏ qua nếu trống)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExcelImportService {

    private static final int COL_PHASE       = 0;
    private static final int COL_WEEK        = 1;
    private static final int COL_DAY_IDX    = 2;
    private static final int COL_TITLE      = 3;
    private static final int COL_CHECK_START = 4;  // Từ cột E trở đi (checklists)
    // 3 cột cuối (optional): material_title | material_type | material_content
    // Vị trí được detect tự động qua header dòng đầu tiên

    private final LearningMapRepository    learningMapRepository;
    private final MapDayRepository         mapDayRepository;
    private final UserMapRepository        userMapRepository;
    private final UserDayProgressRepository dayProgressRepository;
    private final UserRepository           userRepository;
    private final MapDayMaterialRepository materialRepository;


    /**
     * Import file Excel và tạo lộ trình mới cho user.
     *
     * @param email    Email user đang import
     * @param mapTitle Tên lộ trình (nhập ở FE)
     * @param mapDesc  Mô tả lộ trình (optional)
     * @param file     File .xlsx
     * @return ID của LearningMap vừa tạo
     */
    @Transactional
    public Integer importMap(String email, String mapTitle, String mapDesc,
                              MultipartFile file) throws IOException {

        // Validate file
        if (file.isEmpty()) throw new BusinessException("File không được để trống");
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.endsWith(".xlsx")) {
            throw new BusinessException("Chỉ hỗ trợ file .xlsx");
        }
        if (file.getSize() > 10 * 1024 * 1024) {
            throw new BusinessException("File không được vượt quá 10MB");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));

        // Parse Excel
        List<MapDayData> rows = parseExcel(file);
        if (rows.isEmpty()) {
            throw new BusinessException("File Excel không có dữ liệu hợp lệ. Kiểm tra format lại.");
        }

        int totalDays = rows.stream()
                .mapToInt(r -> r.dayIndex)
                .max()
                .orElse(rows.size());

        // Tạo LearningMap
        LearningMap map = LearningMap.builder()
                .title(mapTitle)
                .description(mapDesc)
                .totalDays(totalDays)
                .build();
        learningMapRepository.save(map);

        // Tạo MapDays + Checklists + Materials
        for (MapDayData row : rows) {
            MapDay day = MapDay.builder()
                    .map(map)
                    .phaseName(row.phaseName)
                    .weekName(row.weekName.isBlank() ? null : row.weekName)
                    .dayIndex(row.dayIndex)
                    .dayTitle(row.dayTitle)
                    .build();

            List<MapDayChecklist> checklists = new ArrayList<>();
            for (int i = 0; i < row.checkpoints.size(); i++) {
                String cp = row.checkpoints.get(i);
                if (!cp.isBlank()) {
                    checklists.add(MapDayChecklist.builder()
                            .mapDay(day)
                            .checkpointContent(cp)
                            .displayOrder(i + 1)
                            .build());
                }
            }
            day.setChecklists(checklists);
            day.setMaterials(new ArrayList<>());
            mapDayRepository.save(day);

            // Lưu materials nếu có
            for (int i = 0; i < row.materials.size(); i++) {
                MaterialData mat = row.materials.get(i);
                if (!mat.title.isBlank() && !mat.content.isBlank()) {
                    String type = mat.contentType.isBlank() ? "link" : mat.contentType.trim().toLowerCase();
                    if (!List.of("text", "link", "youtube").contains(type)) type = "link";
                    materialRepository.save(MapDayMaterial.builder()
                            .mapDay(day)
                            .title(mat.title)
                            .contentType(type)
                            .content(mat.content)
                            .displayOrder(i + 1)
                            .build());
                }
            }
        }

        // Gán Map cho user (IN_PROGRESS)
        UserMap userMap = UserMap.builder()
                .user(user)
                .map(map)
                .status(UserMapStatus.IN_PROGRESS)
                .lastAccessedAt(OffsetDateTime.now())
                .build();
        userMapRepository.save(userMap);

        // Unlock ngày học ĐẦU TIÊN (dayIndex nhỏ nhất trong file)
        List<MapDay> allDays = mapDayRepository.findByMapIdOrderByDayIndexAsc(map.getId());
        if (allDays.isEmpty()) throw new BusinessException("Không có ngày học nào được tạo");

        MapDay firstDay = allDays.get(0);   // Ngày có dayIndex nhỏ nhất
        UserDayProgress firstProgress = UserDayProgress.builder()
                .user(user)
                .mapDay(firstDay)
                .status(DayProgressStatus.UNLOCKED)
                .build();
        dayProgressRepository.save(firstProgress);

        // Tạo LOCKED entries cho tất cả ngày còn lại
        for (int i = 1; i < allDays.size(); i++) {
            UserDayProgress lockedProgress = UserDayProgress.builder()
                    .user(user)
                    .mapDay(allDays.get(i))
                    .status(DayProgressStatus.LOCKED)
                    .build();
            dayProgressRepository.save(lockedProgress);
        }

        log.info("✅ Import thành công: '{}' ({} ngày) cho user {}", mapTitle, totalDays, email);
        return map.getId();
    }

    // ── Parse Excel ────────────────────────────────────────────────────────

    /**
     * Cấu trúc Excel hỗ trợ (2 format đều OK):
     *
     * Format cũ — 1 hàng/ngày, checklist nằm ngang từ cột E:
     * | Phase | Week | Day | Title | Check1 | Check2 | Check3 |
     *
     * Format mới — nhiều hàng/ngày, tài liệu ở hàng riêng:
     * | Phase | Week | Day | Title | checklist_order | checklist_content | material_title | material_type | material_content |
     * | ...   | ...  | 1   | ...   | 1               | Đọc docs...       | Video OOP      | youtube        | https://...      |
     * | ...   | ...  | 1   | ...   | 2               | Viết code...      |                |                |                  |
     * | ...   | ...  | 1   | ...   | 0               |                   | Docs chính thức| link           | https://...      |
     *
     * Các hàng cùng day_number được GOM NHÓM lại thành 1 MapDay duy nhất.
     */
    private List<MapDayData> parseExcel(MultipartFile file) throws IOException {
        // LinkedHashMap để giữ thứ tự dayIndex khi insert
        java.util.LinkedHashMap<Integer, MapDayData> dayMap = new java.util.LinkedHashMap<>();

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {

            Sheet sheet = workbook.getSheet("Lộ trình");
            if (sheet == null) sheet = workbook.getSheetAt(0);

            // ── Scan header dòng đầu để phát hiện format ──────────────────
            int colMatTitle   = -1;
            int colMatType    = -1;
            int colMatContent = -1;
            // Format mới: có cột checklist_order & checklist_content riêng
            int colCheckOrder   = -1;
            int colCheckContent = -1;

            Row headerRow = sheet.getRow(0);
            if (headerRow != null) {
                for (int c = 0; c < headerRow.getLastCellNum(); c++) {
                    String h = getCellString(headerRow.getCell(c)).toLowerCase().replace(" ", "_");
                    switch (h) {
                        case "material_title"    -> colMatTitle    = c;
                        case "material_type"     -> colMatType     = c;
                        case "material_content"  -> colMatContent  = c;
                        case "checklist_order"   -> colCheckOrder   = c;
                        case "checklist_content" -> colCheckContent = c;
                    }
                }
            }

            final boolean isNewFormat     = colCheckOrder >= 0 && colCheckContent >= 0;
            final boolean hasMaterialCols = colMatTitle >= 0;
            log.info("Excel format: {} | material cols: title={} type={} content={}",
                    isNewFormat ? "NEW (vertical)" : "OLD (horizontal)",
                    colMatTitle, colMatType, colMatContent);

            // ── Đọc từng hàng ──────────────────────────────────────────────
            for (Row row : sheet) {
                Cell phaseCell = row.getCell(COL_PHASE);
                if (phaseCell == null || getCellString(phaseCell).isBlank()) continue;

                int dayIndex = getCellInt(row.getCell(COL_DAY_IDX));
                if (dayIndex <= 0) continue;   // header hoặc không hợp lệ

                String phaseName = getCellString(row.getCell(COL_PHASE));
                String weekName  = getCellString(row.getCell(COL_WEEK));
                String dayTitle  = getCellString(row.getCell(COL_TITLE));
                if (dayTitle.isBlank()) continue;

                // Lấy hoặc tạo mới MapDayData cho dayIndex này
                MapDayData existing = dayMap.get(dayIndex);
                if (existing == null) {
                    existing = new MapDayData(phaseName, weekName, dayIndex, dayTitle,
                                              new ArrayList<>(), new ArrayList<>());
                    dayMap.put(dayIndex, existing);
                }

                // ── Đọc checklist ──────────────────────────────────────────
                if (isNewFormat) {
                    // Format mới: đọc từ cột checklist_content
                    int checkOrder   = getCellInt(row.getCell(colCheckOrder));
                    String checkText = getCellString(row.getCell(colCheckContent));
                    if (checkOrder > 0 && !checkText.isBlank()) {
                        existing.checkpoints().add(checkText);
                    }
                } else {
                    // Format cũ: checklist nằm ngang từ cột E
                    int checkEnd = hasMaterialCols ? colMatTitle : row.getLastCellNum();
                    for (int col = COL_CHECK_START; col < checkEnd; col++) {
                        String cp = getCellString(row.getCell(col));
                        if (!cp.isBlank()) existing.checkpoints().add(cp);
                    }
                }

                // ── Đọc material ───────────────────────────────────────────
                if (hasMaterialCols) {
                    String matTitle   = getCellString(row.getCell(colMatTitle));
                    String matType    = colMatType    >= 0 ? getCellString(row.getCell(colMatType))    : "";
                    String matContent = colMatContent >= 0 ? getCellString(row.getCell(colMatContent)) : "";
                    if (!matTitle.isBlank()) {
                        existing.materials().add(new MaterialData(matTitle, matType, matContent));
                    }
                }
            }
        }

        // Sắp xếp theo dayIndex rồi trả về
        return dayMap.values().stream()
                .sorted(Comparator.comparingInt(MapDayData::dayIndex))
                .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Lấy giá trị String của cell, xử lý cả FORMULA cells (Google Sheets).
     */
    private String getCellString(Cell cell) {
        if (cell == null) return "";
        CellType type = cell.getCellType();
        // Xử lý Formula cells (từ Google Sheets hoặc Excel có công thức)
        if (type == CellType.FORMULA) {
            type = cell.getCachedFormulaResultType();
        }
        return switch (type) {
            case STRING  -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                double v = cell.getNumericCellValue();
                // Nếu là số nguyên, không hiện .0
                yield v == Math.floor(v) ? String.valueOf((long) v) : String.valueOf(v);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default      -> "";
        };
    }

    /**
     * Lấy giá trị int của cell, xử lý cả FORMULA cells (Google Sheets).
     */
    private int getCellInt(Cell cell) {
        if (cell == null) return 0;
        CellType type = cell.getCellType();
        if (type == CellType.FORMULA) {
            type = cell.getCachedFormulaResultType();
        }
        return switch (type) {
            case NUMERIC -> (int) cell.getNumericCellValue();
            case STRING  -> {
                try { yield Integer.parseInt(cell.getStringCellValue().trim()); }
                catch (NumberFormatException e) { yield 0; }
            }
            default -> 0;
        };
    }

    /** DTO nội bộ cho 1 hàng trong Excel */
    private record MapDayData(
            String phaseName,
            String weekName,
            int    dayIndex,
            String dayTitle,
            List<String>       checkpoints,
            List<MaterialData> materials
    ) {}

    /** DTO nội bộ cho 1 tài liệu học liệu trong Excel */
    private record MaterialData(
            String title,
            String contentType,
            String content
    ) {}
}
