"""해석 프롬프트와 구조화 출력 스키마.

정의는 docs/agent-design.md 7.4·8장·13장을 따른다. 문자열만 갖는다. 모델을 부르는
것은 `adapter.py` 이고, 무엇을 편차로 볼지는 `baseline.py` 가 정한다.

프롬프트에 수치를 계산하라고 시키지 않는다. 빈도·비율·추세는 집계 파이프라인이
규칙으로 계산했고, 모델은 이미 정해진 편차를 문장으로 옮기기만 한다. 모델이 수를
다시 말하면 화면의 수치와 근거의 수치가 갈라진다.
"""

from __future__ import annotations

from typing import Any

INTERPRETATION_TASK = "interpretation"
"""`TASK_TIER` 의 작업 이름. 중간 등급이며 근거는 docs/agent-design.md 13장이다."""

ENTAILMENT_TASK = "entailment_check"
"""근거 함의 검증의 작업 이름. 실제 판정 구현은 B6 이 검사 5로 넣는다."""

NO_EVIDENCE = "(인용할 근거 문장 없음)"
"""근거를 주지 못할 때 사용자 메시지에 적는 말."""

DEVIATION_INTERPRETATION_PROMPT = """너는 채용공고 분석 결과의 편차 하나를 신입
지원자가 읽을 문장으로 옮긴다.

주어지는 것은 요구의 주제, 직무 전체의 기준 수준, 이 범위가 더 요구하는 수준,
그리고 공고나 회사 공식 자료에서 그대로 뽑은 근거 문장이다.

1. explanation 은 이 편차가 왜 생겼는지와 무엇을 준비해야 하는지를 두세 문장으로
   적는다. 근거 문장에 없는 사실을 덧붙이지 않는다.
2. 숫자를 새로 만들지 않는다. 비율과 건수는 이미 계산되어 있으며 화면이 따로
   보여 준다. 근거 문장에 있는 숫자만 인용한다.
3. requirement_kind 는 셋 중 하나다.
   - explicit_requirement: 공고 문장에 그 요구가 직접 적혀 있다.
   - inferred_requirement: 공고 문장을 근거로 해석해야 드러난다.
   - company_context_signal: 공고에는 없고 회사 공식 자료에만 반복된다.
   근거가 회사 자료뿐이면 company_context_signal 이다. 공고 문장이 있는데
   해석이 필요 없으면 explicit_requirement 다.
4. deviation_label 은 이 범위가 더 요구하는 수준을 명사구 한 개로 적는다.
5. 확신을 적지 않는다. 신뢰도는 근거의 수와 표본이 정하며 네 판단을 쓰지 않는다.
6. 지원 자격, 우대 조건, 회사 홍보 문구를 요구로 바꾸어 적지 않는다.

출력은 주어진 스키마를 따르는 JSON 하나다. 설명 문장을 덧붙이지 않는다."""

DEVIATION_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "explanation": {"type": "string"},
        "requirement_kind": {
            "type": "string",
            "enum": [
                "explicit_requirement",
                "inferred_requirement",
                "company_context_signal",
            ],
        },
        "deviation_label": {"type": "string"},
    },
    "required": ["explanation", "requirement_kind", "deviation_label"],
    "additionalProperties": False,
}
"""구조화 출력 스키마.

`strict` 모드는 모든 속성이 `required` 에 있기를 요구한다. 값이 없을 수 있는
`deviation_label` 은 생략이 아니라 빈 문자열로 온다.
"""

ENTAILMENT_PROMPT = """너는 주장 하나와 근거 문장 하나를 받아, 그 근거가 주장을
실제로 뒷받침하는지 판정한다.

1. entailed 는 근거 문장만으로 주장이 성립할 때만 참이다. 주제가 같다는 이유로
   참으로 두지 않는다.
2. relation 은 근거가 주장을 지지하면 supports, 어긋나면 contradicts 다.
3. 근거에 없는 배경지식을 끌어와 판정하지 않는다.
4. rationale 은 판정 이유를 한 문장으로 적는다.

출력은 주어진 스키마를 따르는 JSON 하나다."""

ENTAILMENT_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "entailed": {"type": "boolean"},
        "relation": {"type": "string", "enum": ["supports", "contradicts"]},
        "rationale": {"type": "string"},
    },
    "required": ["entailed", "relation", "rationale"],
    "additionalProperties": False,
}


def deviation_message(
    topic: str,
    baseline: str,
    deviation: str,
    evidence: tuple[str, ...] = (),
) -> str:
    """편차 하나를 사용자 메시지로 적는다.

    근거 문장은 번호를 붙여 그대로 넣는다. 요약하지 않는다. 요약한 문장을 근거로
    주면 모델이 원문에 없는 말을 인용으로 되돌려 준다.
    """
    lines = [
        f"주제: {topic}",
        f"직무 전체 기준: {baseline}",
        f"이 범위가 더 요구하는 것: {deviation}",
        "근거 문장:",
    ]
    if evidence:
        lines.extend(f"{n}. {text}" for n, text in enumerate(evidence, start=1))
    else:
        lines.append(NO_EVIDENCE)
    return "\n".join(lines)


def entailment_message(claim_text: str, evidence_text: str) -> str:
    return f"주장: {claim_text}\n근거: {evidence_text}"


__all__ = [
    "DEVIATION_INTERPRETATION_PROMPT",
    "DEVIATION_RESPONSE_SCHEMA",
    "ENTAILMENT_PROMPT",
    "ENTAILMENT_RESPONSE_SCHEMA",
    "ENTAILMENT_TASK",
    "INTERPRETATION_TASK",
    "NO_EVIDENCE",
    "deviation_message",
    "entailment_message",
]
