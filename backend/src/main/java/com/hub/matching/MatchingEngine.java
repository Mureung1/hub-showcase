package com.hub.matching;

import com.hub.credential.Credential;
import com.hub.position.JobPosting;
import com.hub.position.JobRequirement;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * F4 — 적합도 매칭 엔진.
 *
 *   점수 = Σ ( 요구조건 가중치 × 내 이력의 충족도 )   ← 기획서 4.1
 *
 * 충족도 산출은 전략(FulfillmentEvaluator)으로 분리했다.
 * 1주차는 키워드 기반, 2주차에 임베딩(pgvector)으로 갈아끼운다.
 * 이 클래스는 그대로 둔 채 전략만 바꾸면 된다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MatchingEngine {

    private final FulfillmentEvaluator evaluator;

    public MatchScore calculate(Long userId, JobPosting posting, List<Credential> credentials) {
        BigDecimal total = BigDecimal.ZERO;
        MatchScore matchScore = MatchScore.builder()
                .userId(userId)
                .postingId(posting.getId())
                .score((short) 0)
                .build();

        for (JobRequirement req : posting.getRequirements()) {
            FulfillmentEvaluator.Result result = evaluator.evaluate(req, credentials);

            BigDecimal contribution = req.getWeight().multiply(result.fulfillment());
            total = total.add(contribution);

            matchScore.addDetail(MatchDetail.builder()
                    .requirementId(req.getId())
                    .fulfillment(result.fulfillment())
                    .evidence(result.evidence())
                    .build());
        }

        short score = total
                .multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .shortValue();

        log.debug("적합도 계산 완료: user={} posting={} score={}", userId, posting.getId(), score);
        return rebuild(matchScore, score);
    }

    /** score는 생성 시점에 알 수 없어 마지막에 확정한다. */
    private MatchScore rebuild(MatchScore src, short score) {
        MatchScore result = MatchScore.builder()
                .userId(src.getUserId())
                .postingId(src.getPostingId())
                .score(score)
                .build();
        src.getDetails().forEach(d -> result.addDetail(MatchDetail.builder()
                .requirementId(d.getRequirementId())
                .fulfillment(d.getFulfillment())
                .evidence(d.getEvidence())
                .build()));
        return result;
    }
}
