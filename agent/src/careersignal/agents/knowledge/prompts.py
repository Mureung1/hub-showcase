"""Wiki 생성의 프롬프트와 응답 스키마.

정의는 docs/agent-design.md 7.2·13장과 docs/knowledge-schema.md 8장을 따른다.

필드마다 허용되는 자료 계층이 다르므로(같은 문서 8.5) 프롬프트도 필드마다 다른 지시를
갖는다. 계층 자체는 프롬프트로 막지 않는다. 허용되지 않은 계층의 청크는 요청에 담기지
않으며, 프롬프트는 받은 근거 안에서만 쓰라는 규칙을 지킬 뿐이다.

문자열과 스키마만 둔다. 호출은 `adapter.py` 다.
"""

from __future__ import annotations

from typing import Any

WIKI_TASK = "wiki_generation"
"""`TASK_TIER` 의 작업 이름. 중간 등급이며 근거는 docs/agent-design.md 13장이다."""

WIKI_FIELD_PROMPT = """너는 직무 역량 하나를 설명하는 지식 문서의 한 필드를 쓴다.

주어지는 것은 역량 이름, 쓸 필드 이름, 그 필드에 쓸 수 있는 근거 청크 목록, 그리고
규칙이 미리 정한 틀이다. 근거 목록은 이미 이 필드에 허용된 자료만 담고 있다.

1. 근거 목록에 적힌 내용만 쓴다. 목록에 없는 사실을 덧붙이지 않는다.
2. cited_chunk_ids 에는 실제로 사용한 청크 식별자만 담는다. 목록에 없는 식별자를
   만들지 않는다. 사용하지 않은 청크를 담지 않는다.
3. 근거로 그 필드를 쓸 수 없으면 lines 를 빈 목록으로 두고 cited_chunk_ids 도 비운다.
   근거가 없는 필드는 저장하지 않는다. 비우는 쪽이 지어내는 것보다 낫다.
4. 개별 채용공고를 옮겨 적지 않는다. 이 문서는 공고의 복제본이 아니라 역량의 기준이다.
5. 틀이 주어지면 그 순서와 항목 수를 지킨다. 항목을 늘리거나 줄이지 않는다.
6. lines 의 각 항목은 한 문장이다. 번호와 머리기호를 붙이지 않는다.

출력은 주어진 스키마를 따르는 JSON 하나다. 설명 문장을 덧붙이지 않는다."""

FIELD_INSTRUCTIONS: dict[str, str] = {
    "definition": (
        "이 역량이 무엇인지 한 문장에서 세 문장으로 정의한다. 공공 표준과 공식 문서의 "
        "말을 따르고 회사별 사정을 넣지 않는다."
    ),
    "why_required": (
        "이 역량이 왜 요구되는지 적는다. 채용공고 통계와 회사 공식 자료가 말하는 "
        "요구의 이유만 쓰고, 준비 방법과 면접 관점은 여기에 쓰지 않는다."
    ),
    "depth_criteria": (
        "깊이 등급마다 무엇을 할 수 있어야 하는지를 한 문장씩 적는다. 등급의 순서와 "
        "수는 틀을 그대로 따른다. 어느 등급이 기대되는지는 이미 틀이 정했으므로 "
        "다시 판정하지 않고, 그 등급에서 요구되는 행동을 이 역량의 말로 옮긴다."
    ),
    "prerequisites": (
        "이 역량을 배우기 전에 갖춰야 할 것을 한 줄씩 적는다. 공공 표준과 공식 학습 "
        "자료가 선수로 지목한 것만 담는다."
    ),
    "common_misconceptions": (
        "흔한 오해를 한 줄씩 적는다. 오해와 실제를 한 문장 안에 함께 담는다."
    ),
    "interview_verification": (
        "면접에서 이 역량을 어떻게 확인하는지 한 줄씩 적는다. 확인의 관점을 적고 "
        "예상 질문의 모범 답안을 적지 않는다."
    ),
    "learning_sequence": (
        "무엇을 어떤 순서로 익히는지 한 줄씩 적는다. 순서가 의미를 가지므로 앞 항목이 "
        "뒤 항목의 전제가 되게 배열한다."
    ),
}
"""필드마다 다른 지시. 키는 `contract.WIKI_FIELDS` 와 같은 일곱이다."""

FIELD_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "lines": {"type": "array", "items": {"type": "string"}},
        "cited_chunk_ids": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["lines", "cited_chunk_ids"],
    "additionalProperties": False,
}
"""구조화 출력 스키마.

`strict` 모드는 모든 속성이 `required` 에 있기를 요구하므로, 쓸 것이 없을 때도 두 배열을
빈 목록으로 돌려준다.
"""

NO_EVIDENCE = "(근거 없음)"
"""근거 목록이 비었을 때 사용자 메시지에 적는 말."""

NO_GUIDANCE = "(정해진 틀 없음)"
"""규칙이 정한 틀이 없을 때 사용자 메시지에 적는 말."""

EXCERPT_LIMIT = 1200
"""청크 하나를 사용자 메시지에 실을 때의 글자 수 상한.

한 필드에 청크가 여럿 붙으므로 자르지 않으면 요청 하나가 예산의 토큰 한도를 넘긴다.
자르는 것은 보내는 발췌일 뿐이고 저장되는 근거는 청크 전체를 가리킨다.
"""


def excerpt(text: str, limit: int = EXCERPT_LIMIT) -> str:
    """청크 본문을 상한까지 자른다. 자른 자리를 표시해 문장이 끊겼음을 알린다."""
    body = text.strip()
    if len(body) <= limit:
        return body
    return body[:limit] + "…"


def user_message(
    field_name: str,
    canonical_label: str,
    evidence: list[tuple[str, str, str]],
    guidance: str = "",
) -> str:
    """모델에 보내는 사용자 메시지.

    `evidence` 는 `(청크 식별자, 자료 계층, 본문)` 목록이다. 계층을 함께 적어 두면
    모델이 어느 자료에서 온 말인지 구분한 채로 쓴다.
    """
    listed = (
        "\n".join(
            f"- {chunk_id} | 계층 {tier}\n{excerpt(text)}"
            for chunk_id, tier, text in evidence
        )
        or NO_EVIDENCE
    )
    instruction = FIELD_INSTRUCTIONS.get(field_name, "")
    return (
        f"역량: {canonical_label}\n"
        f"필드: {field_name}\n"
        f"필드 지시: {instruction}\n"
        f"정해진 틀:\n{guidance.strip() or NO_GUIDANCE}\n"
        f"쓸 수 있는 근거:\n{listed}"
    )


__all__ = [
    "EXCERPT_LIMIT",
    "FIELD_INSTRUCTIONS",
    "FIELD_RESPONSE_SCHEMA",
    "NO_EVIDENCE",
    "NO_GUIDANCE",
    "WIKI_FIELD_PROMPT",
    "WIKI_TASK",
    "excerpt",
    "user_message",
]
