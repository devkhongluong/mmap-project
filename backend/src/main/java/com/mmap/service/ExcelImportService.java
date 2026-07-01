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

    private static final int COL_PHASE    = 0;
    private static final int COL_WEEK     = 1;
    private static final int COL_DAY_IDX  = 2;
    private static final int COL_TITLE    = 3;
    private static final int COL_CHECK_START = 4;  // Từ cột E trở đi

    private final LearningMapRepository    learningMapRepository;
    private final MapDayRepository         mapDayRepository;
    private final UserMapRepository        userMapRepository;
    private final UserDayProgressRepository dayProgressRepository;
    private final UserRepository           userRepository;

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

        // Tạo MapDays + Checklists
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
            mapDayRepository.save(day);
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

    private List<MapDayData> parseExcel(MultipartFile file) throws IOException {
        List<MapDayData> result = new ArrayList<>();

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {

            // Tìm sheet tên "Lộ trình" hoặc dùng sheet đầu tiên
            Sheet sheet = workbook.getSheet("Lộ trình");
            if (sheet == null) sheet = workbook.getSheetAt(0);

            for (Row row : sheet) {
                // Bỏ qua hàng trống
                Cell phaseCell = row.getCell(COL_PHASE);
                if (phaseCell == null || getCellString(phaseCell).isBlank()) continue;

                // Phát hiện dòng header: cột C không phải số → bỏ qua
                int dayIndex = getCellInt(row.getCell(COL_DAY_IDX));
                if (dayIndex <= 0) {
                    log.info("Bỏ qua hàng {} (header hoặc dayIndex không hợp lệ)", row.getRowNum() + 1);
                    continue;
                }

                String phaseName = getCellString(row.getCell(COL_PHASE));
                String weekName  = getCellString(row.getCell(COL_WEEK));
                String dayTitle  = getCellString(row.getCell(COL_TITLE));

                if (dayTitle.isBlank()) {
                    log.warn("Bỏ qua hàng {} — title trống", row.getRowNum() + 1);
                    continue;
                }

                // Đọc checklists từ cột E trở đi
                List<String> checkpoints = new ArrayList<>();
                int lastCol = row.getLastCellNum();
                for (int col = COL_CHECK_START; col < lastCol; col++) {
                    String cp = getCellString(row.getCell(col));
                    if (!cp.isBlank()) checkpoints.add(cp);
                }

                result.add(new MapDayData(phaseName, weekName, dayIndex, dayTitle, checkpoints));
            }
        }
        // Sắp xếp theo dayIndex để đảm bảo thứ tự đúng
        result.sort(Comparator.comparingInt(MapDayData::dayIndex));
        return result;
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
            List<String> checkpoints
    ) {}
}
