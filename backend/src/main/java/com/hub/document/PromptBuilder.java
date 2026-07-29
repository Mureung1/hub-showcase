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

    /** 문서 유형과 무관하게 항상 지키는 규칙. */
    private static final String COMMON_RULES = """
            - 반드시 한글로만 작성한다. 한자(漢字), 일본어 가나(ひらがな·カタカナ), 중국어 문자를 한 글자도 사용하지 않는다.
            - 기술 용어(Python, AWS, Kafka 등)만 영문 표기를 허용한다.
            - 이력에 없는 사실을 지어내지 않는다. 없는 경험은 쓰지 않는다.
            - 요구조건의 가중치·충족도 수치 자체를 문서에 옮겨 적지 않는다. 그 수치는 무엇을 앞세울지 판단하는 근거로만 쓴다.
            - 서두나 말미에 설명·인사말을 덧붙이지 않는다. 문서 본문만 출력한다.
            """;

    static String build(DocType type, PositionDto.Detail position, List<Credential> credentials) {
        String history = credentials.stream()
                .map(c -> "- [%s] %s: %s".formatted(c.getType(), c.getTitle(), c.getDetail()))
                .collect(Collectors.joining("\n"));

        String requirements = position.requirements().stream()
                .map(r -> "- %s (%s, 가중치 %.2f) → 내 충족도 %.0f%%: %s".formatted(
                        r.name(), r.required() ? "필수" : "우대",
                        r.weight(), r.fulfillment() * 100, // evidence 가 null 이면 "직접 대응하는 이력 없음" 으로 대체
                        r.evidence() == null ? "직접 대응하는 이력 없음" : r.evidence()))
                .collect(Collectors.joining("\n"));

        String direction = String.join("\n", position.advice());

        String task = switch (type) {
            case RESUME -> """
                    위 이력으로 이 포지션에 맞는 이력서를 작성하라.
                    - 가중치 높은 요구조건을 충족하는 경험을 앞에 배치할 것
                    - 수치가 있는 성과를 우선할 것
                    - 충족하지 못한 조건은 언급하지 말 것. 이력서는 가진 것을 보여주는 문서다.
                    """;
            case COVER_LETTER -> """
                    위 이력으로 이 포지션에 맞는 자기소개서를 작성하라.
                    - 지원 동기 / 가장 잘한 일 / 앞으로의 계획 순으로 구성할 것
                    - 충족도가 낮은 조건은 결점으로 서술하지 말 것.
                      "경험이 없다", "부족하다" 같은 표현을 쓰지 않는다.
                      대신 가장 인접한 경험을 근거로 연결하거나, 앞으로의 계획 항목에서
                      구체적으로 무엇을 어떻게 익힐지 한 문장으로 다룬다.
                    - 태도나 의지에 해당하는 조건(성장 의지, 협업 성향 등)은 충족도 수치와 무관하게
                      실제 이력 속 사례로 보여줄 것. 없다고 서술하지 않는다.
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

                # 공통 규칙
                %s

                # 작업
                %s
                """.formatted(
                position.company(), position.title(), position.experience(),
                requirements, history, direction, COMMON_RULES, task);
    }
}