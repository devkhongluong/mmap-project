package com.mmap.repository;

import com.mmap.entity.MapDay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MapDayRepository extends JpaRepository<MapDay, Long> {

    List<MapDay> findByMapIdOrderByDayIndexAsc(Integer mapId);

    Optional<MapDay> findByMapIdAndDayIndex(Integer mapId, Integer dayIndex);

    /** Tải MapDay kèm checklists (tránh N+1 query) */
    @Query("""
           SELECT md FROM MapDay md
           LEFT JOIN FETCH md.checklists
           WHERE md.id = :id
           """)
    Optional<MapDay> findByIdWithChecklists(@Param("id") Long id);
}
