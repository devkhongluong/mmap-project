package com.mmap.dto.response;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Response cho GET /api/maps/{mapId}/days/today
 * Trả về thông tin ngày học hiện tại kèm checklists và tiến độ.
 */
public record DayDetailResponse(
        Long                    mapDayId,
        Integer                 dayIndex,
        String                  dayTitle,
        String                  phaseName,
        String                  weekName,
        List<ChecklistItemResponse> checklists,
        int                     totalChecklists,
        int                     checkedCount,
        boolean                 allChecked,         // true khi đủ điều kiện mở nút "Hoàn thành"
        boolean                 dayCompleted        // true khi đã lưu note thành công
) {}
