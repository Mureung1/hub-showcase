package com.placepick.recommendation.condition.application.port.out;

import com.placepick.recommendation.condition.domain.DraftRecommendationCondition;
import java.util.List;
import java.util.Objects;

/** Provider-neutral result that never exposes provider payloads or credentials. */
public record ExtractionOutcome(
    ConditionExtractionErrorCode errorCode,
    DraftRecommendationCondition condition,
    List<ConditionWarning> warnings
) {

    public static final String SCHEMA_VERSION = "placepick.condition-extraction.v1";

    public ExtractionOutcome {
        errorCode = Objects.requireNonNull(errorCode, "errorCode");
        warnings = List.copyOf(warnings);
        if (errorCode == ConditionExtractionErrorCode.NONE) {
            if (condition == null || !condition.isProcessable()) {
                throw new IllegalArgumentException(
                    "Successful extraction requires a processable draft condition."
                );
            }
        } else if (condition != null) {
            throw new IllegalArgumentException("Failed extraction must not expose a condition.");
        }
    }

    public static ExtractionOutcome extracted(
        DraftRecommendationCondition condition,
        List<ConditionWarning> warnings
    ) {
        return new ExtractionOutcome(ConditionExtractionErrorCode.NONE, condition, warnings);
    }

    public static ExtractionOutcome unprocessable(List<ConditionWarning> warnings) {
        return new ExtractionOutcome(
            ConditionExtractionErrorCode.UNPROCESSABLE_CONDITION,
            null,
            warnings
        );
    }

    public static ExtractionOutcome providerFailure(ConditionExtractionErrorCode errorCode) {
        if (errorCode == ConditionExtractionErrorCode.NONE ||
            errorCode == ConditionExtractionErrorCode.UNPROCESSABLE_CONDITION) {
            throw new IllegalArgumentException("Provider failure code is required.");
        }
        return new ExtractionOutcome(errorCode, null, List.of());
    }

    public boolean extracted() {
        return errorCode == ConditionExtractionErrorCode.NONE;
    }
}
