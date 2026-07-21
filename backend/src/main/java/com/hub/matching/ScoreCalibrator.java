package com.hub.matching;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

/**
 * 원점수는 60~85 구간에 몰려 변별이 되지 않는다.
 * 화면에 노출하는 값은 원점수가 아니라 이 보정값을 쓴다.
 *
 * MVP: 사용자 내 전체 포지션 대비 퍼센타일.
 * 골든셋이 쌓이면 isotonic regression 매핑으로 교체.
 */
@Component
public class ScoreCalibrator {

    /** confidence 임계값. 이 아래면 단정적 수치 대신 구간 표시 */
    private static final BigDecimal RANGE_THRESHOLD = new BigDecimal("0.7");

    public short percentile(short raw, List<Short> populationSorted) {
        if (populationSorted.isEmpty()) return raw;
        long below = populationSorted.stream().filter(v -> v < raw).count();
        return (short) Math.round(below * 100.0 / populationSorted.size());
    }

    public boolean shouldShowRange(BigDecimal confidence) {
        return confidence == null || confidence.compareTo(RANGE_THRESHOLD) < 0;
    }

    /** 구간 폭은 불확실성에 비례 */
    public short[] range(short display, BigDecimal confidence) {
        double margin = (1.0 - (confidence == null ? 0 : confidence.doubleValue())) * 20;
        return new short[]{
                (short) Math.max(0, display - Math.round(margin / 2)),
                (short) Math.min(100, display + Math.round(margin / 2))
        };
    }
}
