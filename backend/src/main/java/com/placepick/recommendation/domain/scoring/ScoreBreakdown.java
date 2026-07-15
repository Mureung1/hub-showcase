package com.placepick.recommendation.domain.scoring;

public record ScoreBreakdown(
    int location,
    int placeType,
    int budget,
    int preference,
    int blogEvidence
) {

    public ScoreBreakdown {
        requireRange(location, 0, 30, "location");
        requireRange(placeType, 0, 25, "placeType");
        requireRange(budget, 0, 0, "budget");
        requireRange(preference, 0, 15, "preference");
        requireRange(blogEvidence, 0, 10, "blogEvidence");
        if (location + placeType + budget + preference + blogEvidence > 80) {
            throw new IllegalArgumentException(
                "Score total must not exceed the current evidence ceiling of 80."
            );
        }
    }

    public int total() {
        return location + placeType + budget + preference + blogEvidence;
    }

    private static void requireRange(int value, int min, int max, String field) {
        if (value < min || value > max) {
            throw new IllegalArgumentException(field + " score is outside its policy range.");
        }
    }
}
