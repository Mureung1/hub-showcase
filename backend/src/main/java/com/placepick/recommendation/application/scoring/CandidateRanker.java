package com.placepick.recommendation.application.scoring;

import com.placepick.recommendation.condition.domain.ConfirmedRecommendationCondition;
import com.placepick.recommendation.domain.candidate.CandidateEvidence;
import com.placepick.recommendation.domain.candidate.NormalizedCandidate;
import com.placepick.recommendation.domain.scoring.ScoredCandidate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

public final class CandidateRanker {

    private static final Comparator<ScoredCandidate> ORDER = Comparator
        .comparingInt(ScoredCandidate::score).reversed()
        .thenComparing(Comparator.comparingInt(ScoredCandidate::requiredMatchRate).reversed())
        .thenComparing(Comparator.comparingInt(
            (ScoredCandidate value) -> value.evidence().size()
        ).reversed())
        .thenComparing(value -> value.candidate().candidateKey());

    private final CandidateScoringPolicy scoringPolicy;

    public CandidateRanker(CandidateScoringPolicy scoringPolicy) {
        this.scoringPolicy = scoringPolicy;
    }

    public List<ScoredCandidate> rank(
        ConfirmedRecommendationCondition condition,
        List<NormalizedCandidate> candidates,
        Map<NormalizedCandidate, List<CandidateEvidence>> evidenceByCandidate
    ) {
        return candidates.stream()
            .map(candidate -> scoringPolicy.score(
                condition,
                candidate,
                evidenceByCandidate.getOrDefault(candidate, List.of())
            ))
            .sorted(ORDER)
            .toList();
    }
}
