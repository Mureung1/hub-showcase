package com.placepick.recommendation.domain.candidate;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class CandidateSourceUrlInvariantTest {

    @Test
    void rejectsNonHttpSourceUrlsAtTheDomainBoundary() {
        assertThatThrownBy(() -> new NormalizedCandidate(
            CandidateKey.fromIdentity("candidate"),
            "후보",
            "카페",
            "",
            "서울",
            "서울",
            "javascript:alert(1)",
            "후보 카페 서울"
        )).isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("HTTP(S)");

        assertThatThrownBy(() -> new CandidateEvidence(
            "e1",
            "근거",
            "요약",
            "https://user@example.test/private"
        )).isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("HTTP(S)");
    }
}
