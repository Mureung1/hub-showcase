package com.placepick.recommendation.domain.scoring;

import com.placepick.recommendation.domain.candidate.CandidateEvidence;
import com.placepick.recommendation.domain.candidate.NormalizedCandidate;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public record RankedPlace(
    UUID placeId,
    NormalizedCandidate candidate,
    List<CandidateEvidence> evidence,
    ScoreBreakdown scoreBreakdown
) {

    public RankedPlace {
        placeId = Objects.requireNonNull(placeId, "placeId");
        if (placeId.version() != 4) {
            throw new IllegalArgumentException("Public placeId must be UUID v4.");
        }
        candidate = Objects.requireNonNull(candidate, "candidate");
        evidence = List.copyOf(evidence);
        scoreBreakdown = Objects.requireNonNull(scoreBreakdown, "scoreBreakdown");
    }

    public int score() {
        return scoreBreakdown.total();
    }
}
