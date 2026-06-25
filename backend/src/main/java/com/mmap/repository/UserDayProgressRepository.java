package com.mmap.repository;

import com.mmap.entity.UserDayProgress;
import com.mmap.entity.DayProgressStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserDayProgressRepository extends JpaRepository<UserDayProgress, Long> {

    Optional<UserDayProgress> findByUserIdAndMapDayId(Long userId, Long mapDayId);

    /** Tải toàn bộ Tree Map progress của user trong 1 map */
    @Query("""
           SELECT udp FROM UserDayProgress udp
           JOIN FETCH udp.mapDay md
           WHERE udp.user.id = :userId
             AND md.map.id   = :mapId
           ORDER BY md.dayIndex ASC
           """)
    List<UserDayProgress> findTreeMapByUserIdAndMapId(
            @Param("userId") Long userId,
            @Param("mapId")  Integer mapId
    );

    long countByUserIdAndMapDayMapIdAndStatus(
            Long userId, Integer mapId, DayProgressStatus status);

    /** Đếm tổng ngày COMPLETED của user (tất cả maps) — dùng cho Profile stats */
    long countByUserIdAndStatus(Long userId, DayProgressStatus status);

    /** Lấy danh sách ngày hoàn thành — dùng để tính streak */
    @Query("""
           SELECT udp.completedAt FROM UserDayProgress udp
           WHERE udp.user.id = :userId
             AND udp.status  = 'COMPLETED'
             AND udp.completedAt IS NOT NULL
           ORDER BY udp.completedAt DESC
           """)
    List<OffsetDateTime> findCompletedDatesByUserId(@Param("userId") Long userId);
}
