package com.placepick.recommendation.condition.domain;

public record Preference(String value, Integer priority) {

    public Preference {
        value = ConditionValues.requireText(value, "Preference value", 50);
        if (priority != null && (priority < 1 || priority > 10)) {
            throw new IllegalArgumentException("Preference priority must be between 1 and 10.");
        }
    }
}
