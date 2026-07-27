package com.tapha.hub.quote.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "quote_exposures")
public class QuoteExposure {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "quote_id")
    private Long quoteId;

    @Column(name = "book_id", nullable = false)
    private Long bookId;

    @Column(name = "quote_text_snapshot", nullable = false, length = 300)
    private String quoteTextSnapshot;

    @Column(name = "exposed_at", nullable = false, updatable = false)
    private Instant exposedAt;

    @Column(name = "opened_at")
    private Instant openedAt;

    @Column(name = "completed_reading_record_id")
    private Long completedReadingRecordId;

    protected QuoteExposure() {
    }

    public QuoteExposure(Long userId, Quote quote, Instant exposedAt) {
        this.userId = userId;
        this.quoteId = quote.getId();
        this.bookId = quote.getBookId();
        this.quoteTextSnapshot = quote.getText();
        this.exposedAt = exposedAt;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public Long getBookId() { return bookId; }
    public Long getCompletedReadingRecordId() { return completedReadingRecordId; }

    public void open(Instant openedAt) {
        if (this.openedAt == null) {
            this.openedAt = openedAt;
        }
    }

    public void complete(Long readingRecordId) {
        if (completedReadingRecordId == null) {
            completedReadingRecordId = readingRecordId;
        }
    }
}
