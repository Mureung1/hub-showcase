package com.placepick.recommendation.application.scoring;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.placepick.recommendation.condition.domain.ConfirmedRecommendationCondition;
import com.placepick.recommendation.condition.domain.PlaceType;
import com.placepick.recommendation.condition.domain.Preference;
import com.placepick.recommendation.domain.candidate.CandidateEvidence;
import com.placepick.recommendation.domain.candidate.CandidateKey;
import com.placepick.recommendation.domain.candidate.NormalizedCandidate;
import com.placepick.recommendation.domain.scoring.ScoredCandidate;
import com.placepick.recommendation.domain.scoring.ScoreBreakdown;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class CandidateScoringPolicyTest {

    private final CandidateScoringPolicy policy = new CandidateScoringPolicy();

    @Test
    void calculatesExplainableComponentsAndHalfUpPreferenceScore() {
        ConfirmedRecommendationCondition condition = condition(List.of(
            new Preference("조용함", 2),
            new Preference("주차", 1)
        ));
        NormalizedCandidate candidate = candidate("a", "조용함이 있는 카페");

        ScoredCandidate scored = policy.score(condition, candidate, evidence(2));

        assertThat(scored.scoreBreakdown().location()).isEqualTo(30);
        assertThat(scored.scoreBreakdown().placeType()).isEqualTo(25);
        assertThat(scored.scoreBreakdown().budget()).isZero();
        assertThat(scored.scoreBreakdown().preference()).isEqualTo(10);
        assertThat(scored.scoreBreakdown().blogEvidence()).isEqualTo(7);
        assertThat(scored.score()).isEqualTo(72);
    }

    @Test
    void mapsBlogEvidenceCountsToTheFixedPolicy() {
        ConfirmedRecommendationCondition condition = condition(List.of());
        NormalizedCandidate candidate = candidate("b", "카페");

        assertThat(policy.score(condition, candidate, evidence(0)).score()).isEqualTo(55);
        assertThat(policy.score(condition, candidate, evidence(1)).score()).isEqualTo(58);
        assertThat(policy.score(condition, candidate, evidence(2)).score()).isEqualTo(62);
        assertThat(policy.score(condition, candidate, evidence(3)).score()).isEqualTo(65);
    }

    @Test
    void breaksCompleteTiesByInternalFingerprintNotInputOrder() {
        CandidateRanker ranker = new CandidateRanker(policy);
        ConfirmedRecommendationCondition condition = condition(List.of());
        NormalizedCandidate first = candidate("a", "카페");
        NormalizedCandidate second = candidate("b", "카페");

        List<ScoredCandidate> forward = ranker.rank(
            condition, List.of(second, first), Map.of()
        );
        List<ScoredCandidate> reverse = ranker.rank(
            condition, List.of(first, second), Map.of()
        );

        assertThat(forward).isEqualTo(reverse);
        assertThat(forward).extracting(value -> value.candidate().candidateKey())
            .containsExactlyElementsOf(List.of(first.candidateKey(), second.candidateKey()).stream()
                .sorted()
                .toList());
    }

    @Test
    void rejectsBudgetScoresUntilStructuredPriceEvidenceExists() {
        assertThatThrownBy(() -> new ScoreBreakdown(30, 25, 1, 15, 9))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("budget");
    }

    private ConfirmedRecommendationCondition condition(List<Preference> preferences) {
        return new ConfirmedRecommendationCondition(
            "서울",
            PlaceType.CAFE,
            null,
            null,
            10_000,
            20_000,
            preferences,
            List.of()
        );
    }

    private NormalizedCandidate candidate(String identity, String searchable) {
        return new NormalizedCandidate(
            CandidateKey.fromIdentity(identity),
            "카페 " + identity,
            "카페",
            "",
            "서울",
            "서울",
            "https://example.test/" + identity,
            searchable
        );
    }

    private List<CandidateEvidence> evidence(int count) {
        return java.util.stream.IntStream.range(0, count)
            .mapToObj(index -> new CandidateEvidence(
                "e-" + index,
                "제목",
                "요약",
                "https://blog.test/" + index
            ))
            .toList();
    }
}
