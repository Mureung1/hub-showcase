"""합격 전략 문구의 지시와 응답 스키마.

모델이 만드는 것은 문구뿐이다. 무엇을 항목으로 세울지, 어디에 쓸지, 무엇을 근거로
딛는지는 `checklist.py` 의 규칙이 이미 정해 초안에 담아 준다. 프롬프트가 그것을
다시 정하게 하면 실행마다 배정이 흔들리고 `checklist_items.channels` 의 CHECK 를
넘는 값이 나온다.

신뢰도를 묻지 않는다. 생성 모델의 자기 보고를 신뢰도로 쓰지 않는다는 것이
docs/agent-design.md 8장이고, 전략 주장의 신뢰도는 요구 연결과 허용된 자료 근거로
판정한다(같은 문서 8장 표).
"""

from __future__ import annotations

from typing import Any

from careersignal.agents.strategy.contract import Channel, ChecklistDraft

STRATEGY_TASK = "strategy"
"""`TASK_TIER` 의 작업 이름. 중간 등급이며 근거는 docs/agent-design.md 13장이다."""

NO_TOPIC = "(근거 요약 없음)"
"""근거 요약이 비었을 때 사용자 메시지에 적는 말."""

CHANNEL_GUIDE: dict[Channel, str] = {
    Channel.ESSAY: "essay — 자기소개서에서 서사로 말한다. 문제·해결·배움 세 칸을 채운다",
    Channel.PORTFOLIO: "portfolio — 산출물로 보여 준다. 무엇을 만들어 어떻게 드러낼지 적는다",
    Channel.INTERVIEW: "interview — 면접에서 확인받는다. 예상 질문과 꼬리질문을 적는다",
}
"""활용처마다 문구가 채워야 하는 칸.

배정은 이미 끝났고 모델은 배정된 자리의 칸만 채운다. 이 설명이 무엇을 쓸지
가르므로 상수로 남겨 테스트가 읽는다.
"""

STRATEGY_COPY_PROMPT = """너는 신입 지원자의 합격 전략 문구를 쓴다.

주어지는 것은 체크리스트 항목 하나다. 제목, 갈래, 이 항목이 쓰이는 자리, 이 항목이
필요한 근거가 함께 온다.

1. 항목을 새로 만들지 않고 자리를 바꾸지 않는다. 주어진 항목 하나의 문구만 쓴다.
2. reason 은 왜 이 항목이 필요한지를 주어진 근거로만 적는다. 근거에 없는 수치를
   지어내지 않는다. 근거가 편차면 어느 기업군에서 무엇이 다른지 적는다.
3. evidence_needed 는 무엇으로 증명하는지다. 결과물이나 기록처럼 확인할 수 있는
   것을 적는다. "열심히 공부한다" 처럼 확인할 수 없는 것은 적지 않는다.
4. subtitle 은 제목을 한 줄로 좁힌다. 제목을 되풀이하지 않는다.
5. 자리마다 채우는 칸이 다르다.
   - essay 가 있으면 narrative_problem, narrative_solve, narrative_growth 를 모두
     채우고 sample_sentence 에 첫 문장 한 줄을 적는다.
   - portfolio 가 있으면 tips 에 드러내는 방법을 두 줄 안으로 적는다.
   - interview 가 있으면 interview_question 과 interview_followups 와
     interview_point 를 채운다.
   자리에 없는 칸은 null 이나 빈 목록으로 둔다.
6. 신입이 몇 주 안에 할 수 있는 크기로 적는다. 경력자의 실무 경험을 전제하지
   않는다.

출력은 주어진 스키마를 따르는 JSON 하나다. 설명 문장을 덧붙이지 않는다."""
"""체크리스트 항목 문구 지시.

규칙 1이 이 프롬프트의 경계다. 항목의 존재와 활용처는 규칙이 정하고 모델은 문구만
쓴다. 규칙 3이 증명 가능한 것을 요구하는 근거는 docs/agent-design.md 6장 표의
"증명 방법 근거" 슬롯이다.
"""

STRATEGY_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "subtitle": {"type": "string"},
        "reason": {"type": "string"},
        "evidence_needed": {"type": "string"},
        "tips": {"type": "array", "items": {"type": "string"}},
        "sample_sentence": {"type": ["string", "null"]},
        "narrative_problem": {"type": ["string", "null"]},
        "narrative_solve": {"type": ["string", "null"]},
        "narrative_growth": {"type": ["string", "null"]},
        "interview_question": {"type": ["string", "null"]},
        "interview_followups": {"type": "array", "items": {"type": "string"}},
        "interview_point": {"type": ["string", "null"]},
    },
    "required": [
        "subtitle",
        "reason",
        "evidence_needed",
        "tips",
        "sample_sentence",
        "narrative_problem",
        "narrative_solve",
        "narrative_growth",
        "interview_question",
        "interview_followups",
        "interview_point",
    ],
    "additionalProperties": False,
}
"""구조화 출력 스키마.

`strict` 모드는 모든 속성이 `required` 에 있기를 요구하므로, 자리에 따라 비는 칸은
생략이 아니라 `null` 허용으로 표현한다.

`channels` 와 `kind` 와 `is_deviation` 은 스키마에 없다. 모델이 돌려줄 수 없는 값은
아예 자리를 두지 않는다.
"""


def user_message(draft: ChecklistDraft) -> str:
    """모델에 보내는 사용자 메시지. 항목의 재료를 칸마다 나눠 적는다."""
    channels = "\n".join(
        f"- {CHANNEL_GUIDE[channel]}" for channel in draft.channels
    )
    deviation = (
        f"편차 {draft.dev_n} (기업군이 직무 기준선과 다르게 요구하는 지점)"
        if draft.is_deviation
        else "직무 기준선"
    )
    requiredness = "필수" if draft.required else "우대"
    return (
        f"제목: {draft.title}\n"
        f"갈래: {draft.kind}\n"
        f"성격: {deviation} · {requiredness}\n"
        f"근거: {draft.topic or NO_TOPIC}\n"
        f"쓰이는 자리:\n{channels}"
    )


__all__ = [
    "CHANNEL_GUIDE",
    "NO_TOPIC",
    "STRATEGY_COPY_PROMPT",
    "STRATEGY_RESPONSE_SCHEMA",
    "STRATEGY_TASK",
    "user_message",
]
