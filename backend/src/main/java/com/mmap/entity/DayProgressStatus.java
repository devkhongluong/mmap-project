package com.mmap.entity;

/**
 * Enum trạng thái tiến độ ngày học trên Tree Map.
 */
public enum DayProgressStatus {
    LOCKED,    // Chưa mở khóa
    UNLOCKED,  // Đang học (ngày hiện tại)
    COMPLETED  // Đã hoàn thành + lưu note
}
