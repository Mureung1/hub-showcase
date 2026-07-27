package com.tapha.hub.reading.presentation;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tapha.hub.auth.application.SessionAuth;
import com.tapha.hub.reading.application.ReadingRecordService;

@RestController
@RequestMapping("/api/books/{bookId}/records")
public class ReadingRecordController {
    private final ReadingRecordService readingRecordService;
    private final SessionAuth sessionAuth;

    public ReadingRecordController(ReadingRecordService readingRecordService, SessionAuth sessionAuth) {
        this.readingRecordService = readingRecordService;
        this.sessionAuth = sessionAuth;
    }

    @PostMapping
    public ResponseEntity<CreateReadingRecordResponse> create(
            @PathVariable Long bookId,
            @Valid @RequestBody CreateReadingRecordRequest request,
            HttpServletRequest servletRequest
    ) {
        return ResponseEntity.status(201).body(
                readingRecordService.create(bookId, sessionAuth.requireUserId(servletRequest), request)
        );
    }

    @PatchMapping("/{recordId}")
    public CreateReadingRecordResponse update(
            @PathVariable Long bookId,
            @PathVariable Long recordId,
            @Valid @RequestBody UpdateReadingRecordRequest request,
            HttpServletRequest servletRequest
    ) {
        return readingRecordService.update(
                bookId,
                recordId,
                sessionAuth.requireUserId(servletRequest),
                request
        );
    }

    @DeleteMapping("/{recordId}")
    public DeleteReadingRecordResponse delete(
            @PathVariable Long bookId,
            @PathVariable Long recordId,
            HttpServletRequest request
    ) {
        return readingRecordService.delete(bookId, recordId, sessionAuth.requireUserId(request));
    }
}
