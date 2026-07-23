package com.tapha.hub.reading.presentation;

import java.time.Instant;

import com.tapha.hub.reading.domain.ReadingRecord;

public record ReadingRecordSummary(
        Long id,
        int startPage,
        int endPage,
        String impression,
        Integer readingDurationSeconds,
        Instant createdAt
) {
    public static ReadingRecordSummary from(ReadingRecord record) {
        return new ReadingRecordSummary(record.getId(), record.getStartPage(), record.getEndPage(), record.getImpression(), record.getReadingDurationSeconds(), record.getCreatedAt());
    }
}
