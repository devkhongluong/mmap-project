package com.mmap.repository;

import com.mmap.entity.MapDayMaterial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MapDayMaterialRepository extends JpaRepository<MapDayMaterial, Long> {

    /** Lấy tất cả materials của 1 ngày học, sắp theo thứ tự hiển thị */
    List<MapDayMaterial> findByMapDayIdOrderByDisplayOrderAsc(Long mapDayId);
}
