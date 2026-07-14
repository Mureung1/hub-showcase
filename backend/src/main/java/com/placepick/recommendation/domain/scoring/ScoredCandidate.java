package com.placepick.recommendation.domain.scoring;

import com.placepick.recommendation.domain.candidate.CandidateEvidence;
import com.placepick.recommendation.domain.candidate.NormalizedCandidate;
import java.util.List;
import java.util.Objects;

public record ScoredCandidate(
    NormalizedCandidate candidate,
    List<CandidateEvidence> evidence,
    ScoreBreakdown scoreBreakdown,
    int requiredMatchRate
) {

    public ScoredCandidate {
        candidate = Objects.requireNonNull(candidate, "candidate");
        evidence = List.copyOf(evidence);
        scoreBreakdown = Objects.requireNonNull(scoreBreakdown, "scoreBreakdown");
        if (requiredMatchRate < 0 || requiredMatchRate > 100) {
            throw new IllegalArgumentException("requiredMatchRate must be between 0 and 100.");
        }
    }

    public int score() {
        return scoreBreakdown.total();
    }
}
