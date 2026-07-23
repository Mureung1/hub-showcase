package com.tapha.hub.book.presentation;

import com.tapha.hub.book.application.BookMetadata;

public record BookSearchResult(
        String providerId,
        String title,
        String author,
        String isbn10,
        String isbn13,
        String publishedDate,
        Integer pageCount
) {
    public static BookSearchResult from(BookMetadata book) {
        return new BookSearchResult(
                book.providerId(),
                book.title(),
                book.author(),
                book.normalizedIsbn10(),
                book.normalizedIsbn13(),
                book.publishedDate(),
                book.pageCount()
        );
    }
}
