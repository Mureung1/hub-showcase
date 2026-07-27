package com.punchman.devpulse.domain;

import com.punchman.devpulse.normalizer.CertificationTextMatcher.MentionField;
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
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 규칙 기반 매칭이 놓친 것을 LLM이 새로 찾아낸 (공고, 자격증) 매칭 원장. 규칙이 이미 잡은
 * 조합은 여기 안 들어간다 — {@link com.punchman.devpulse.service.CertificationMentionRecalculationService}가
 * 규칙 매칭 결과와 이 원장을 합쳐 essential/preferred 카운트를 계산하므로 이중 집계가 없다.
 */
@Entity
@Table(name = "certification_llm_match",
        uniqueConstraints = @UniqueConstraint(columnNames = {"job_posting_id", "certification_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CertificationLlmMatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_posting_id", nullable = false)
    private JobPosting jobPosting;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "certification_id", nullable = false)
    private Certification certification;

    @Enumerated(EnumType.STRING)
    @Column(name = "mention_field", nullable = false, length = 20)
    private MentionField mentionField;
}
