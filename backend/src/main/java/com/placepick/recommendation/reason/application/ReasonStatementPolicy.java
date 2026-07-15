package com.placepick.recommendation.reason.application;

import com.placepick.recommendation.reason.domain.ReasonEvidence;
import com.placepick.recommendation.reason.domain.ReasonEvidenceType;
import com.placepick.recommendation.reason.domain.ReasonPlaceContext;
import com.placepick.recommendation.reason.domain.ReasonStatement;

/** Deterministic post-validation applied after strict JSON parsing. */
public final class ReasonStatementPolicy {

    public static final String LOCAL_STATEMENT_TEXT =
        "검증된 장소 정보에 따라 이 후보를 제안합니다.";
    public static final String BLOG_STATEMENT_TEXT =
        "연결된 블로그 근거를 함께 확인할 수 있습니다.";

    public boolean isSupported(
        ReasonStatement statement,
        ReasonPlaceContext place
    ) {
        if (statement.evidenceIds().size() != 1) {
            return false;
        }
        String evidenceId = statement.evidenceIds().get(0);
        ReasonEvidence evidence = place.evidence().stream()
            .filter(value -> value.evidenceId().equals(evidenceId))
            .findFirst()
            .orElse(null);
        return evidence != null && statement.text().equals(expectedText(evidence.type()));
    }

    public static String expectedText(ReasonEvidenceType type) {
        return switch (type) {
            case LOCAL -> LOCAL_STATEMENT_TEXT;
            case BLOG -> BLOG_STATEMENT_TEXT;
        };
    }
}
