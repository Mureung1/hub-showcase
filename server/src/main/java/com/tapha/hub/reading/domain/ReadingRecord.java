package com.tapha.hub.reading.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "reading_records")
public class ReadingRecord {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "book_id", nullable = false)
    private Long bookId;
    @Column(name = "user_id", nullable = false)
    private Long userId;
    @Column(name = "start_page", nullable = false)
    private int startPage;
    @Column(name = "end_page", nullable = false)
    private int endPage;
    @Column
    private String impression;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ReadingRecord() { }

    public ReadingRecord(Long bookId, Long userId, int startPage, int endPage, String impression, Instant createdAt) {
        this.bookId = bookId;
        this.userId = userId;
        this.startPage = startPage;
        this.endPage = endPage;
        this.impression = impression;
        this.createdAt = createdAt;
    }
    public Long getId() { return id; }
    public int getStartPage() { return startPage; }
    public int getEndPage() { return endPage; }
    public String getImpression() { return impression; }
    public Instant getCreatedAt() { return createdAt; }

    public void update(int endPage, String impression) {
        this.endPage = endPage;
        this.impression = impression;
    }
}
