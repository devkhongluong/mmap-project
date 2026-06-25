package com.mmap.service;

import com.mmap.dto.request.CreateTodoRequest;
import com.mmap.dto.response.TodoResponse;
import com.mmap.entity.*;
import com.mmap.exception.BusinessException;
import com.mmap.exception.ResourceNotFoundException;
import com.mmap.repository.DailyTodoRepository;
import com.mmap.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Service quản lý To-do List (Global — không phụ thuộc Map đang học).
 */
@Service
@RequiredArgsConstructor
public class TodoService {

    private final DailyTodoRepository todoRepository;
    private final UserRepository      userRepository;

    // ── Lấy todos theo ngày ─────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TodoResponse> getTodosByDate(String email, LocalDate date) {
        User user = getUserByEmail(email);
        return todoRepository.findByUserIdAndDate(user.getId(), date)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ── Tạo todo mới ────────────────────────────────────────────────────

    @Transactional
    public TodoResponse createTodo(String email, CreateTodoRequest req) {
        User user = getUserByEmail(email);

        DailyTodo todo = DailyTodo.builder()
                .user(user)
                .taskContent(req.taskContent())
                .targetDate(req.targetDate())
                .dueTime(req.dueTime())     // null = "Cả ngày"
                .status(TodoStatus.PENDING)
                .build();

        return toResponse(todoRepository.save(todo));
    }

    // ── Toggle done ──────────────────────────────────────────────────────

    @Transactional
    public TodoResponse toggleTodo(String email, Long todoId) {
        User user = getUserByEmail(email);

        DailyTodo todo = todoRepository.findById(todoId)
                .filter(t -> t.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Todo không tồn tại"));

        todo.setStatus(todo.getStatus() == TodoStatus.PENDING
                ? TodoStatus.COMPLETED
                : TodoStatus.PENDING);

        return toResponse(todoRepository.save(todo));
    }

    // ── Xóa todo ────────────────────────────────────────────────────────

    @Transactional
    public void deleteTodo(String email, Long todoId) {
        User user = getUserByEmail(email);

        DailyTodo todo = todoRepository.findById(todoId)
                .filter(t -> t.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Todo không tồn tại"));

        todoRepository.delete(todo);
    }

    // ── Mapper ───────────────────────────────────────────────────────────

    private TodoResponse toResponse(DailyTodo t) {
        return new TodoResponse(
                t.getId(),
                t.getTaskContent(),
                t.getTargetDate(),
                t.getDueTime(),
                t.getStatus(),
                t.getStatus() == TodoStatus.COMPLETED
        );
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
    }
}
