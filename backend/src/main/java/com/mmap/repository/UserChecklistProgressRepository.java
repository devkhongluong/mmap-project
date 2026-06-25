package com.mmap.repository;

import com.mmap.entity.UserChecklistProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserChecklistProgressRepository
        extends JpaRepository<UserChecklistProgress, Long> {

    Optional<UserChecklistProgress> findByUserIdAndChecklistId(Long userId, Long checklistId);

    /** Tải tất cả progress của user cho 1 ngày cụ thể */
    @Query("""
           SELECT ucp FROM UserChecklistProgress ucp
           WHERE ucp.user.id     = :userId
             AND ucp.checklist.mapDay.id = :mapDayId
           """)
    List<UserChecklistProgress> findByUserIdAndMapDayId(
            @Param("userId")    Long userId,
            @Param("mapDayId")  Long mapDayId
    );

    /** Đếm số checkbox đã tick trong 1 ngày */
    @Query("""
           SELECT COUNT(ucp)
           FROM UserChecklistProgress ucp
           WHERE ucp.user.id               = :userId
             AND ucp.checklist.mapDay.id   = :mapDayId
             AND ucp.isChecked             = true
           """)
    long countCheckedByUserIdAndMapDayId(
            @Param("userId")    Long userId,
            @Param("mapDayId")  Long mapDayId
    );
}
