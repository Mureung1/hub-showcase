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
        String metadataProvider,
        String metadataProviderId,
        String isbn10,
        String isbn13,
        int initialPage,
        Integer pageCount,
        BookStatus status,
        String finalReview,
        Instant completedAt,
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
                book.getMetadataProvider(),
                book.getMetadataProviderId(),
                book.getIsbn10(),
                book.getIsbn13(),
                book.getInitialPage(),
                book.getPageCount(),
                book.getStatus(),
                book.getFinalReview(),
                book.getCompletedAt(),
                latestRecord == null ? book.getInitialPage() : latestRecord.endPage() + 1,
                latestRecord,
                records,
                book.getCreatedAt()
        );
    }
}
