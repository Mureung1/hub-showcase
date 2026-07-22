package com.hub.matching.evaluator;

import com.hub.credential.Credential;
import com.hub.matching.EmbeddingPort;
import com.hub.matching.FulfillmentEvaluator;
import com.hub.matching.Recency;
import com.hub.position.JobRequirement;
import com.hub.position.RequirementType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

/**
 * f = sim × depth × recency
 *
 * 유사도 하나만 쓰면 "5년 전에 이름만 들어본 기술"이 만점을 받는다.
 * 세 축을 곱해야 걸러진다.
 */
@Component
@RequiredArgsConstructor
public class SkillUseEvaluator implements FulfillmentEvaluator {

    private final EmbeddingPort embedding;

    @Override
    public RequirementType supports() { return RequirementType.SKILL_USE; }

    @Override
    public Result evaluate(JobRequirement req, List<Credential> credentials) {
        Credential best = null;
        BigDecimal bestScore = BigDecimal.ZERO;
        BigDecimal bestSim = BigDecimal.ZERO;

        for (Credential c : credentials) {
            // 정규화 사전 매칭 성공 시 1.0, 실패 시 임베딩 유사도로 폴백
            BigDecimal sim = req.getSubject() != null && req.getSubject().equals(c.getSubject())
                    ? BigDecimal.ONE
                    : embedding.similarity(req.getName(), c.getTitle() + " " + c.getDetail());

            BigDecimal score = sim
                    .multiply(c.getDepth().factor())
                    .multiply(Recency.decay(c.getEndedOn()));

            if (score.compareTo(bestScore) > 0) {
                bestScore = score;
                bestSim = sim;
                best = c;
            }
        }

        if (best == null || bestScore.signum() == 0) return Result.none("관련 이력 없음");

        String note = String.format("유사도 %.2f × 깊이 %.1f × 최신성 %.2f",
                bestSim.doubleValue(),
                best.getDepth().factor().doubleValue(),
                Recency.decay(best.getEndedOn()).doubleValue());
        return Result.of(bestScore, best.getTitle(), note);
    }
}
