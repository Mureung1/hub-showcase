"""준비 로드맵의 프롬프트와 응답 스키마.

정의는 docs/agent-design.md 7.6·13장을 따른다.

**모델은 문장만 쓴다.** 단계의 순서, 우선순위, 기간, 깊이 등급, 무엇을 채우는지는
규칙이 이미 정했다. 모델에 그 값을 다시 판정하게 하면 선수 관계 정렬(17-1)과 깊이
기준(17-2)이 문장 생성의 부산물이 되고, 재실행마다 순서가 흔들린다. 프롬프트는
정해진 사실을 주고 그것을 설명하는 문장을 요구한다.

깊이 문장의 기준은 `careersignal.domain.depth.DepthLevel` 세 등급이다. 등급의 뜻은
Wiki 의 깊이 등급 정의와 `capability_depth_profiles.expected_depth` 를 함께 참조한다
(docs/agent-design.md 7.6).
"""

from __future__ import annotations

from typing import Any

from careersignal.domain.depth import DepthLevel

ROADMAP_TASK = "roadmap"
"""`TASK_TIER` 의 작업 이름. 중간 등급이며 근거는 docs/agent-design.md 13장이다."""

NO_PREREQUISITE = "(선행 단계 없음)"
"""선행 단계가 없을 때 사용자 메시지에 적는 말. 프롬프트가 이것을 라벨로 읽지 않는다."""

NO_CONCEPT = "(채우는 항목 없음)"
"""채우는 체크리스트 항목이 없을 때 적는 말."""

DEPTH_GUIDE: dict[DepthLevel, str] = {
    DepthLevel.FOUNDATION: "개념과 용어를 스스로 설명할 수 있는 수준",
    DepthLevel.APPLICATION: "직접 만들어 돌려 보고 무엇이 왜 그렇게 되는지 말할 수 있는 수준",
    DepthLevel.TRADEOFF: "선택지를 견주어 왜 그것을 골랐는지 근거로 답할 수 있는 수준",
}
"""깊이 등급이 요구하는 도달점.

집계가 정한 `expected_depth` 한 등급이 학습 트랙의 `어디까지` 를 정한다. 모델은 이
문장을 역량에 맞게 구체화할 뿐 등급을 올리거나 내리지 않는다. 등급을 문장에서
추론하게 두면 같은 프로파일이 실행마다 다른 깊이를 요구하게 된다.
"""

_RULES = """1. 주어진 사실만 쓴다. 없는 기술 이름, 없는 회사, 없는 수치를 만들지 않는다.
2. 단계의 순서와 우선순위와 기간은 이미 정해져 있다. 바꾸자고 제안하지 않고 그
   순서가 왜 그런지를 설명한다.
3. 채우는 항목이 여럿이면 그 항목들을 한 결과물로 묶는 방법을 적는다. 항목마다
   따로 하라고 적지 않는다.
4. 선행 단계가 주어지면 그 단계의 결과물 위에 무엇을 얹는지 적는다. 처음부터 다시
   만들라고 적지 않는다.
5. 문장은 지원자에게 하는 말이다. 회사가 무엇을 원한다는 서술로 끝내지 않고
   무엇을 하라는 말로 끝낸다.
6. tags 는 이 단계에서 다루는 주제어 두셋이다. 문장이 아니라 낱말로 적는다."""

STEP_NARRATION_PROMPT = f"""너는 신입 지원자의 준비 로드맵에서 프로젝트 단계 하나를 설명한다.

주어지는 것은 그 단계가 다루는 역량, 채우는 체크리스트 항목, 기간, 우선순위,
그리고 앞선 단계다.

{_RULES}
7. deliverable 은 이 단계가 끝났을 때 남는 것이다. 문서·코드·기록처럼 손에 잡히는
   것으로 적는다. "이해한다" 나 "익힌다" 는 결과물이 아니다.
8. reason_title 은 "왜 지금인가요?" 처럼 짧은 물음이고 reason 이 그 답이다.
   답에는 이 단계가 그 자리에 놓인 이유가 들어간다.
9. depth 는 비워 둔다. 프로젝트 단계에는 깊이 기준이 없다."""

TRACK_NARRATION_PROMPT = f"""너는 신입 지원자의 준비 로드맵에서 학습 트랙 하나를 설명한다.

학습 트랙은 프로젝트 단계와 나란히 가는 이론 학습이다. 주어지는 것은 다루는 역량,
채우는 체크리스트 항목, 그리고 **집계로 정해진 깊이 기준**이다.

{_RULES}
7. depth 는 "어디까지" 다. 주어진 깊이 기준이 요구하는 도달점을 이 역량에 맞게
   구체화해 한 문장으로 적는다. 기준보다 깊게도 얕게도 적지 않는다.
8. deliverable 은 비워 둔다. 학습 트랙은 결과물이 아니라 도달점을 갖는다.
9. reason_title 은 "왜 필요한가요?" 처럼 짧은 물음이고 reason 이 그 답이다.
   답에는 이 학습이 어느 프로젝트 단계의 무엇을 받치는지가 들어간다."""

NARRATION_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "title",
        "body",
        "deliverable",
        "depth",
        "reason_title",
        "reason",
        "tags",
    ],
    "properties": {
        "title": {"type": "string"},
        "body": {"type": "string"},
        "deliverable": {"type": "string"},
        "depth": {"type": "string"},
        "reason_title": {"type": "string"},
        "reason": {"type": "string"},
        "tags": {"type": "array", "items": {"type": "string"}},
    },
}
"""구조화 응답 스키마. `strict` 모드는 모든 키를 required 로 요구하므로

쓰지 않는 키도 빈 문자열로 받는다. 프롬프트가 어느 키를 비우라고 지시한다.
"""


def depth_sentence(level: DepthLevel | None) -> str:
    """깊이 등급의 도달점 문장. 등급이 없으면 빈 문자열이다."""
    if level is None:
        return ""
    return DEPTH_GUIDE[level]


def user_message(
    capability_label: str,
    concept_titles: tuple[str, ...] = (),
    deviation_titles: tuple[str, ...] = (),
    prerequisite_labels: tuple[str, ...] = (),
    weeks: int | None = None,
    priority: str = "",
    depth: DepthLevel | None = None,
) -> str:
    """모델에 보내는 사용자 메시지. 사실을 줄마다 나눠 적는다.

    프롬프트와 사실을 한 문자열에 섞지 않는다. 프롬프트는 실행마다 같고 사실만
    달라지므로, 나눠 두면 프롬프트 버전을 값과 무관하게 고정할 수 있다.
    """
    lines = [f"역량: {capability_label}"]
    lines.append("채우는 항목: " + (", ".join(concept_titles) or NO_CONCEPT))
    if deviation_titles:
        lines.append("이 기업군의 편차 항목: " + ", ".join(deviation_titles))
    lines.append("선행 단계: " + (", ".join(prerequisite_labels) or NO_PREREQUISITE))
    if weeks is not None:
        lines.append(f"기간: {weeks}주")
    if priority:
        lines.append(f"우선순위: {priority}")
    if depth is not None:
        lines.append(f"깊이 기준: {depth} — {depth_sentence(depth)}")
    return "\n".join(lines)


__all__ = [
    "DEPTH_GUIDE",
    "NARRATION_RESPONSE_SCHEMA",
    "NO_CONCEPT",
    "NO_PREREQUISITE",
    "ROADMAP_TASK",
    "STEP_NARRATION_PROMPT",
    "TRACK_NARRATION_PROMPT",
    "depth_sentence",
    "user_message",
]
