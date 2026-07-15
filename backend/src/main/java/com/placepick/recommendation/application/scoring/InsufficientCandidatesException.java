package com.placepick.recommendation.application.scoring;

import java.io.Serial;

public final class InsufficientCandidatesException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    public InsufficientCandidatesException() {
        super("INSUFFICIENT_CANDIDATES");
    }
}
