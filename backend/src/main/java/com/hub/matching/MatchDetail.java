package com.hub.matching;

import com.hub.position.Necessity;
import com.hub.position.RequirementType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * 요구조건별 기여도. 이 테이블이 곧 F5 "방향 제시"의 데이터 소스다.
 *
 * ── 기존 대비 추가된 컬럼 ─────────────────────────
 * weight / contribution / gate / type / necessity / note / requirementText
 * ─────────────────────────────────────────────
 * requirementText 를 복사해 두는 이유: 공고가 마감·수정돼도 상세 화면이 깨지지 않는다.
 */
@Entity
@Table(name = "match_detail")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class MatchDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_score_id")
    @Setter(AccessLevel.PACKAGE)
    private MatchScore matchScore;

    private Long requirementId;

    @Column(length = 500)
    private String requirementText;

    @Enumerated(EnumType.STRING)
    @Column(length = 32)
    private RequirementType type;

    @Enumerated(EnumType.STRING)
    @Column(length = 16)
    private Necessity necessity;

    @Column(precision = 5, scale = 4)
    private BigDecimal weight;

    @Column(precision = 4, scale = 3)
    private BigDecimal fulfillment;

    @Column(precision = 5, scale = 4)
    private BigDecimal contribution;

    /** 우대 조건은 항상 1.0 */
    @Column(precision = 4, scale = 3)
    private BigDecimal gate;

    @Column(length = 1000)
    private String evidence;

    @Column(length = 200)
    private String note;

    /** 보완 우선순위: 가중치는 높은데 충족도가 낮은 항목 */
    public BigDecimal gapPriority() {
        return weight.multiply(BigDecimal.ONE.subtract(fulfillment));
    }

    public boolean isRequiredGap() {
        return necessity == Necessity.REQUIRED
                && fulfillment.compareTo(BigDecimal.ONE) < 0;
    }
}
