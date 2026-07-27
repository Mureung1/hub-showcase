package com.tapha.hub.quote.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "quotes")
public class Quote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "book_id", nullable = false)
    private Long bookId;

    @Column(name = "quote_text", nullable = false, length = 300)
    private String text;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Quote() {
    }

    public Quote(Long userId, Long bookId, String text, Instant createdAt) {
        this.userId = userId;
        this.bookId = bookId;
        this.text = text;
        this.createdAt = createdAt;
        this.updatedAt = createdAt;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public Long getBookId() { return bookId; }
    public String getText() { return text; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void update(String text, Instant updatedAt) {
        this.text = text;
        this.updatedAt = updatedAt;
    }
}
