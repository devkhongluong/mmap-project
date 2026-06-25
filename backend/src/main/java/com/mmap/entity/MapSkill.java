package com.mmap.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Bảng map_skills — Bảng phụ N-N giữa LearningMap và Skill.
 * 1 Lộ trình cấp nhiều kỹ năng; 1 Kỹ năng đạt được qua nhiều lộ trình.
 */
@Entity
@Table(name = "map_skills")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class MapSkill {

    @EmbeddedId
    private MapSkillId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("mapId")
    @JoinColumn(name = "map_id")
    private LearningMap map;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("skillId")
    @JoinColumn(name = "skill_id")
    private Skill skill;
}
