package com.hub.matching;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * ── 기존 대비 추가된 컬럼 ─────────────────────────
 * weightedSum · confidence · credentialSetVersion
 * ─────────────────────────────────────────────
 *
 * weightedSum 과 score 를 둘 다 저장하는 이유:
 *   "조건만 보면 75%지만 필수 항목 미충족으로 30%" 라는 설명을
 *   프론트가 재계산 없이 만들 수 있다.
 */
@Entity
@Table(
    name = "match_score",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_match_score_cache",
        columnNames = {"user_id", "posting_id", "credential_set_version"})
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class MatchScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "posting_id", nullable = false)
    private Long postingId;

    /** 게이트까지 반영된 최종 점수 0~100 */
    private short score;

    /** 게이트 적용 전 가중합 0~1 */
    @Column(name = "weighted_sum", precision = 5, scale = 4)
    private BigDecimal weightedSum;

    /** 근거 확보 가중치 비율. 0.7 미만이면 화면에 구간으로 표시 */
    @Column(precision = 4, scale = 3)
    private BigDecimal confidence;

    /** 이력 버전. 캐시 키의 일부 */
    @Column(name = "credential_set_version")
    private Long credentialSetVersion;

    @Column(name = "calculated_at")
    @Builder.Default
    private Instant calculatedAt = Instant.now();

    @OneToMany(mappedBy = "matchScore", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<MatchDetail> details = new ArrayList<>();

    public void addDetail(MatchDetail detail) {
        details.add(detail);
        detail.setMatchScore(this);
    }

    /** F5 "내 이력으로 맞추는 방향" — 갭 우선순위 상위 N개 */
    public List<MatchDetail> topGaps(int n) {
        return details.stream()
                .filter(d -> d.getFulfillment().compareTo(BigDecimal.ONE) < 0)
                .sorted(Comparator.comparing(MatchDetail::gapPriority).reversed())
                .limit(n)
                .toList();
    }

    public boolean hasRequiredGap() {
        return details.stream().anyMatch(MatchDetail::isRequiredGap);
    }
}
