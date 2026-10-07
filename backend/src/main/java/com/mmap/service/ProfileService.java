package com.mmap.service;

import com.mmap.dto.response.ProfileResponse;
import com.mmap.entity.User;
import com.mmap.entity.DayProgressStatus;
import com.mmap.exception.ResourceNotFoundException;
import com.mmap.repository.UserRepository;
import com.mmap.repository.UserDayProgressRepository;
import com.mmap.repository.UserMapRepository;
import com.mmap.repository.UserSkillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Service tổng hợp Profile người dùng:
 *  - Thông tin cơ bản (username, email, ngày tạo)
 *  - Thống kê học tập (số ngày hoàn thành, số map)
 *  - Streak (số ngày học liên tiếp hiện tại)
 *  - Danh sách kỹ năng đã mở khóa
 */
@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserRepository            userRepository;
    private final UserMapRepository         userMapRepository;
    private final UserDayProgressRepository dayProgressRepository;
    private final UserSkillRepository       userSkillRepository;

    /** Lưu hoặc xoá Groq API key của user */
    @Transactional
    public void saveGroqKey(String email, String apiKey) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
        // Nếu gửi lên chuỗi rỗng → xoá key (dùng server key)
        user.setGroqApiKey(apiKey == null || apiKey.isBlank() ? null : apiKey.trim());
        userRepository.save(user);
    }

    /** Trả về trạng thái key: đã cài chưa + 8 ký tự đầu để hiển thị */
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getGroqKeyStatus(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
        String key = user.getGroqApiKey();
        boolean hasKey = key != null && !key.isBlank();
        String masked = hasKey ? key.substring(0, Math.min(8, key.length())) + "••••••••••••••••" : null;
        return java.util.Map.of("hasKey", hasKey, "maskedKey", masked != null ? masked : "");
    }

    /** Lấy Groq API key thực để dùng trong service (không expose ra ngoài) */
    @Transactional(readOnly = true)
    public String getGroqApiKey(String email) {
        return userRepository.findByEmail(email)
                .map(User::getGroqApiKey)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public ProfileResponse getProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));


        // Tổng số map đã đăng ký
        long totalMaps = userMapRepository.findByUserIdOrderByLastAccessedAtDesc(user.getId()).size();

        // Tổng ngày đã hoàn thành (toàn bộ maps)
        long totalDaysCompleted = dayProgressRepository
                .countByUserIdAndStatus(user.getId(), DayProgressStatus.COMPLETED);

        // Streak — tính số ngày liên tiếp gần nhất
        int streak = calculateStreak(user.getId());

        // Kỹ năng đã mở khóa
        List<ProfileResponse.SkillDto> skills = userSkillRepository.findByUserId(user.getId())
                .stream()
                .map(us -> new ProfileResponse.SkillDto(
                        us.getSkill().getId(),
                        us.getSkill().getSkillName(),
                        us.getSkill().getIconUrl(),
                        us.getUnlockedAt()
                ))
                .toList();

        return new ProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getCreatedAt(),
                (int) totalMaps,
                (int) totalDaysCompleted,
                streak,
                skills
        );
    }

    /**
     * Tính streak: đếm số ngày hoàn thành liên tiếp tính từ hôm nay ngược về quá khứ.
     * Dùng completedAt của UserDayProgress.
     */
    private int calculateStreak(Long userId) {
        // Lấy tất cả ngày COMPLETED, sắp xếp giảm dần theo completedAt
        List<OffsetDateTime> completedDates = dayProgressRepository
                .findCompletedDatesByUserId(userId);

        if (completedDates.isEmpty()) return 0;

        // Chuyển sang LocalDate và deduplicate (nhiều ngày có thể cùng date)
        var uniqueDates = completedDates.stream()
                .map(odt -> odt.toLocalDate())
                .distinct()
                .sorted((a, b) -> b.compareTo(a))   // Giảm dần
                .toList();

        var today    = OffsetDateTime.now().toLocalDate();
        var yesterday = today.minusDays(1);

        // Ngày gần nhất phải là hôm nay hoặc hôm qua mới được tính streak
        if (!uniqueDates.get(0).equals(today) && !uniqueDates.get(0).equals(yesterday)) {
            return 0;
        }

        // Đếm liên tiếp
        AtomicInteger streak = new AtomicInteger(1);
        for (int i = 1; i < uniqueDates.size(); i++) {
            if (uniqueDates.get(i - 1).minusDays(1).equals(uniqueDates.get(i))) {
                streak.incrementAndGet();
            } else {
                break;
            }
        }
        return streak.get();
    }
}
