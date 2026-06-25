package com.mmap.service;

import com.mmap.entity.*;
import com.mmap.exception.ResourceNotFoundException;
import com.mmap.repository.UserChecklistProgressRepository;
import com.mmap.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service xử lý tick/untick Checkbox.
 *
 * Logic Upsert: nếu chưa có bản ghi → INSERT, đã có → UPDATE is_checked.
 * Dùng findByUserIdAndChecklistId + save (không cần custom merge query).
 */
@Service
@RequiredArgsConstructor
public class ChecklistService {

    private final UserChecklistProgressRepository checklistProgressRepository;
    private final UserRepository                  userRepository;

    /**
     * Toggle trạng thái checkbox.
     * @return trạng thái mới (true = checked, false = unchecked)
     */
    @Transactional
    public boolean toggleChecklist(String email, Long checklistId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));

        UserChecklistProgress progress = checklistProgressRepository
                .findByUserIdAndChecklistId(user.getId(), checklistId)
                .orElseGet(() -> {
                    // Lần đầu tick → tạo mới với is_checked = false
                    MapDayChecklist placeholder = new MapDayChecklist();
                    placeholder.setId(checklistId);
                    return UserChecklistProgress.builder()
                            .user(user)
                            .checklist(placeholder)
                            .isChecked(false)
                            .build();
                });

        progress.setIsChecked(!progress.getIsChecked());
        checklistProgressRepository.save(progress);
        return progress.getIsChecked();
    }
}
