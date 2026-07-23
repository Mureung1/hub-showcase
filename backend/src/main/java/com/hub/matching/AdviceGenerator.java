package com.hub.matching;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * F5 — "내 이력으로 맞추는 방향".
 *
 * 규칙 기반 초안이다. 3주차에 LLM 호출로 교체하되, 반환 타입(List<String>)은 유지한다.
 * 프론트 AdviceList 는 순번을 우선순위로 읽으므로 순서가 곧 의미다.
 */
final class AdviceGenerator {

    private AdviceGenerator() {}

    static List<String> generate(List<PositionDto.RequirementView> requirements) {
        List<String> advice = new ArrayList<>();

        // 1. 가장 강한 무기 — 가중치 높고 완전 충족
        requirements.stream()
                .filter(r -> r.fulfillment() >= 1.0)
                .max(Comparator.comparingDouble(PositionDto.RequirementView::weight))
                .ifPresent(r -> advice.add(
                        "\"%s\"을(를) 맨 앞에 두세요. 이 공고에서 가중치가 가장 높은 조건이고, %s(으)로 이미 충족합니다."
                                .formatted(r.name(), r.evidence())));

        // 2. 가장 아픈 구멍 — 필수인데 미충족/부분충족
        requirements.stream()
                .filter(r -> r.required() && r.fulfillment() < 1.0)
                .max(Comparator.comparingDouble(PositionDto.RequirementView::weight))
                .ifPresent(r -> advice.add(
                        "\"%s\"은(는) 필수 조건인데 아직 부족합니다. 부풀리지 말고 실제 경험 범위를 좁혀서 정직하게 쓰는 편이 신뢰를 얻습니다."
                                .formatted(r.name())));

        // 3. 완전 공백
        requirements.stream()
                .filter(r -> r.fulfillment() == 0.0)
                .filter(r -> advice.stream().noneMatch(a -> a.contains("\"" + r.name() + "\"")))   // ← 추가
                .min(Comparator.comparingDouble(PositionDto.RequirementView::weight))
                .ifPresent(r -> advice.add(
                        "\"%s\"은(는) 공백입니다. 직접 경험이 없다면 인접 경험을 근거로 배치해 감점 폭을 줄이세요."
                                .formatted(r.name())));

        return advice;
    }
}
