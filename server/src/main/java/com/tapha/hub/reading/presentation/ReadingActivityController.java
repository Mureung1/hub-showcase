package com.tapha.hub.reading.presentation;

import java.time.LocalDate;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tapha.hub.auth.application.SessionAuth;
import com.tapha.hub.reading.application.ReadingRecordService;

@RestController
@RequestMapping("/api/reading-activity")
public class ReadingActivityController {
    private final ReadingRecordService readingRecordService;
    private final SessionAuth sessionAuth;

    public ReadingActivityController(ReadingRecordService readingRecordService, SessionAuth sessionAuth) {
        this.readingRecordService = readingRecordService;
        this.sessionAuth = sessionAuth;
    }

    @GetMapping
    public ReadingActivityResponse get(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            HttpServletRequest request
    ) {
        return readingRecordService.getActivity(sessionAuth.requireUserId(request), from, to);
    }
}
