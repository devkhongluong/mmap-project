package com.mmap.dto.response;

import com.mmap.entity.DayProgressStatus;

/**
 * Một node trên Tree Map.
 */
public record TreeNodeResponse(
        Long              mapDayId,
        Integer           dayIndex,
        String            dayTitle,
        String            phaseName,
        DayProgressStatus status
) {}
