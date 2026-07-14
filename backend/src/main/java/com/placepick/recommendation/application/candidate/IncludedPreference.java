package com.placepick.recommendation.application.candidate;

import com.placepick.recommendation.condition.domain.Preference;
import java.util.Objects;

public record IncludedPreference(Preference preference, int originalIndex) {

    public IncludedPreference {
        preference = Objects.requireNonNull(preference, "preference");
        if (originalIndex < 0) {
            throw new IllegalArgumentException("originalIndex must not be negative.");
        }
    }
}
