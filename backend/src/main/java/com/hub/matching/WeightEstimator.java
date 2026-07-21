package com.hub.matching;

import com.hub.position.JobRequirement;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.MathContext;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * w_raw = base(necessity) × position_bonus × frequency_bonus  →  Σw = 1 정규화
 *
 * JobRequirement.weight 가 이미 채워져 있으면 그 값을 우선한다(수동 오버라이드).
 * 비어 있을 때만 추정한다.
 */
@Component
public class WeightEstimator {

    private static final BigDecimal FREQUENCY_BONUS = new BigDecimal("1.15");

    public Map<Long, BigDecimal> estimate(List<JobRequirement> requirements) {
        Map<Long, BigDecimal> raw = new HashMap<>();
        BigDecimal sum = BigDecimal.ZERO;

        for (JobRequirement r : requirements) {
            BigDecimal w = r.getWeight() != null
                    ? r.getWeight()
                    : r.getNecessity().base()
                        .multiply(r.getSourcePosition().bonus())
                        .multiply(r.getMentionCount() >= 2 ? FREQUENCY_BONUS : BigDecimal.ONE);
            raw.put(r.getId(), w);
            sum = sum.add(w);
        }

        if (sum.compareTo(BigDecimal.ZERO) == 0) return raw;

        Map<Long, BigDecimal> normalized = new HashMap<>();
        for (var e : raw.entrySet()) {
            normalized.put(e.getKey(), e.getValue().divide(sum, MathContext.DECIMAL64));
        }
        return normalized;
    }
}
