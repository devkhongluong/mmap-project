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

    @Mock
    private UserRepository userRepository;
    @Mock
    private MapDayRepository mapDayRepository;
    @Mock
    private DailyNoteRepository noteRepository;
    @Mock
    private UserDayProgressRepository dayProgressRepository;
    @Mock
    private UserMapRepository userMapRepository;
    @Mock
    private UserChecklistProgressRepository checklistProgressRepository;
    @Mock
    private UserSkillRepository userSkillRepository;

    @InjectMocks
    private NoteService noteService;

    private User mockUser;
    private LearningMap mockMap;
    private MapDay mockDay;

    @BeforeEach
    void setUp() {
        mockUser = User.builder().id(1).email("test@test.com").build();
        mockMap = LearningMap.builder().id(1).totalDays(2).build();
        mockDay = MapDay.builder().id(10).map(mockMap).dayIndex(1).build();
    }

    @Test
    void saveNote_Success_UnlocksNextDay() {
        // Arrange
        SaveNoteRequest req = new SaveNoteRequest(10, "Learned a lot today!");
        
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(mockUser));
        
        // Mock day with 1 checklist item
        mockDay.setChecklists(List.of(Checklist.builder().id(100).build()));
        when(mapDayRepository.findByIdWithChecklists(10)).thenReturn(Optional.of(mockDay));
        
        // Mock all checked
        when(checklistProgressRepository.countCheckedByUserIdAndMapDayId(1, 10)).thenReturn(1L);
        
        // Mock daily note not exists
        when(noteRepository.findByUserIdAndMapDayId(1, 10)).thenReturn(Optional.empty());
        
        // Mock current day progress
        UserDayProgress progress = UserDayProgress.builder().id(1000).status(DayProgressStatus.UNLOCKED).build();
        when(dayProgressRepository.findByUserIdAndMapDayId(1, 10)).thenReturn(Optional.of(progress));
        
        // Mock next day exists
        MapDay nextDay = MapDay.builder().id(11).map(mockMap).dayIndex(2).build();
        when(mapDayRepository.findByMapIdAndDayIndex(1, 2)).thenReturn(Optional.of(nextDay));
        
        // Mock next day progress not exists
        when(dayProgressRepository.findByUserIdAndMapDayId(1, 11)).thenReturn(Optional.empty());

        // Act
        noteService.saveNote("test@test.com", req);

        // Assert
        verify(noteRepository).save(any(DailyNote.class));
        assertEquals(DayProgressStatus.COMPLETED, progress.getStatus());
        verify(dayProgressRepository).save(progress);
        
        // Verify next day unlocked
        verify(dayProgressRepository, times(2)).save(any(UserDayProgress.class)); // 1 for current, 1 for next
    }

    @Test
    void saveNote_NotAllChecklistsChecked_ThrowsException() {
        // Arrange
        SaveNoteRequest req = new SaveNoteRequest(10, "Learned a lot today!");
        
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(mockUser));
        
        // Mock day with 2 checklist items
        mockDay.setChecklists(List.of(Checklist.builder().build(), Checklist.builder().build()));
        when(mapDayRepository.findByIdWithChecklists(10)).thenReturn(Optional.of(mockDay));
        
        // Mock only 1 checked
        when(checklistProgressRepository.countCheckedByUserIdAndMapDayId(1, 10)).thenReturn(1L);

        // Act & Assert
        BusinessException ex = assertThrows(BusinessException.class, () -> noteService.saveNote("test@test.com", req));
        assertTrue(ex.getMessage().contains("Cần tick hết trước khi lưu note"));
        
        verify(noteRepository, never()).save(any());
    }

    @Test
    void saveNote_DayNotFound_ThrowsException() {
        // Arrange
        SaveNoteRequest req = new SaveNoteRequest(999, "Note");
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(mockUser));
        when(mapDayRepository.findByIdWithChecklists(999)).thenReturn(Optional.empty());

        // Act & Assert
        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class, () -> noteService.saveNote("test@test.com", req));
        assertTrue(ex.getMessage().contains("Ngày học không tồn tại"));
    }
}
