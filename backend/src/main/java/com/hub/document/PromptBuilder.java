package com.hub.document;

import com.hub.credential.Credential;
import com.hub.matching.PositionDto;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 프롬프트를 코드 안에 흩뿌리지 않고 한 곳에 모은다.
 * 프롬프트는 튜닝 대상이라, 바뀔 곳이 한 파일이어야 한다.
 */
final class PromptBuilder {

    private PromptBuilder() {}

    static String build(DocType type, PositionDto.Detail position, List<Credential> credentials) {
        String history = credentials.stream()
                .map(c -> "- [%s] %s: %s".formatted(c.getType(), c.getTitle(), c.getDetail()))
                .collect(Collectors.joining("\n"));

        String requirements = position.requirements().stream()
                .map(r -> "- %s (%s, 가중치 %.2f) → 내 충족도 %.0f%%: %s".formatted(
                        r.name(), r.required() ? "필수" : "우대",
                        r.weight(), r.fulfillment() * 100, // evidence 가 null 이면 "관련 이력 없음" 으로 대체
                        r.evidence() == null ? "관련 이력 없음" : r.evidence()))
                .collect(Collectors.joining("\n"));

        String direction = String.join("\n", position.advice());

        String task = switch (type) {
            case RESUME -> """
                    위 이력으로 이 포지션에 맞는 이력서를 작성하라.
                    - 가중치 높은 요구조건을 충족하는 경험을 앞에 배치할 것
                    - 수치가 있는 성과를 우선할 것
                    - 이력에 없는 사실을 지어내지 말 것. 없는 경험은 쓰지 않는다.
                    """;
            case COVER_LETTER -> """
                    위 이력으로 이 포지션에 맞는 자기소개서를 작성하라.
                    - 지원 동기 / 가장 잘한 일 / 부족한 부분 / 앞으로 순으로 구성할 것
                    - 부족한 조건은 숨기지 말고 솔직하게 범위를 좁혀 서술할 것
                    - 이력에 없는 사실을 지어내지 말 것.
                    """;
        };

        return """
                # 지원 포지션
                %s · %s (경력 %s)

                # 요구조건과 내 충족도
                %s

                # 내 이력
                %s

                # 작성 방향
                %s

                # 작업
                %s
                """.formatted(
                position.company(), position.title(), position.experience(),
                requirements, history, direction, task);
    }
}
