package com.placepick.recommendation.reason.application.port.out;

import com.placepick.recommendation.reason.domain.GeneratedReasonBatch;
import java.util.Objects;

public record ReasonGenerationOutcome(
    ReasonGenerationErrorCode errorCode,
    GeneratedReasonBatch batch
) {

    public ReasonGenerationOutcome {
        errorCode = Objects.requireNonNull(errorCode, "errorCode");
        if ((errorCode == ReasonGenerationErrorCode.NONE) != (batch != null)) {
            throw new IllegalArgumentException("Reason generation outcome is inconsistent.");
        }
    }

    public static ReasonGenerationOutcome generated(GeneratedReasonBatch batch) {
        return new ReasonGenerationOutcome(
            ReasonGenerationErrorCode.NONE,
            Objects.requireNonNull(batch, "batch")
        );
    }

    public static ReasonGenerationOutcome providerFailure(ReasonGenerationErrorCode errorCode) {
        if (errorCode == ReasonGenerationErrorCode.NONE) {
            throw new IllegalArgumentException("A provider failure code is required.");
        }
        return new ReasonGenerationOutcome(errorCode, null);
    }

    public boolean generated() {
        return errorCode == ReasonGenerationErrorCode.NONE;
    }

    @Override
    public String toString() {
        return "ReasonGenerationOutcome[errorCode=" + errorCode +
            ", batch=" + (batch == null ? "absent" : "<redacted>") + "]";
    }
}
