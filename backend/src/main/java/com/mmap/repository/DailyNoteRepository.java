package com.mmap.repository;

import com.mmap.entity.DailyNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DailyNoteRepository extends JpaRepository<DailyNote, Long> {

    Optional<DailyNote> findByUserIdAndMapDayId(Long userId, Long mapDayId);

    /** Lịch sử note của user trong 1 map, sắp xếp theo ngày */
    @Query("""
           SELECT dn FROM DailyNote dn
           JOIN FETCH dn.mapDay md
           WHERE dn.user.id = :userId
             AND md.map.id  = :mapId
           ORDER BY md.dayIndex ASC
           """)
    List<DailyNote> findNoteHistoryByUserIdAndMapId(
            @Param("userId") Long userId,
            @Param("mapId")  Integer mapId
    );
}
