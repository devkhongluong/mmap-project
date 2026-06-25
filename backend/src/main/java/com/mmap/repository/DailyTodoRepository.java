package com.mmap.repository;

import com.mmap.entity.DailyTodo;
import com.mmap.entity.TodoStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface DailyTodoRepository extends JpaRepository<DailyTodo, Long> {

    /**
     * Tải todos của user theo ngày, sắp xếp: có giờ cụ thể trước, NULL (Cả ngày) sau.
     * Fix đúng sort bug "Cả ngày" từ frontend.
     */
    @Query("""
           SELECT dt FROM DailyTodo dt
           WHERE dt.user.id     = :userId
             AND dt.targetDate  = :date
           ORDER BY dt.dueTime ASC NULLS LAST, dt.createdAt ASC
           """)
    List<DailyTodo> findByUserIdAndDate(
            @Param("userId") Long userId,
            @Param("date")   LocalDate date
    );

    /** Lịch sử công việc theo ngày (đã xong + chưa xong) — dùng cho popup lịch sử */
    @Query("""
           SELECT dt.targetDate, COUNT(dt), SUM(CASE WHEN dt.status = 'COMPLETED' THEN 1 ELSE 0 END)
           FROM DailyTodo dt
           WHERE dt.user.id    = :userId
             AND dt.targetDate < :today
           GROUP BY dt.targetDate
           ORDER BY dt.targetDate DESC
           """)
    List<Object[]> findDailyStats(
            @Param("userId") Long userId,
            @Param("today")  LocalDate today
    );
}
