package com.punchman.devpulse.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "doc_status", uniqueConstraints = @UniqueConstraint(columnNames = {"project_id", "file_path"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(name = "file_path", nullable = false, length = 300)
    private String filePath;

    @Column(name = "last_code_change_at")
    private LocalDateTime lastCodeChangeAt;

    @Column(name = "last_doc_update_at")
    private LocalDateTime lastDocUpdateAt;

    @Column(name = "staleness_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal stalenessScore;

    @PrePersist
    void onCreate() {
        if (stalenessScore == null) {
            stalenessScore = BigDecimal.ZERO;
        }
    }
}
