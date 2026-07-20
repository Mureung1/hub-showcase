package com.tapha.hub.reading.presentation;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tapha.hub.reading.application.ReadingRecordService;

@RestController
@RequestMapping("/api/books/{bookId}/records")
public class ReadingRecordController {
    private final ReadingRecordService readingRecordService;
    public ReadingRecordController(ReadingRecordService readingRecordService) { this.readingRecordService = readingRecordService; }

    @PostMapping
    public ResponseEntity<CreateReadingRecordResponse> create(@PathVariable Long bookId, @Valid @RequestBody CreateReadingRecordRequest request) {
        return ResponseEntity.status(201).body(readingRecordService.create(bookId, request));
    }

    @PatchMapping("/{recordId}")
    public CreateReadingRecordResponse update(
            @PathVariable Long bookId,
            @PathVariable Long recordId,
            @Valid @RequestBody UpdateReadingRecordRequest request
    ) {
        return readingRecordService.update(bookId, recordId, request);
    }

    @DeleteMapping("/{recordId}")
    public DeleteReadingRecordResponse delete(
            @PathVariable Long bookId,
            @PathVariable Long recordId,
            @RequestParam Long userId
    ) {
        return readingRecordService.delete(bookId, recordId, userId);
    }
}
