package com.placepick.recommendation.condition.domain;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;

final class ConditionValues {

    static final int MAX_BUDGET = 10_000_000;

    private ConditionValues() {
    }

    static String requireText(String value, String field, int maximumLength) {
        String normalized = normalize(Objects.requireNonNull(value, field));
        if (normalized.isBlank() || codePointLength(normalized) > maximumLength) {
            throw new IllegalArgumentException(
                field + " must contain between 1 and " + maximumLength + " characters."
            );
        }
        return normalized;
    }

    static String optionalText(String value, String field, int maximumLength) {
        return value == null ? null : requireText(value, field, maximumLength);
    }

    static Integer optionalPartySize(Integer partySize) {
        if (partySize != null && (partySize < 1 || partySize > 100)) {
            throw new IllegalArgumentException("Party size must be between 1 and 100.");
        }
        return partySize;
    }

    static Integer optionalBudget(Integer budget, String field) {
        if (budget != null && (budget < 0 || budget > MAX_BUDGET)) {
            throw new IllegalArgumentException(
                field + " must be between 0 and " + MAX_BUDGET + "."
            );
        }
        return budget;
    }

    static List<Preference> preferences(List<Preference> preferences) {
        Objects.requireNonNull(preferences, "preferences");
        if (preferences.size() > 10) {
            throw new IllegalArgumentException("Preferences must not contain more than 10 items.");
        }
        LinkedHashSet<String> seen = new LinkedHashSet<>();
        List<Preference> normalized = new ArrayList<>();
        for (Preference preference : preferences) {
            Preference value = Objects.requireNonNull(preference, "preference");
            if (seen.add(value.value())) {
                normalized.add(value);
            }
        }
        return List.copyOf(normalized);
    }

    static List<String> exclusions(List<String> exclusions) {
        Objects.requireNonNull(exclusions, "exclusions");
        if (exclusions.size() > 10) {
            throw new IllegalArgumentException("Exclusions must not contain more than 10 items.");
        }
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        for (String exclusion : exclusions) {
            normalized.add(requireText(exclusion, "Exclusion", 50));
        }
        return List.copyOf(normalized);
    }

    static void validateCrossFields(
        PlaceType placeType,
        String placeTypeDetail,
        Integer budgetMinimum,
        Integer budgetMaximum
    ) {
        if (placeType == PlaceType.OTHER && placeTypeDetail == null) {
            throw new IllegalArgumentException("Other place type requires place type detail.");
        }
        if (placeType != PlaceType.OTHER && placeTypeDetail != null) {
            throw new IllegalArgumentException("Place type detail is only allowed for OTHER.");
        }
        if (budgetMinimum != null && budgetMaximum != null && budgetMinimum > budgetMaximum) {
            throw new IllegalArgumentException(
                "Minimum budget must not be greater than maximum budget."
            );
        }
    }

    private static String normalize(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFKC).strip();
    }

    private static int codePointLength(String value) {
        return value.codePointCount(0, value.length());
    }
}
