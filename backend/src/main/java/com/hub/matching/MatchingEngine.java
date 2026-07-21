package com.hub.matching;

import com.hub.credential.Credential;
import com.hub.position.JobPosting;
import com.hub.position.JobRequirement;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 적합도 = ( Σ 가중치 × 충족도 ) × Π(필수 조건 게이트)
 *
 * ── 기존 대비 바뀐 점 ──────────────────────────────────
 * 1. evaluator 를 직접 주입받지 않고 EvaluatorRegistry 로 타입별 분기
 * 2. 가중치를 WeightEstimator 로 정규화 (Σw = 1 보장)
 * 3. 필수 조건 게이트 곱산 추가
 * 4. rebuild() 제거 — 상세를 먼저 모으고 MatchScore 를 한 번에 만든다
 * ──────────────────────────────────────────────────
 *
 * 게이트가 필요한 이유: 가중합만 쓰면 "필수 하나가 완전 미충족인데
 * 나머지가 좋아서 88%"가 나온다. 실제 지원 결과와 어긋나는 최대 원인이다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MatchingEngine {

    /** 게이트 하한. 골든셋 확보 후 튜닝 대상 */
    public static final BigDecimal GATE_FLOOR = new BigDecimal("0.4");
    private static final BigDecimal GATE_RANGE = BigDecimal.ONE.subtract(GATE_FLOOR);

    private final EvaluatorRegistry registry;
    private final WeightEstimator weightEstimator;

    public MatchScore calculate(Long userId, JobPosting posting, List<Credential> credentials) {
        List<JobRequirement> requirements = posting.getRequirements();
        Map<Long, BigDecimal> weights = weightEstimator.estimate(requirements);

        List<MatchDetail> details = new ArrayList<>();
        BigDecimal weightedSum = BigDecimal.ZERO;
        BigDecimal gateProduct = BigDecimal.ONE;
        BigDecimal evidenceWeight = BigDecimal.ZERO;
        BigDecimal totalWeight = BigDecimal.ZERO;

        for (JobRequirement req : requirements) {
            BigDecimal weight = weights.getOrDefault(req.getId(), BigDecimal.ZERO);
            FulfillmentEvaluator.Result result =
                    registry.resolve(req.getType()).evaluate(req, credentials);

            BigDecimal contribution = weight.multiply(result.fulfillment());
            weightedSum = weightedSum.add(contribution);

            BigDecimal gate = BigDecimal.ONE;
            if (req.getNecessity().isGated()) {
                gate = GATE_FLOOR.add(GATE_RANGE.multiply(result.fulfillment()));
                gateProduct = gateProduct.multiply(gate);
            }

            totalWeight = totalWeight.add(weight);
            if (result.hasEvidence()) evidenceWeight = evidenceWeight.add(weight);

            details.add(MatchDetail.builder()
                    .requirementId(req.getId())
                    .requirementText(req.getName())
                    .type(req.getType())
                    .necessity(req.getNecessity())
                    .weight(weight)
                    .fulfillment(result.fulfillment())
                    .contribution(contribution)
                    .gate(gate)
                    .evidence(result.evidence())
                    .note(result.note())
                    .build());
        }

        BigDecimal total = weightedSum.multiply(gateProduct);
        BigDecimal confidence = totalWeight.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : evidenceWeight.divide(totalWeight, MathContext.DECIMAL64);

        MatchScore matchScore = MatchScore.builder()
                .userId(userId)
                .postingId(posting.getId())
                .score(toPercent(total))
                .weightedSum(weightedSum)
                .confidence(confidence)
                .build();
        details.forEach(matchScore::addDetail);

        log.debug("적합도 계산: user={} posting={} 가중합={} 게이트={} 최종={}",
                userId, posting.getId(), weightedSum, gateProduct, matchScore.getScore());

        return matchScore;
    }

    private short toPercent(BigDecimal value) {
        return value.multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .shortValue();
    }
}
