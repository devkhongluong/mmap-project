package com.mmap.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

/** Composite Primary Key cho bảng map_skills */
@Embeddable
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode
public class MapSkillId implements Serializable {

    @Column(name = "map_id")
    private Integer mapId;

    @Column(name = "skill_id")
    private Integer skillId;
}
