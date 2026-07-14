package com.hub.matching;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/** 요구조건별 충족도. 포지션 상세의 "적합도 근거"가 이걸 읽는다. */
@Entity
@Table(name = "match_details")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MatchDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_score_id", nullable = false)
    private MatchScore matchScore;

    @Column(name = "requirement_id", nullable = false)
    private Long requirementId;

    /** 0.000 ~ 1.000 */
    @Column(nullable = false, precision = 4, scale = 3)
    private BigDecimal fulfillment;

    /** 충족도 판단 근거 (예: "경력 4년 · 카카오페이/라인") */
    @Column(columnDefinition = "text")
    private String evidence;

    @Builder
    public MatchDetail(Long requirementId, BigDecimal fulfillment, String evidence) {
        this.requirementId = requirementId;
        this.fulfillment = fulfillment;
        this.evidence = evidence;
    }

    void assignTo(MatchScore matchScore) {
        this.matchScore = matchScore;
    }
}
