package com.tapha.hub.book.presentation;

import java.time.Instant;
import java.util.List;

import com.tapha.hub.book.domain.Book;
import com.tapha.hub.book.domain.BookStatus;
import com.tapha.hub.reading.presentation.ReadingRecordSummary;

public record BookDetailResponse(
        Long id,
        String title,
        String author,
        int initialPage,
        BookStatus status,
        int nextStartPage,
        ReadingRecordSummary latestRecord,
        List<ReadingRecordSummary> readingRecords,
        Instant createdAt
) {
    public static BookDetailResponse from(Book book) {
        return from(book, List.of());
    }

    public static BookDetailResponse from(Book book, List<ReadingRecordSummary> records) {
        ReadingRecordSummary latestRecord = records.isEmpty() ? null : records.getLast();
        return new BookDetailResponse(
                book.getId(),
                book.getTitle(),
                book.getAuthor(),
                book.getInitialPage(),
                book.getStatus(),
                latestRecord == null ? book.getInitialPage() : latestRecord.endPage() + 1,
                latestRecord,
                records,
                book.getCreatedAt()
        );
    }
}
