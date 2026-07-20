package com.tapha.hub.book.presentation;

import java.time.Instant;

import com.tapha.hub.book.domain.Book;
import com.tapha.hub.book.domain.BookStatus;
import com.tapha.hub.reading.presentation.ReadingRecordSummary;

public record BookResponse(
        Long id,
        String title,
        String author,
        int initialPage,
        BookStatus status,
        String finalReview,
        Instant completedAt,
        int recordCount,
        int nextStartPage,
        ReadingRecordSummary latestRecord,
        Instant createdAt
) {
    public static BookResponse from(Book book) {
        return from(book, 0, null);
    }

    public static BookResponse from(Book book, long recordCount, ReadingRecordSummary latestRecord) {
        return new BookResponse(
                book.getId(),
                book.getTitle(),
                book.getAuthor(),
                book.getInitialPage(),
                book.getStatus(),
                book.getFinalReview(),
                book.getCompletedAt(),
                Math.toIntExact(recordCount),
                latestRecord == null ? book.getInitialPage() : latestRecord.endPage() + 1,
                latestRecord,
                book.getCreatedAt()
        );
    }
}
