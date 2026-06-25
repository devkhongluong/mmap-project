package com.mmap.controller;

import com.mmap.dto.request.CreateTodoRequest;
import com.mmap.dto.response.TodoResponse;
import com.mmap.service.TodoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * REST Controller quản lý To-do List (Global).
 *
 * PROTECTED — cần JWT.
 *
 * Endpoints:
 *  GET    /api/todos?date=2026-06-25  → Todos theo ngày
 *  POST   /api/todos                  → Tạo todo mới
 *  PUT    /api/todos/{id}/toggle      → Toggle hoàn thành
 *  DELETE /api/todos/{id}             → Xóa todo
 */
@RestController
@RequestMapping("/api/todos")
@RequiredArgsConstructor
public class TodoController {

    private final TodoService todoService;

    /** Lấy todos của ngày cụ thể. Mặc định = hôm nay nếu không truyền date. */
    @GetMapping
    public ResponseEntity<List<TodoResponse>> getTodos(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam(defaultValue = "#{T(java.time.LocalDate).now().toString()}")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date) {
        return ResponseEntity.ok(todoService.getTodosByDate(user.getUsername(), date));
    }

    /** Tạo todo mới và trả về bản ghi đã lưu. */
    @PostMapping
    public ResponseEntity<TodoResponse> createTodo(
            @AuthenticationPrincipal UserDetails user,
            @Valid @RequestBody CreateTodoRequest req) {
        TodoResponse created = todoService.createTodo(user.getUsername(), req);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /** Toggle trạng thái PENDING ↔ COMPLETED. */
    @PutMapping("/{id}/toggle")
    public ResponseEntity<TodoResponse> toggleTodo(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long id) {
        return ResponseEntity.ok(todoService.toggleTodo(user.getUsername(), id));
    }

    /** Xóa todo (chỉ owner mới xóa được). */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTodo(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long id) {
        todoService.deleteTodo(user.getUsername(), id);
        return ResponseEntity.noContent().build();
    }
}
