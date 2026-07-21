package com.hub.matching;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/** 최신성 감쇠. exp(-λ × 경과년수), λ=0.15 → 5년 전 경험은 약 0.47 */
public final class Recency {

    public static final double LAMBDA = 0.15;

    private Recency() {}

    public static BigDecimal decay(LocalDate lastUsed) {
        if (lastUsed == null) return BigDecimal.ONE;   // 진행 중
        double years = ChronoUnit.DAYS.between(lastUsed, LocalDate.now()) / 365.25;
        if (years <= 0) return BigDecimal.ONE;
        return BigDecimal.valueOf(Math.exp(-LAMBDA * years));
    }
}
