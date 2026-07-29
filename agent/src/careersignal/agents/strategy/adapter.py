"""합격 전략 문구 어댑터.

체크리스트 초안 하나를 받아 문구를 돌려준다. 구조는
`careersignal.agents.statistics.assigner` 와 같다. Protocol 로 모양을 정하고,
실구현과 결정적 대역을 나란히 둔다.

이 모듈은 저장소를 모른다. 초안을 받아 문구를 돌려줄 뿐이고, 개념·항목 식별자와
적재는 `agent.py` 가 수행한다.

배정된 자리에 없는 칸은 여기서 비운다. 모델이 면접에 쓰이지 않는 항목에 예상
질문을 채워 보내도 화면의 면접 카드에 그 항목이 끼어들지 않게 한다.
"""

from __future__ import annotations

import json
import os
from typing import Any

from pydantic import ValidationError

from careersignal.agents.strategy.contract import (
    Channel,
    ChecklistCopy,
    ChecklistDraft,
)
from careersignal.agents.strategy.prompts import (
    STRATEGY_COPY_PROMPT,
    STRATEGY_RESPONSE_SCHEMA,
    STRATEGY_TASK,
    user_message,
)
from careersignal.providers.models import chat_model


def _for_channels(values: dict[str, Any], draft: ChecklistDraft) -> dict[str, Any]:
    """배정되지 않은 자리의 칸을 비운다.

    활용처 배정은 규칙의 결과다(`checklist.assign_channels`). 모델 출력이 그것을
    넓히지 못하게 여기서 자른다.
    """
    channels = set(draft.channels)
    if Channel.ESSAY not in channels:
        for key in (
            "narrative_problem",
            "narrative_solve",
            "narrative_growth",
            "sample_sentence",
        ):
            values[key] = None
    if Channel.PORTFOLIO not in channels:
        values["tips"] = ()
    if Channel.INTERVIEW not in channels:
        values["interview_question"] = None
        values["interview_followups"] = ()
        values["interview_point"] = None
    return values


class OpenAIStrategyWriter:
    """OpenAI 전략 문구 어댑터.

    구조화 출력으로 스키마를 강제해 자유 문장이 오지 않게 한다. 스키마가 막지 못하는
    것은 배정되지 않은 자리의 칸을 채워 보내는 것이며 여기서 비운다.
    """

    def __init__(
        self,
        client: Any | None = None,
        *,
        task: str = STRATEGY_TASK,
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

    def write(self, draft: ChecklistDraft) -> ChecklistCopy:
        """초안 하나를 보내고 배정된 자리의 문구만 돌려준다."""
        if not draft.channels:
            raise ValueError("활용처가 없는 초안은 문구를 갖지 않는다")
        return self._copy(self._request(draft), draft)

    # ------------------------------------------------------------ 내부
    def _request(self, draft: ChecklistDraft) -> dict[str, Any]:
        response = self._sdk().chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": STRATEGY_COPY_PROMPT},
                {"role": "user", "content": user_message(draft)},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "checklist_copy",
                    "schema": STRATEGY_RESPONSE_SCHEMA,
                    "strict": True,
                },
            },
        )
        content = response.choices[0].message.content
        if not content:
            raise ValueError("전략 문구 응답이 비었다")
        parsed = json.loads(content)
        if not isinstance(parsed, dict):
            raise ValueError("전략 문구 응답이 객체가 아니다")
        return parsed

    def _copy(self, item: dict[str, Any], draft: ChecklistDraft) -> ChecklistCopy:
        values: dict[str, Any] = {
            "subtitle": str(item.get("subtitle") or ""),
            "reason": str(item.get("reason") or ""),
            "evidence_needed": str(item.get("evidence_needed") or ""),
            "tips": tuple(str(tip) for tip in item.get("tips") or ()),
            "sample_sentence": item.get("sample_sentence"),
            "narrative_problem": item.get("narrative_problem"),
            "narrative_solve": item.get("narrative_solve"),
            "narrative_growth": item.get("narrative_growth"),
            "interview_question": item.get("interview_question"),
            "interview_followups": tuple(
                str(one) for one in item.get("interview_followups") or ()
            ),
            "interview_point": item.get("interview_point"),
        }
        try:
            return ChecklistCopy(**_for_channels(values, draft))
        except ValidationError as exc:
            raise ValueError(f"전략 문구 응답을 읽지 못했다: {exc}") from exc


class StubStrategyWriter:
    """결정적 대역. 외부를 호출하지 않는다.

    초안의 제목과 근거 요약을 정해진 틀에 끼워 문구를 만든다. 배선과 저장 경로와
    payload 모양을 끝까지 확인하기에 충분하고, 같은 초안에 언제나 같은 문구가
    나오므로 테스트가 값을 그대로 비교할 수 있다.

    문구의 품질은 이 대역이 재지 않는다. 무엇을 어떻게 쓸지는
    `STRATEGY_COPY_PROMPT` 가 정한다. 같은 정책을 프롬프트와 대역 두 곳에 두면
    갈라지고, 그럴듯한 대역 출력이 프롬프트를 아직 재지 않았다는 사실을 가린다.

    `calls` 는 호출마다 받은 초안이다.
    """

    model = "stub-strategy-writer"

    def __init__(self, suffix: str = "") -> None:
        """`suffix` 는 문구 뒤에 붙는 표식이다.

        같은 개념의 문구만 바꾼 다음 버전을 만들 때 쓴다. 개념 식별자가 문구와
        무관하게 유지되는지 검사하는 자리가 그것이다(16-2).
        """
        self._suffix = suffix
        self.calls: list[ChecklistDraft] = []

    def write(self, draft: ChecklistDraft) -> ChecklistCopy:
        self.calls.append(draft)
        if not draft.channels:
            raise ValueError("활용처가 없는 초안은 문구를 갖지 않는다")

        mark = f" {self._suffix}" if self._suffix else ""
        ground = draft.topic or draft.title
        values: dict[str, Any] = {
            "subtitle": f"{draft.title} 준비 지점{mark}",
            "reason": (
                f"{'편차' if draft.is_deviation else '기준선'} · {ground}{mark}"
            ),
            "evidence_needed": f"{draft.title} 을 보여 주는 결과물과 기록{mark}",
            "tips": (f"{draft.title} 을 첫 화면에서 드러낸다{mark}",),
            "sample_sentence": f"{draft.title} 에서 겪은 문제로 시작한다{mark}",
            "narrative_problem": f"{ground} 에서 막혔다{mark}",
            "narrative_solve": f"{draft.title} 으로 풀었다{mark}",
            "narrative_growth": f"{draft.title} 의 기준이 생겼다{mark}",
            "interview_question": f"{draft.title} 을 어떻게 다뤘나요?{mark}",
            "interview_followups": (f"{draft.title} 의 대안은 무엇인가요?{mark}",),
            "interview_point": f"{ground} 을 스스로 설명할 수 있는가{mark}",
        }
        return ChecklistCopy(**_for_channels(values, draft))


__all__ = ["OpenAIStrategyWriter", "StubStrategyWriter"]
