package com.hub.position;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * LLM이 공고 원문에서 뽑아낸 요구조건 (기획서 4.3 / 적합도_계산_설계.md 1장).
 *
 * ── 이번 보강 ──────────────────────────────────────────────
 *  기존 : id, posting, name, required(boolean), weight
 *  이후 : necessity 로 required 대체 + type/subject/threshold/
 *         sourcePosition/mentionCount 정형화 컬럼 추가
 *
 *  이유: MatchingEngine·WeightEstimator·evaluator 가 이 필드들을
 *        호출하는데 엔티티에 없어서 컴파일이 깨져 있었다.
 * ──────────────────────────────────────────────────────────
 */
@Entity
@Table(name = "job_requirements")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobRequirement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "posting_id", nullable = false)
    private JobPosting posting;

    @Column(nullable = false)
    private String name;

    /** 필수/우대. 게이트 대상 여부와 가중치 base 의 근거 */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Necessity necessity;

    /** 수동 오버라이드 가중치 0~1. null 이면 WeightEstimator 가 추정한다 */
    @Column(precision = 4, scale = 3)
    private BigDecimal weight;

    /** 충족도 계산 전략 선택 키. UNCLASSIFIED 는 키워드 폴백 */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private RequirementType type;

    /** 정규화된 대상 (python, aws ...). null 이면 미분류 */
    @Column(length = 100)
    private String subject;

    /** EXPERIENCE_YEARS 요구 연차 */
    @Column(precision = 5, scale = 2)
    private BigDecimal threshold;

    /** 공고 내 위치 — 가중치 position_bonus */
    @Enumerated(EnumType.STRING)
    @Column(name = "source_position", nullable = false, length = 32)
    private SourcePosition sourcePosition;

    /** 공고 내 언급 횟수 — 가중치 frequency_bonus */
    @Column(name = "mention_count", nullable = false)
    private int mentionCount;

    @Builder
    public JobRequirement(String name, Necessity necessity, BigDecimal weight,
                          RequirementType type, String subject, BigDecimal threshold,
                          SourcePosition sourcePosition, Integer mentionCount) {
        this.name = name;
        this.necessity = necessity != null ? necessity : Necessity.PREFERRED;
        this.weight = weight;
        this.type = type != null ? type : RequirementType.UNCLASSIFIED;
        this.subject = subject;
        this.threshold = threshold;
        this.sourcePosition = sourcePosition != null ? sourcePosition : SourcePosition.UNKNOWN;
        this.mentionCount = mentionCount != null ? mentionCount : 1;
    }

    /**
     * 프론트 계약 유지용 파생 값.
     * PositionDto.RequirementView.required · MatchingService.toView 가 쓴다.
     */
    public boolean isRequired() {
        return necessity == Necessity.REQUIRED;
    }

    void assignTo(JobPosting posting) {
        this.posting = posting;
    }
}
