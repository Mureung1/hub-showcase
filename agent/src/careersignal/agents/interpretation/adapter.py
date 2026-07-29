"""해석 어댑터. 포트마다 실구현과 결정적 대역을 나란히 둔다.

구조는 `careersignal.agents.statistics.assigner` 와 같다. 이 모듈은 저장소를 모르고
문자열만 주고받는다. 식별자 부여와 적재는 `agent.py` 가 한다.

`EntailmentJudge` 에는 `OpenAI*` 구현이 없다. 근거 함의 검증은 산출물 검증 단계의
검사 5 이고, 그 자리는 B6 이 `verification/checks/` 에 넣는다. 같은 판정을 두 곳에
두면 검증이 자기가 만든 답을 자기가 채점한다. 여기서는 포트와 대역만 둔다.
"""

from __future__ import annotations

import json
import os
from typing import Any

from pydantic import ValidationError

from careersignal.agents.interpretation.contract import (
    DeviationNarrative,
    EntailmentVerdict,
    Relation,
    RequirementKind,
)
from careersignal.agents.interpretation.prompts import (
    DEVIATION_INTERPRETATION_PROMPT,
    DEVIATION_RESPONSE_SCHEMA,
    INTERPRETATION_TASK,
    deviation_message,
)
from careersignal.providers.models import chat_model

STUB_EXPLANATION = "{topic} 은(는) 직무 전체 기준({baseline})보다 {deviation} 까지 요구합니다."
"""대역이 만드는 설명 문장의 틀. 판단이 아니라 배선 확인용 값이다."""


class OpenAIDeviationInterpreter:
    """OpenAI 편차 해석 어댑터.

    구조화 출력으로 스키마를 강제한다. 스키마가 막지 못하는 것은 세 구분 밖의
    값이며 여기서 확인한다. 알 수 없는 구분이 오면 가장 좁은 쪽인
    `inferred_requirement` 로 내린다. 명시 요구로 올리면 공고에 없는 문장이 통계에
    반영되는 구분을 얻는다(docs/agent-design.md 7.4).
    """

    def __init__(
        self,
        client: Any | None = None,
        *,
        task: str = INTERPRETATION_TASK,
        api_key: str | None = None,
        timeout: float = 60.0,
    ) -> None:
        self._client = client
        self._task = task
        self._model = chat_model(task)
        self._api_key = api_key
        self._timeout = timeout

    @property
    def model(self) -> str:
        return self._model

    @property
    def task(self) -> str:
        return self._task

    def interpret(
        self,
        topic: str,
        baseline: str,
        deviation: str,
        evidence: tuple[str, ...] = (),
    ) -> DeviationNarrative:
        if not topic.strip():
            raise ValueError("해석할 주제가 비었다")
        payload = self._request(topic, baseline, deviation, evidence)
        return self._narrative(payload, bool(evidence))

    # ------------------------------------------------------------ 내부
    def _request(
        self,
        topic: str,
        baseline: str,
        deviation: str,
        evidence: tuple[str, ...],
    ) -> dict[str, Any]:
        response = self._sdk().chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": DEVIATION_INTERPRETATION_PROMPT},
                {
                    "role": "user",
                    "content": deviation_message(topic, baseline, deviation, evidence),
                },
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "deviation_interpretation",
                    "schema": DEVIATION_RESPONSE_SCHEMA,
                    "strict": True,
                },
            },
        )
        content = response.choices[0].message.content
        if not content:
            raise ValueError("해석 응답이 비었다")
        parsed = json.loads(content)
        if not isinstance(parsed, dict):
            raise ValueError("해석 응답이 객체가 아니다")
        return parsed

    def _narrative(self, item: dict[str, Any], had_evidence: bool) -> DeviationNarrative:
        explanation = str(item.get("explanation", "")).strip()
        if not explanation:
            raise ValueError("해석 응답에 설명이 없다")

        raw_kind = item.get("requirement_kind")
        try:
            kind = RequirementKind(raw_kind)
        except ValueError:
            kind = RequirementKind.INFERRED_REQUIREMENT

        # 근거 문장을 하나도 주지 않았는데 명시 요구라고 답하면 그 답의 근거가 없다.
        if kind is RequirementKind.EXPLICIT_REQUIREMENT and not had_evidence:
            kind = RequirementKind.INFERRED_REQUIREMENT

        try:
            return DeviationNarrative(
                explanation=explanation,
                requirement_kind=kind,
                deviation_label=str(item.get("deviation_label", "")).strip(),
            )
        except ValidationError as exc:
            raise ValueError(f"해석 응답을 읽지 못했다: {exc}") from exc

    def _sdk(self) -> Any:
        """실제로 호출할 때 만든다. 대역만 쓰는 실행 경로가 키를 요구하지 않는다."""
        if self._client is None:
            from openai import OpenAI

            key = self._api_key or os.getenv("OPENAI_API_KEY")
            if not key:
                raise RuntimeError("OPENAI_API_KEY 가 agent/.env 에 없다")
            self._client = OpenAI(api_key=key, timeout=self._timeout, max_retries=2)
        return self._client


