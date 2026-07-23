package com.tapha.hub.common.presentation;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.tapha.hub.common.application.ResourceNotFoundException;
import com.tapha.hub.common.application.InvalidRequestException;
import com.tapha.hub.book.application.BookProviderException;
import com.tapha.hub.book.application.DuplicateBookException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("요청 값을 확인해 주세요.");

        return ResponseEntity.badRequest().body(new ApiError("VALIDATION_ERROR", message));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(ResourceNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiError("NOT_FOUND", exception.getMessage()));
    }

    @ExceptionHandler(InvalidRequestException.class)
    public ResponseEntity<ApiError> handleInvalidRequest(InvalidRequestException exception) {
        return ResponseEntity.badRequest().body(new ApiError(exception.getCode(), exception.getMessage()));
    }

    @ExceptionHandler(DuplicateBookException.class)
    public ResponseEntity<ApiError> handleDuplicateBook(DuplicateBookException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ApiError("DUPLICATE_BOOK", exception.getMessage()));
    }

    @ExceptionHandler(BookProviderException.class)
    public ResponseEntity<ApiError> handleBookProvider(BookProviderException exception) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new ApiError("BOOK_PROVIDER_UNAVAILABLE", exception.getMessage()));
    }
}
