package com.tapha.hub.book.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "books")
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(length = 255)
    private String author;

    @Column(name = "metadata_provider", length = 30)
    private String metadataProvider;

    @Column(name = "metadata_provider_id", length = 255)
    private String metadataProviderId;

    @Column(name = "isbn10", length = 10)
    private String isbn10;

    @Column(name = "isbn13", length = 13)
    private String isbn13;

    @Column(name = "edition_key", length = 255)
    private String editionKey;

    @Column(name = "initial_page", nullable = false)
    private int initialPage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BookStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "final_review", columnDefinition = "TEXT")
    private String finalReview;

    protected Book() {
    }

    public Book(Long userId, String title, String author, int initialPage, Instant createdAt) {
        this(userId, title, author, initialPage, createdAt, null, null, null, null, null);
    }

    public Book(
            Long userId,
            String title,
            String author,
            int initialPage,
            Instant createdAt,
            String metadataProvider,
            String metadataProviderId,
            String isbn10,
            String isbn13,
            String editionKey
    ) {
        this.userId = userId;
        this.title = title;
        this.author = author;
        this.metadataProvider = metadataProvider;
        this.metadataProviderId = metadataProviderId;
        this.isbn10 = isbn10;
        this.isbn13 = isbn13;
        this.editionKey = editionKey;
        this.initialPage = initialPage;
        this.status = BookStatus.READING;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getTitle() {
        return title;
    }

    public String getAuthor() {
        return author;
    }

    public String getMetadataProvider() {
        return metadataProvider;
    }

    public String getMetadataProviderId() {
        return metadataProviderId;
    }

    public String getIsbn10() {
        return isbn10;
    }

    public String getIsbn13() {
        return isbn13;
    }

    public String getEditionKey() {
        return editionKey;
    }

    public int getInitialPage() {
        return initialPage;
    }

    public BookStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public String getFinalReview() {
        return finalReview;
    }

    public void complete(String finalReview, Instant completedAt) {
        this.status = BookStatus.COMPLETED;
        this.finalReview = finalReview;
        this.completedAt = completedAt;
    }

    public void archive() {
        this.status = BookStatus.ARCHIVED;
    }

    public void resume() {
        this.status = BookStatus.READING;
    }
}
