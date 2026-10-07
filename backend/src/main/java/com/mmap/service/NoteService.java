package com.mmap.service;

import com.mmap.dto.request.SaveNoteRequest;
import com.mmap.dto.response.NoteHistoryResponse;
import com.mmap.entity.*;
import com.mmap.exception.BusinessException;
import com.mmap.exception.ResourceNotFoundException;
import com.mmap.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Service xử lý lưu Note và hoàn thành ngày học.
 *
 * Flow: allChecked → Popup Note → AI verify (FE tự gọi Gemini) → saveNote
 *       → mark day COMPLETED → unlock next day → check if map done
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NoteService {

    private final UserRepository                userRepository;
    private final MapDayRepository              mapDayRepository;
    private final DailyNoteRepository           noteRepository;
    private final UserDayProgressRepository     dayProgressRepository;
    private final UserMapRepository             userMapRepository;
    private final UserChecklistProgressRepository checklistProgressRepository;
    private final UserSkillRepository           userSkillRepository;

    // ── Lưu Note & Hoàn thành ngày ──────────────────────────────────────

    /**
     * Lưu note và xử lý:
     *  1. Validate 100% checkbox đã tick
     *  2. Upsert DailyNote
     *  3. Mark UserDayProgress → COMPLETED
     *  4. Unlock ngày tiếp theo
     *  5. Nếu là ngày cuối → mark map COMPLETED, unlock skills
     */
    @Transactional
    public void saveNote(String email, SaveNoteRequest req) {
        User user = getUserByEmail(email);
        MapDay day = mapDayRepository.findByIdWithChecklists(req.mapDayId())
                .orElseThrow(() -> new ResourceNotFoundException("Ngày học không tồn tại"));

        // 1. Validate: phải tick đủ 100% mới được lưu
        long totalChecks   = day.getChecklists().size();
        long checkedCount  = checklistProgressRepository
                .countCheckedByUserIdAndMapDayId(user.getId(), day.getId());

        if (totalChecks > 0 && checkedCount < totalChecks) {
            throw new BusinessException(
                    String.format("Bạn mới hoàn thành %d/%d mục. Cần tick hết trước khi lưu note.",
                            checkedCount, totalChecks));
        }

        // 2. Upsert DailyNote (nếu đã có thì update, chưa có thì insert)
        DailyNote note = noteRepository.findByUserIdAndMapDayId(user.getId(), day.getId())
                .orElse(DailyNote.builder().user(user).mapDay(day).build());
        note.setNoteContent(req.noteContent());
        noteRepository.save(note);

        // 3. Mark day COMPLETED
        UserDayProgress progress = dayProgressRepository
                .findByUserIdAndMapDayId(user.getId(), day.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Tiến độ ngày học không tồn tại"));
        progress.setStatus(DayProgressStatus.COMPLETED);
        progress.setCompletedAt(OffsetDateTime.now());
        dayProgressRepository.save(progress);

        // 4. Unlock ngày tiếp theo
        Integer mapId        = day.getMap().getId();
        Integer nextDayIndex = day.getDayIndex() + 1;
        Integer totalDays    = day.getMap().getTotalDays();

        if (nextDayIndex <= totalDays) {
            mapDayRepository.findByMapIdAndDayIndex(mapId, nextDayIndex)
                    .ifPresent(nextDay -> {
                        UserDayProgress nextProgress = dayProgressRepository
                                .findByUserIdAndMapDayId(user.getId(), nextDay.getId())
                                .orElse(UserDayProgress.builder()
                                        .user(user).mapDay(nextDay).build());
                        nextProgress.setStatus(DayProgressStatus.UNLOCKED);
                        dayProgressRepository.save(nextProgress);
                    });
        }

        // 5. Kiểm tra hoàn thành lộ trình
        long completedDays = dayProgressRepository
                .countByUserIdAndMapDayMapIdAndStatus(user.getId(), mapId, DayProgressStatus.COMPLETED);

        if (completedDays >= totalDays) {
            userMapRepository.findByUserIdAndMapId(user.getId(), mapId)
                    .ifPresent(um -> {
                        um.setStatus(UserMapStatus.COMPLETED);
                        um.setCompletedAt(OffsetDateTime.now());
                        userMapRepository.save(um);
                        unlockMapSkills(user, mapId);
                        log.info("🎉 User {} đã hoàn thành lộ trình: {}", email, um.getMap().getTitle());
                    });
        }

        log.info("User {} đã lưu note cho Day {} của Map {}", email, day.getDayIndex(), mapId);
    }

    // ── Lấy lịch sử Note ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<NoteHistoryResponse> getNoteHistory(String email, Integer mapId) {
        User user = getUserByEmail(email);
        return noteRepository.findNoteHistoryByUserIdAndMapId(user.getId(), mapId)
                .stream()
                .map(n -> new NoteHistoryResponse(
                        n.getId(),
                        n.getMapDay().getDayIndex(),
                        n.getMapDay().getDayTitle(),
                        n.getNoteContent(),
                        n.getCreatedAt()
                ))
                .toList();
    }

    // ── Unlock Skills ────────────────────────────────────────────────────

    private void unlockMapSkills(User user, Integer mapId) {
        // Lấy skills của map và grant cho user (ignore nếu đã có)
        mapDayRepository.findByMapIdAndDayIndex(mapId, 1)
                .map(d -> d.getMap().getMapSkills())
                .ifPresent(mapSkills -> mapSkills.forEach(ms -> {
                    if (!userSkillRepository.existsByUserIdAndSkillId(user.getId(), ms.getSkill().getId())) {
                        UserSkill userSkill = UserSkill.builder()
                                .user(user).skill(ms.getSkill()).build();
                        userSkillRepository.save(userSkill);
                        log.info("🏅 Unlock skill '{}' cho user {}", ms.getSkill().getSkillName(), user.getEmail());
                    }
                }));
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
    }
}
