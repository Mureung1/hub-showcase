package com.placepick.recommendation.reason.application.port.out;

public interface GroundedReasonGenerationPort {

    ReasonGenerationOutcome generate(ReasonGenerationCommand command);
}
