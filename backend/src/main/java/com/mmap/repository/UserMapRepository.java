package com.mmap.repository;

import com.mmap.entity.UserMap;
import com.mmap.entity.UserMapStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserMapRepository extends JpaRepository<UserMap, Long> {

    /** Tải tất cả map của user, sắp xếp theo lần truy cập gần nhất */
    List<UserMap> findByUserIdOrderByLastAccessedAtDesc(Long userId);

    /** Lấy Active Map (map được truy cập gần nhất) */
    Optional<UserMap> findFirstByUserIdOrderByLastAccessedAtDesc(Long userId);

    Optional<UserMap> findByUserIdAndMapId(Long userId, Integer mapId);

    boolean existsByUserIdAndMapId(Long userId, Integer mapId);

    /** Cập nhật last_accessed_at khi user chọn/mở map */
    @Modifying
    @Query("UPDATE UserMap um SET um.lastAccessedAt = :now WHERE um.id = :id")
    void updateLastAccessedAt(@Param("id") Long id, @Param("now") OffsetDateTime now);

    /** Đếm số ngày COMPLETED trong map để kiểm tra hoàn thành lộ trình */
    @Query("""
           SELECT COUNT(udp)
           FROM UserDayProgress udp
           JOIN udp.mapDay md
           WHERE udp.user.id = :userId
             AND md.map.id   = :mapId
             AND udp.status  = 'COMPLETED'
           """)
    long countCompletedDays(@Param("userId") Long userId,
                             @Param("mapId")  Integer mapId);
}
