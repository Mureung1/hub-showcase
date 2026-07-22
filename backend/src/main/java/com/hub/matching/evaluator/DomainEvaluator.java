package com.hub.matching.evaluator;

import com.hub.credential.Credential;
import com.hub.credential.CredentialType;
import com.hub.matching.EmbeddingPort;
import com.hub.matching.FulfillmentEvaluator;
import com.hub.matching.Recency;
import com.hub.position.JobRequirement;
import com.hub.position.RequirementType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

/** 도메인 경험. 유사도 × 최신성 (depth 는 적용하지 않음) */
@Component
@RequiredArgsConstructor
public class DomainEvaluator implements FulfillmentEvaluator {

    private static final BigDecimal FLOOR = new BigDecimal("0.4");

    private final EmbeddingPort embedding;

    @Override
    public RequirementType supports() { return RequirementType.DOMAIN; }

    @Override
    public Result evaluate(JobRequirement req, List<Credential> credentials) {
        Credential best = null;
        BigDecimal bestScore = BigDecimal.ZERO;

        for (Credential c : credentials) {
            if (c.getType() != CredentialType.CAREER && c.getType() != CredentialType.COMPANY) continue;
            BigDecimal score = embedding
                    .similarity(req.getName(), c.getTitle() + " " + c.getDetail())
                    .multiply(Recency.decay(c.getEndedOn()));
            if (score.compareTo(bestScore) > 0) {
                bestScore = score;
                best = c;
            }
        }

        if (best == null || bestScore.compareTo(FLOOR) < 0) return Result.none("도메인 경험 없음");
        return Result.of(bestScore, best.getTitle(), "도메인 유사도 기반");
    }
}
