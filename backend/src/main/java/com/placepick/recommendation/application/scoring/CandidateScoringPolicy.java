package com.placepick.recommendation.application.scoring;

import com.placepick.recommendation.application.candidate.SearchTextNormalizer;
import com.placepick.recommendation.condition.domain.ConfirmedRecommendationCondition;
import com.placepick.recommendation.domain.candidate.CandidateEvidence;
import com.placepick.recommendation.domain.candidate.NormalizedCandidate;
import com.placepick.recommendation.domain.scoring.ScoreBreakdown;
import com.placepick.recommendation.domain.scoring.ScoredCandidate;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

public final class CandidateScoringPolicy {

    private static final int LOCATION_SCORE = 30;
    private static final int PLACE_TYPE_SCORE = 25;
    private static final int MAX_PREFERENCE_SCORE = 15;

    public ScoredCandidate score(
        ConfirmedRecommendationCondition condition,
        NormalizedCandidate candidate,
        List<CandidateEvidence> evidence
    ) {
        int preferenceScore = preferenceScore(condition, candidate);
        int evidenceScore = switch (Math.min(evidence.size(), 3)) {
            case 0 -> 0;
            case 1 -> 3;
            case 2 -> 7;
            default -> 10;
        };
        return new ScoredCandidate(
            candidate,
            evidence,
            new ScoreBreakdown(
                LOCATION_SCORE,
                PLACE_TYPE_SCORE,
                0,
                preferenceScore,
                evidenceScore
            ),
            100
        );
    }

    private int preferenceScore(
        ConfirmedRecommendationCondition condition,
        NormalizedCandidate candidate
    ) {
        int totalPriority = condition.preferences().stream()
            .mapToInt(value -> value.priority())
            .sum();
        if (totalPriority == 0) {
            return 0;
        }
        int matchedPriority = condition.preferences().stream()
            .filter(value -> candidate.searchableText().contains(
                SearchTextNormalizer.comparison(value.value())
            ))
            .mapToInt(value -> value.priority())
            .sum();
        return BigDecimal.valueOf(MAX_PREFERENCE_SCORE)
            .multiply(BigDecimal.valueOf(matchedPriority))
            .divide(BigDecimal.valueOf(totalPriority), 0, RoundingMode.HALF_UP)
            .intValueExact();
    }
}
