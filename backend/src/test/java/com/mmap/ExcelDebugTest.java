package com.mmap;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.File;
import java.io.FileInputStream;

/**
 * Standalone test — đọc file Excel và in ra cấu trúc để debug.
 * Chạy: java -cp "target/mmap-backend-1.0.0.jar;path/to/poi.jar" com.mmap.ExcelDebugTest
 */
public class ExcelDebugTest {
    public static void main(String[] args) throws Exception {
        String filePath = args.length > 0 ? args[0] : "../../dulieutest.xlsx";
        File file = new File(filePath);
        System.out.println("=== Reading: " + file.getAbsolutePath() + " ===");
        System.out.println("Exists: " + file.exists() + ", Size: " + file.length() + " bytes\n");

        try (Workbook wb = new XSSFWorkbook(new FileInputStream(file))) {
            System.out.println("Sheets: " + wb.getNumberOfSheets());
            for (int s = 0; s < wb.getNumberOfSheets(); s++) {
                System.out.println("  Sheet[" + s + "]: " + wb.getSheetName(s));
            }

            Sheet sheet = wb.getSheet("Lộ trình");
            if (sheet == null) {
                System.out.println("\n⚠ Sheet 'Lộ trình' không tìm thấy → dùng sheet 0");
                sheet = wb.getSheetAt(0);
            }
            System.out.println("\nActive sheet: " + sheet.getSheetName());
            System.out.println("Rows: " + sheet.getPhysicalNumberOfRows());

            System.out.println("\n=== 10 ROWS ĐẦU ===");
            int count = 0;
            for (Row row : sheet) {
                if (count++ >= 10) break;
                System.out.printf("Row %2d | A=%s | B=%s | C=%s(type=%s) | D=%s | E=%s%n",
                    row.getRowNum() + 1,
                    getCellInfo(row.getCell(0)),
                    getCellInfo(row.getCell(1)),
                    getCellInfo(row.getCell(2)),
                    row.getCell(2) != null ? row.getCell(2).getCellType() : "null",
                    getCellInfo(row.getCell(3)),
                    getCellInfo(row.getCell(4))
                );
            }

            // Đếm rows hợp lệ
            System.out.println("\n=== VALIDATE COL C (Day Index) ===");
            int valid = 0, skipped = 0;
            for (Row row : sheet) {
                Cell c = row.getCell(2);
                if (c == null) { skipped++; continue; }
                CellType type = c.getCellType();
                if (type == CellType.FORMULA) type = c.getCachedFormulaResultType();
                if (type == CellType.NUMERIC) {
                    int v = (int) c.getNumericCellValue();
                    if (v > 0) { valid++; continue; }
                }
                if (type == CellType.STRING) {
                    try { int v = Integer.parseInt(c.getStringCellValue().trim()); if (v > 0) { valid++; continue; } }
                    catch (Exception ignored) {}
                }
                System.out.printf("  Row %d: col C = %s (type=%s) → SKIPPED%n",
                    row.getRowNum()+1, getCellInfo(c), type);
                skipped++;
            }
            System.out.println("Valid rows: " + valid + ", Skipped: " + skipped);
        }
    }

    static String getCellInfo(Cell c) {
        if (c == null) return "(null)";
        CellType t = c.getCellType();
        if (t == CellType.FORMULA) {
            CellType rt = c.getCachedFormulaResultType();
            return switch (rt) {
                case NUMERIC -> String.valueOf((int) c.getNumericCellValue()) + "[F]";
                case STRING -> c.getStringCellValue() + "[F]";
                default -> "(formula:" + rt + ")";
            };
        }
        return switch (t) {
            case STRING -> c.getStringCellValue();
            case NUMERIC -> String.valueOf((int) c.getNumericCellValue());
            case BLANK -> "(blank)";
            default -> "(" + t + ")";
        };
    }
}
