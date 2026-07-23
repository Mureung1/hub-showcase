package com.hub.matching;

import java.util.List;

/** F4/F5 응답. 프론트 lib/types.ts 의 Position / PositionDetail 과 1:1 대응. */
public class PositionDto {

    /** 목록 카드 */
    public record Summary(
            Long id,
            String company,
            String title,
            String location,
            String experience,
            int fitScore,          // 0~100
            String collectedAt,
            String sourceUrl,
            List<String> tags
    ) {}

    /** 상세 — 요구조건 분해 + 방향 제시 */
    public record Detail(
            Long id,
            String company,
            String title,
            String location,
            String experience,
            int fitScore,
            String sourceUrl,
            String collectedAt,
            List<RequirementView> requirements,
            List<String> advice
    ) {}

    public record RequirementView(
            String name,
            boolean required,
            double weight,        // 0~1
            double fulfillment,   // 0~1
            String evidence
    ) {}
}