class StubDeviationInterpreter:
    """결정적 대역. 외부를 호출하지 않는다.

    받은 값을 한 문장으로 이어 붙이고, 근거 문장이 있으면 명시 요구로, 없으면
    회사 맥락 신호로 둔다. 이 규칙은 해석의 품질이 아니라 저장 경로와 payload
    조립을 끝까지 돌리기 위한 값이다. 무엇이 어떤 구분인지는
    `DEVIATION_INTERPRETATION_PROMPT` 가 정하고, 그 품질은 평가 세트가 잰다.

    `calls` 는 호출마다 받은 `(주제, 기준, 편차, 근거 수)` 다.
    """

    model = "stub-deviation-interpreter"

    def __init__(self, explanation: str | None = None) -> None:
        self._forced = explanation
        self.calls: list[tuple[str, str, str, int]] = []

    def interpret(
        self,
        topic: str,
        baseline: str,
        deviation: str,
        evidence: tuple[str, ...] = (),
    ) -> DeviationNarrative:
        self.calls.append((topic, baseline, deviation, len(evidence)))
        explanation = self._forced or STUB_EXPLANATION.format(
            topic=topic, baseline=baseline, deviation=deviation
        )
        kind = (
            RequirementKind.EXPLICIT_REQUIREMENT
            if evidence
            else RequirementKind.COMPANY_CONTEXT_SIGNAL
        )
        return DeviationNarrative(
            explanation=explanation,
            requirement_kind=kind,
            deviation_label=deviation,
        )


class StubEntailmentJudge:
    """항상 지지로 답하는 대역.

    실제 판정은 B6 이 검사 5 로 넣는다. 그때까지 이 대역이 판정 자리를 채우므로,
    이 대역이 붙어 있는 동안 나온 `verification_status` 를 검증 통과로 읽으면 안
    된다. 그래서 `judged` 에 호출 기록을 남겨 검사가 실제로 붙었는지 셀 수 있게
    한다.

    `verdict` 를 주면 그 판정을 그대로 돌려준다. 반박 근거가 있는 갈래를 검사할 때
    쓴다.
    """

    model = "stub-entailment-judge"

    def __init__(self, verdict: EntailmentVerdict | None = None) -> None:
        self._forced = verdict
        self.judged: list[tuple[str, str]] = []

    def judge(self, claim_text: str, evidence_text: str) -> EntailmentVerdict:
        self.judged.append((claim_text, evidence_text))
        if self._forced is not None:
            return self._forced
        return EntailmentVerdict(
            entailed=True,
            relation=Relation.SUPPORTS,
            rationale="대역 판정. 함의를 검사하지 않았다",
        )


__all__ = [
    "STUB_EXPLANATION",
    "OpenAIDeviationInterpreter",
    "StubDeviationInterpreter",
    "StubEntailmentJudge",
]
