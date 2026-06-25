package com.mmap.dto.response;

import com.mmap.entity.UserMapStatus;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Response cho GET /api/maps — thông tin tổng quan lộ trình của user.
 */
public record UserMapResponse(
        Long            userMapId,
        Integer         mapId,
        String          title,
        String          description,
        Integer         totalDays,
        Integer         daysCompleted,
        Integer         currentDayIndex,   // Index ngày hiện tại đang học
        double          progressPct,       // Phần trăm hoàn thành
        UserMapStatus   status,
        OffsetDateTime  lastAccessedAt,
        OffsetDateTime  startedAt,
        List<TreeNodeResponse> treeNodes   // Để vẽ Tree Map
) {}
