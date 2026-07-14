package com.placepick.recommendation.condition.domain;

import java.util.List;
import java.util.Objects;

/** User-reviewed condition accepted by the recommendation workflow boundary. */
public record ConfirmedRecommendationCondition(
    String locationQuery,
    PlaceType placeType,
    String placeTypeDetail,
    Integer partySize,
    Integer budgetPerPersonMin,
    Integer budgetPerPersonMax,
    List<Preference> preferences,
    List<String> exclusions
) {

    public ConfirmedRecommendationCondition {
        DraftRecommendationCondition draft = new DraftRecommendationCondition(
            locationQuery,
            placeType,
            placeTypeDetail,
            partySize,
            budgetPerPersonMin,
            budgetPerPersonMax,
            preferences,
            exclusions
        );
        if (!draft.isProcessable()) {
            throw new IllegalArgumentException(
                "Confirmed condition requires a location query and place type."
            );
        }
        for (Preference preference : draft.preferences()) {
            if (preference.priority() == null) {
                throw new IllegalArgumentException(
                    "Confirmed condition requires every preference priority."
                );
            }
        }

        locationQuery = draft.locationQuery();
        placeType = Objects.requireNonNull(draft.placeType(), "placeType");
        placeTypeDetail = draft.placeTypeDetail();
        partySize = draft.partySize();
        budgetPerPersonMin = draft.budgetPerPersonMin();
        budgetPerPersonMax = draft.budgetPerPersonMax();
        preferences = draft.preferences();
        exclusions = draft.exclusions();
    }
}
