package com.punchman.devpulse.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "commit_log", uniqueConstraints = @UniqueConstraint(columnNames = {"project_id", "sha"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommitLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false, length = 64)
    private String sha;

    @Column(length = 100)
    private String author;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(nullable = false)
    private Integer additions;

    @Column(nullable = false)
    private Integer deletions;

    @Enumerated(EnumType.STRING)
    @Column(name = "change_type", length = 20)
    private ChangeType changeType;

    @Column(name = "committed_at", nullable = false)
    private LocalDateTime committedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (additions == null) {
            additions = 0;
        }
        if (deletions == null) {
            deletions = 0;
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
