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

    @Column(name = "initial_page", nullable = false)
    private int initialPage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BookStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Book() {
    }

    public Book(Long userId, String title, String author, int initialPage, Instant createdAt) {
        this.userId = userId;
        this.title = title;
        this.author = author;
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

    public int getInitialPage() {
        return initialPage;
    }

    public BookStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
