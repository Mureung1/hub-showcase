"""단계 서술 어댑터.

구조는 `careersignal.agents.statistics.assigner` 와 같다. `Protocol` 로 모양을 정하고
실구현과 결정적 대역을 나란히 둔다(CONTRACT 8장).

어댑터는 저장소를 모른다. `StepBrief` 하나를 받아 `StepNarration` 하나를 돌려줄 뿐이고,
단계의 순서·기간·깊이·충족 연결은 `agent.py` 의 규칙이 이미 정했다. 그래서 대역으로
바꿔 끼워도 payload 의 구조와 순서가 그대로 나온다. 데모 경로는 언제나 대역을 쓴다
(CONTRACT 0장 3항).
"""

from __future__ import annotations

import json
import os
from typing import Any

from pydantic import ValidationError

from careersignal.agents.roadmap.contract import StepBrief, StepNarration
from careersignal.agents.roadmap.prompts import (
    NARRATION_RESPONSE_SCHEMA,
    ROADMAP_TASK,
    STEP_NARRATION_PROMPT,
    TRACK_NARRATION_PROMPT,
    depth_sentence,
    user_message,
)
from careersignal.providers.models import chat_model

STEP_REASON_TITLE = "왜 지금인가요?"
TRACK_REASON_TITLE = "왜 필요한가요?"


def _message(brief: StepBrief) -> str:
    return user_message(
        capability_label=brief.capability_label,
        concept_titles=brief.concept_titles,
        deviation_titles=brief.deviation_titles,
        prerequisite_labels=brief.prerequisite_labels,
        weeks=brief.weeks,
        priority=str(brief.priority),
        depth=brief.depth,
    )


class OpenAIStepNarrator:
    """OpenAI 로 단계 문장을 쓴다.

    프로젝트 단계와 학습 트랙은 요구하는 것이 달라 프롬프트를 가른다. 하나로 합치면
    "deliverable 을 비워라" 와 "depth 를 비워라" 가 한 프롬프트에 함께 들어가고,
    둘 다 채우거나 둘 다 비운 응답이 늘어난다.
    """

    def __init__(
        self,
        model: str | None = None,
        api_key: str | None = None,
        timeout: float = 60.0,
        client: Any | None = None,
    ) -> None:
        self._model = model or chat_model(ROADMAP_TASK)
        self._api_key = api_key
        self._timeout = timeout
        self._client = client

    @property
    def model(self) -> str:
        return self._model

    @property
    def task(self) -> str:
        return ROADMAP_TASK

    def narrate(self, brief: StepBrief) -> StepNarration:
        if not brief.capability_label.strip():
            raise ValueError("서술할 역량 이름이 비었다")

        prompt = TRACK_NARRATION_PROMPT if brief.is_study else STEP_NARRATION_PROMPT
        parsed = self._request(prompt, _message(brief))
        return self._narration(parsed, brief)

    # ------------------------------------------------------------ 내부
    def _request(self, prompt: str, message: str) -> dict[str, Any]:
        response = self._sdk().chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": message},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "roadmap_step_narration",
                    "schema": NARRATION_RESPONSE_SCHEMA,
                    "strict": True,
                },
            },
        )
        content = response.choices[0].message.content
        if not content:
            raise ValueError("로드맵 서술 응답이 비었다")
        parsed = json.loads(content)
        if not isinstance(parsed, dict):
            raise ValueError("로드맵 서술 응답이 객체가 아니다")
        return parsed

    def _narration(self, item: dict[str, Any], brief: StepBrief) -> StepNarration:
        """비우라고 지시한 칸이 채워져 와도 규칙이 이긴다.

        프로젝트 단계의 `depth` 와 학습 트랙의 `deliverable` 은 여기서 지운다. 모델이
        채운 깊이 문장이 남으면 집계가 정한 등급과 다른 기준이 화면에 나간다.
        """
        try:
            narration = StepNarration(
                title=str(item.get("title", "")).strip() or brief.capability_label,
                body=str(item.get("body", "")).strip(),
                deliverable=(
                    "" if brief.is_study else str(item.get("deliverable", "")).strip()
                ),
                depth=str(item.get("depth", "")).strip() if brief.is_study else "",
                reason_title=str(item.get("reason_title", "")).strip()
                or (TRACK_REASON_TITLE if brief.is_study else STEP_REASON_TITLE),
                reason=str(item.get("reason", "")).strip(),
                tags=tuple(str(tag) for tag in item.get("tags", ()) if str(tag).strip()),
            )
        except ValidationError as exc:
            raise ValueError(f"로드맵 서술 응답을 읽지 못했다: {exc}") from exc
        return narration

    def _sdk(self) -> Any:
        """실제로 호출할 때 만든다. 대역만 쓰는 실행 경로가 키를 요구하지 않는다."""
        if self._client is None:
            from openai import OpenAI

            key = self._api_key or os.getenv("OPENAI_API_KEY")
            if not key:
                raise RuntimeError("OPENAI_API_KEY 가 agent/.env 에 없다")
            self._client = OpenAI(api_key=key, timeout=self._timeout, max_retries=2)
        return self._client


class StubStepNarrator:
    """결정적 대역. 외부를 호출하지 않는다.

    받은 사실을 정해진 틀에 끼워 문장을 만든다. 같은 `StepBrief` 는 언제나 같은
    문장을 내므로 payload 를 값으로 비교할 수 있다. 이것은 사람이 읽을 로드맵의
    대체물이 아니라 조립 경로와 순서를 끝까지 돌리기 위한 대역이다.

    `calls` 는 호출마다 받은 단계 식별자다. 어느 단계가 몇 번 불렸는지 검사한다.
    """

    model = "stub-step-narrator"

    def __init__(self) -> None:
        self.calls: list[tuple[int, str]] = []

    def narrate(self, brief: StepBrief) -> StepNarration:
        self.calls.append((brief.step_order, brief.capability_id))
        joined = ", ".join(brief.concept_titles)
        after = (
            f" {', '.join(brief.prerequisite_labels)} 다음에 놓인다."
            if brief.prerequisite_labels
            else " 선행 단계가 없어 먼저 놓인다."
        )

        if brief.is_study:
            return StepNarration(
                title=f"{brief.capability_label} 학습",
                body=f"{brief.capability_label} 을(를) 프로젝트 단계와 나란히 익힌다.",
                depth=depth_sentence(brief.depth),
                reason_title=TRACK_REASON_TITLE,
                reason=f"{joined or brief.capability_label} 을(를) 받치는 이론이다.{after}",
                tags=(brief.capability_label,),
            )

        weeks = f"{brief.weeks}주 " if brief.weeks else ""
        return StepNarration(
            title=f"{brief.capability_label} 다지기",
            body=f"{weeks}동안 {joined or brief.capability_label} 을(를) 한 결과물로 묶는다.",
            deliverable=f"{brief.capability_label} 을(를) 보여 주는 코드와 기록",
            reason_title=STEP_REASON_TITLE,
            reason=f"이 단계는{after}",
            tags=(brief.capability_label,),
        )


__all__ = [
    "STEP_REASON_TITLE",
    "TRACK_REASON_TITLE",
    "OpenAIStepNarrator",
    "StubStepNarrator",
]
