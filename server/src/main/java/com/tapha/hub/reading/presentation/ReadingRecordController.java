package com.tapha.hub.reading.presentation;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
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
}
