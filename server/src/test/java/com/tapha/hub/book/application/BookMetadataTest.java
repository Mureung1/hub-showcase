package com.tapha.hub.book.application;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class BookMetadataTest {

    @Test
    void usesTheSameEditionKeyForIsbn10AndIsbn13() {
        BookMetadata book = new BookMetadata(
                "GOOGLE_BOOKS", "volume", "책", null,
                "0-306-40615-2", null, null, null
        );

        assertEquals("ISBN13:9780306406157", book.editionKey());
    }
}
