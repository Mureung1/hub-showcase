package com.tapha.hub.quote.presentation;

import java.time.Instant;

import com.tapha.hub.quote.domain.Quote;

public record QuoteResponse(Long id, Long bookId, String text, Instant createdAt) {
    public static QuoteResponse from(Quote quote) {
        return new QuoteResponse(quote.getId(), quote.getBookId(), quote.getText(), quote.getCreatedAt());
    }
}
