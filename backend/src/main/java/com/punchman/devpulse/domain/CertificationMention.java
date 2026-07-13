package com.punchman.devpulse.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "certification_mention",
        uniqueConstraints = @UniqueConstraint(columnNames = {"certification_id", "job_title"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CertificationMention {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "certification_id", nullable = false)
    private Certification certification;

    @Column(name = "job_title", nullable = false, length = 100)
    private String jobTitle;

    @Column(name = "total_posting_count", nullable = false)
    private Integer totalPostingCount;

    @Column(name = "mention_count", nullable = false)
    private Integer mentionCount;
}
