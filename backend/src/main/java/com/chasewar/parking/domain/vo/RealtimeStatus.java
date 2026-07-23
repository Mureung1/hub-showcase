package com.chasewar.parking.domain.vo;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum RealtimeStatus {

    SPACIOUS("여유"),
    MODERATE("보통"),
    BUSY("혼잡"),
    FULL("만차");

    private static final double SPACIOUS_RATIO_THRESHOLD = 0.5;
    private static final double BUSY_RATIO_THRESHOLD = 0.1;

    private final String description;

    public static RealtimeStatus of(int totalSlots, int availableSlots) {
        if (availableSlots == 0) {
            return FULL;
        }

        double availableRatio = (double) availableSlots / totalSlots;
        if (availableRatio > SPACIOUS_RATIO_THRESHOLD) {
            return SPACIOUS;
        }
        if (availableRatio > BUSY_RATIO_THRESHOLD) {
            return MODERATE;
        }

        return BUSY;
    }
}
