package com.mmap.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Exception cho các lỗi nghiệp vụ (400 Bad Request).
 * Ví dụ: email đã tồn tại, chưa tick đủ 100% checkbox...
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class BusinessException extends RuntimeException {
    public BusinessException(String message) {
        super(message);
    }
}
