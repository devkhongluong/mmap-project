package com.mmap.service;

import com.mmap.dto.response.*;
import com.mmap.entity.*;
import com.mmap.exception.ResourceNotFoundException;
import com.mmap.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Service quản lý Map của User:
 *  - Lấy danh sách map và tiến độ
 *  - Lấy chi tiết ngày học + checklists
 *  - Chuyển đổi Active Map (cập nhật last_accessed_at)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserMapService {

    private final UserRepository                 userRepository;
    private final UserMapRepository              userMapRepository;
    private final UserDayProgressRepository      dayProgressRepository;
    private final UserChecklistProgressRepository checklistProgressRepository;
    private final MapDayRepository               mapDayRepository;
    private final DailyNoteRepository            noteRepository;
    private final MapDayMaterialRepository       materialRepository;

    // ── Lấy danh sách Maps ──────────────────────────────────────────────

    /**
     * Trả về tất cả lộ trình của user, kèm tiến độ và tree nodes.
     * Sắp xếp: map được truy cập gần nhất lên đầu (để FE biết Active Map).
     */
    @Transactional(readOnly = true)
    public List<UserMapResponse> getUserMaps(String email) {
        User user = getUserByEmail(email);

        return userMapRepository.findByUserIdOrderByLastAccessedAtDesc(user.getId())
                .stream()
                .map(um -> buildUserMapResponse(user, um))
                .toList();
    }

    // ── Lấy chi tiết ngày học hiện tại ─────────────────────────────────

    /**
     * Tải ngày học hiện tại của user trong map:
     *  - Tìm ngày UNLOCKED đầu tiên (status = UNLOCKED)
     *  - Nếu không có → tất cả LOCKED (user vừa bắt đầu) → unlock ngày 1
     */
    @Transactional
    public DayDetailResponse getCurrentDay(String email, Integer mapId) {
        User user = getUserByEmail(email);

        // Tìm ngày đang học (UNLOCKED)
        List<UserDayProgress> progressList =
                dayProgressRepository.findTreeMapByUserIdAndMapId(user.getId(), mapId);

        UserDayProgress currentProgress = progressList.stream()
                .filter(p -> p.getStatus() == DayProgressStatus.UNLOCKED)
                .findFirst()
                .orElseGet(() -> {
                    // Chưa có ngày UNLOCKED → unlock ngày đầu tiên
                    return unlockFirstDay(user, mapId);
                });

        return buildDayDetailResponse(user, currentProgress);
    }

    // ── Cập nhật Active Map ─────────────────────────────────────────────

    @Transactional
    public void updateLastAccessed(String email, Long userMapId) {
        User user = getUserByEmail(email);

        UserMap userMap = userMapRepository.findById(userMapId)
                .filter(um -> um.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("UserMap không tồn tại"));

        userMapRepository.updateLastAccessedAt(userMap.getId(), OffsetDateTime.now());
        log.info("User {} switched to map {}", email, userMap.getMap().getTitle());
    }

    // ── Private helpers ─────────────────────────────────────────────────

    private UserMapResponse buildUserMapResponse(User user, UserMap um) {
        Integer mapId       = um.getMap().getId();
        Integer totalDays   = um.getMap().getTotalDays();

        // Đếm ngày đã hoàn thành
        long daysCompleted = dayProgressRepository
                .countByUserIdAndMapDayMapIdAndStatus(user.getId(), mapId, DayProgressStatus.COMPLETED);

        // Tính % tiến độ
        double pct = totalDays > 0 ? (daysCompleted * 100.0 / totalDays) : 0;

        // Xác định current day index (ngày UNLOCKED)
        List<UserDayProgress> treeProgress =
                dayProgressRepository.findTreeMapByUserIdAndMapId(user.getId(), mapId);

        int currentDayIndex = treeProgress.stream()
                .filter(p -> p.getStatus() == DayProgressStatus.UNLOCKED)
                .mapToInt(p -> p.getMapDay().getDayIndex())
                .findFirst()
                .orElse((int) daysCompleted + 1);

        // Build tree nodes
        List<TreeNodeResponse> nodes = treeProgress.stream()
                .map(p -> new TreeNodeResponse(
                        p.getMapDay().getId(),
                        p.getMapDay().getDayIndex(),
                        p.getMapDay().getDayTitle(),
                        p.getMapDay().getPhaseName(),
                        p.getStatus()
                ))
                .toList();

        return new UserMapResponse(
                um.getId(),
                mapId,
                um.getMap().getTitle(),
                um.getMap().getDescription(),
                totalDays,
                (int) daysCompleted,
                currentDayIndex,
                Math.round(pct * 10.0) / 10.0,
                um.getStatus(),
                um.getLastAccessedAt(),
                um.getStartedAt(),
                nodes
        );
    }

    private DayDetailResponse buildDayDetailResponse(User user, UserDayProgress progress) {
        MapDay day = mapDayRepository.findByIdWithChecklists(progress.getMapDay().getId())
                .orElseThrow(() -> new ResourceNotFoundException("MapDay không tồn tại"));

        // Lấy checked state của từng checkbox
        List<UserChecklistProgress> checklistProgress =
                checklistProgressRepository.findByUserIdAndMapDayId(user.getId(), day.getId());

        List<ChecklistItemResponse> items = day.getChecklists().stream()
                .map(cl -> {
                    boolean checked = checklistProgress.stream()
                            .filter(cp -> cp.getChecklist().getId().equals(cl.getId()))
                            .map(UserChecklistProgress::getIsChecked)
                            .findFirst()
                            .orElse(false);
                    return new ChecklistItemResponse(
                            cl.getId(),
                            cl.getCheckpointContent(),
                            cl.getDisplayOrder(),
                            checked
                    );
                })
                .toList();

        int checkedCount = (int) items.stream().filter(ChecklistItemResponse::isChecked).count();
        boolean dayCompleted = progress.getStatus() == DayProgressStatus.COMPLETED;

        // Lấy tài liệu lý thuyết của ngày học
        List<MaterialItemResponse> materials = materialRepository
                .findByMapDayIdOrderByDisplayOrderAsc(day.getId())
                .stream()
                .map(m -> new MaterialItemResponse(
                        m.getId(),
                        m.getTitle(),
                        m.getContentType(),
                        m.getContent(),
                        m.getDisplayOrder()
                ))
                .toList();

        return new DayDetailResponse(
                day.getId(),
                day.getDayIndex(),
                day.getDayTitle(),
                day.getPhaseName(),
                day.getWeekName(),
                items,
                items.size(),
                checkedCount,
                checkedCount == items.size() && !items.isEmpty(),
                dayCompleted,
                materials
        );
    }

    private UserDayProgress unlockFirstDay(User user, Integer mapId) {
        MapDay firstDay = mapDayRepository.findByMapIdAndDayIndex(mapId, 1)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy ngày học đầu tiên của map " + mapId));

        UserDayProgress progress = UserDayProgress.builder()
                .user(user)
                .mapDay(firstDay)
                .status(DayProgressStatus.UNLOCKED)
                .build();

        return dayProgressRepository.save(progress);
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại: " + email));
    }
}
