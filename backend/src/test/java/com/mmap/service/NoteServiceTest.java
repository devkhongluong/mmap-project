package com.mmap.service;

import com.mmap.dto.request.SaveNoteRequest;
import com.mmap.entity.*;
import com.mmap.exception.BusinessException;
import com.mmap.exception.ResourceNotFoundException;
import com.mmap.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class NoteServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private MapDayRepository mapDayRepository;
    @Mock private DailyNoteRepository noteRepository;
    @Mock private UserDayProgressRepository dayProgressRepository;
    @Mock private UserMapRepository userMapRepository;
    @Mock private UserChecklistProgressRepository checklistProgressRepository;
    @Mock private UserSkillRepository userSkillRepository;

    @InjectMocks
    private NoteService noteService;

    private User mockUser;
    private LearningMap mockMap;
    private MapDay mockDay;

    @BeforeEach
    void setUp() {
        mockUser = User.builder().id(1L).email("test@test.com").build();
        mockMap  = LearningMap.builder().id(1).totalDays(2).build();
        mockDay  = MapDay.builder().id(10L).map(mockMap).dayIndex(1).build();
    }

    @Test
    void saveNote_Success_UnlocksNextDay() {
        // Arrange
        SaveNoteRequest req = new SaveNoteRequest(10L, "Learned a lot today!");

        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(mockUser));

        // day with 1 checklist item
        MapDayChecklist checklistItem = MapDayChecklist.builder().id(100L).build();
        mockDay.setChecklists(List.of(checklistItem));
        when(mapDayRepository.findByIdWithChecklists(10L)).thenReturn(Optional.of(mockDay));

        // All checked
        when(checklistProgressRepository.countCheckedByUserIdAndMapDayId(1L, 10L)).thenReturn(1L);

        // Daily note not exists
        when(noteRepository.findByUserIdAndMapDayId(1L, 10L)).thenReturn(Optional.empty());

        // Current day progress
        UserDayProgress progress = UserDayProgress.builder()
                .id(1000L).status(DayProgressStatus.UNLOCKED).build();
        when(dayProgressRepository.findByUserIdAndMapDayId(1L, 10L)).thenReturn(Optional.of(progress));

        // Next day exists
        MapDay nextDay = MapDay.builder().id(11L).map(mockMap).dayIndex(2).build();
        when(mapDayRepository.findByMapIdAndDayIndex(1, 2)).thenReturn(Optional.of(nextDay));

        // Next day progress not exists
        when(dayProgressRepository.findByUserIdAndMapDayId(1L, 11L)).thenReturn(Optional.empty());

        // Map not yet completed (completedDays < totalDays)
        when(dayProgressRepository.countByUserIdAndMapDayMapIdAndStatus(
                1L, 1, DayProgressStatus.COMPLETED)).thenReturn(0L);

        // Act
        noteService.saveNote("test@test.com", req);

        // Assert
        verify(noteRepository).save(any(DailyNote.class));
        assertEquals(DayProgressStatus.COMPLETED, progress.getStatus());
        // 2 saves: current progress + next day progress
        verify(dayProgressRepository, times(2)).save(any(UserDayProgress.class));
    }

    @Test
    void saveNote_NotAllChecklistsChecked_ThrowsException() {
        // Arrange
        SaveNoteRequest req = new SaveNoteRequest(10L, "Learned a lot today!");

        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(mockUser));

        // 2 checklist items
        mockDay.setChecklists(List.of(
                MapDayChecklist.builder().id(100L).build(),
                MapDayChecklist.builder().id(101L).build()
        ));
        when(mapDayRepository.findByIdWithChecklists(10L)).thenReturn(Optional.of(mockDay));

        // Only 1 of 2 checked
        when(checklistProgressRepository.countCheckedByUserIdAndMapDayId(1L, 10L)).thenReturn(1L);

        // Act & Assert
        BusinessException ex = assertThrows(BusinessException.class,
                () -> noteService.saveNote("test@test.com", req));
        assertTrue(ex.getMessage().contains("Cần tick hết trước khi lưu note"));
        verify(noteRepository, never()).save(any());
    }

    @Test
    void saveNote_DayNotFound_ThrowsException() {
        // Arrange
        SaveNoteRequest req = new SaveNoteRequest(999L, "Note");
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(mockUser));
        when(mapDayRepository.findByIdWithChecklists(999L)).thenReturn(Optional.empty());

        // Act & Assert
        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> noteService.saveNote("test@test.com", req));
        assertTrue(ex.getMessage().contains("Ngày học không tồn tại"));
    }

    @Test
    void saveNote_UserNotFound_ThrowsException() {
        // Arrange
        SaveNoteRequest req = new SaveNoteRequest(10L, "Note");
        when(userRepository.findByEmail("unknown@test.com")).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(ResourceNotFoundException.class,
                () -> noteService.saveNote("unknown@test.com", req));
    }
}
