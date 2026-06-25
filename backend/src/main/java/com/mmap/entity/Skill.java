package com.mmap.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Bảng skills — Danh mục kỹ năng / huy hiệu có thể mở khóa.
 */
@Entity
@Table(name = "skills", uniqueConstraints = {
        @UniqueConstraint(name = "uq_skills_name", columnNames = "skill_name")
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Skill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "skill_name", nullable = false, length = 100)
    private String skillName;

    /** Link ảnh hoặc emoji — Nullable */
    @Column(name = "icon_url", length = 255)
    private String iconUrl;
}
