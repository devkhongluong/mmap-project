package com.mmap.service;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Response DTO cho GET /api/me
 */
public record ProfileResponse(
        Long                userId,
        String              username,
        String              email,
        OffsetDateTime      createdAt,
        int                 totalMapsEnrolled,
        int                 totalDaysCompleted,
        int                 currentStreak,
        List<SkillDto>      skills
) {
    public record SkillDto(
            int            skillId,
            String         skillName,
            String         iconUrl,
            OffsetDateTime unlockedAt
    ) {}
}
