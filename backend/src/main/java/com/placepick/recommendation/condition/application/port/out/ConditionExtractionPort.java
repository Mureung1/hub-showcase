package com.placepick.recommendation.condition.application.port.out;

@FunctionalInterface
public interface ConditionExtractionPort {

    ExtractionOutcome extract(ExtractionCommand command);
}
