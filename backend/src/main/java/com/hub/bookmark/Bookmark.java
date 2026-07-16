package com.hub.bookmark;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "bookmarks",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "posting_id"}))
public class Bookmark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "posting_id", nullable = false)
    private Long postingId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected Bookmark() {}   // JPA 기본 생성자

    public Bookmark(Long userId, Long postingId) {
        this.userId = userId;
        this.postingId = postingId;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId()          { return id; }
    public Long getUserId()      { return userId; }
    public Long getPostingId()   { return postingId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
