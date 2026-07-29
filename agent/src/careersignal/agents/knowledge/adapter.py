"""Wiki 필드 생성 어댑터.

포트는 `contract.WikiWriter` 다. 여기에는 구현 두 벌만 둔다. 실구현은 OpenAI 를 부르고
대역은 외부를 부르지 않는다. 두 구현이 같은 모양이므로 실행 골격은 어느 쪽이 들어와도
같은 경로를 돈다.

구조는 `agents/statistics/assigner.py` 와 같다. 이 모듈은 저장소를 모른다. 요청 하나를
받아 초안을 돌려줄 뿐이고, 식별자 부여와 적재는 `agent.py` 가 수행한다.

자료 정책은 이 모듈이 정하지 않는다. 요청에 담긴 근거는 이미 필드별 허용 계층으로
걸러진 것이며(docs/knowledge-schema.md 8.5), 여기서는 모델이 그 목록 밖의 청크를
인용했을 때 그것을 버린다. 없는 청크를 근거로 저장하면 `wiki_evidence` 의 외래키가
끊기고, 허용되지 않은 청크를 저장하면 검사 2 가 개정을 막는다.
"""

from __future__ import annotations

import json
import os
from typing import Any

from pydantic import ValidationError

from careersignal.agents.knowledge.contract import (
    WikiFieldDraft,
    WikiFieldRequest,
)
from careersignal.agents.knowledge.prompts import (
    FIELD_RESPONSE_SCHEMA,
    WIKI_FIELD_PROMPT,
    WIKI_TASK,
    user_message,
)
from careersignal.providers.models import chat_model


class OpenAIWikiWriter:
    """OpenAI Wiki 생성 어댑터.

    구조화 출력으로 스키마를 강제해 자유 문장이 오지 않게 한다. 스키마가 막지 못하는
    것은 목록에 없는 청크를 가리키는 인용이며, 여기서 확인하고 버린다. 인용이 모두
    버려지면 그 필드는 근거 없는 필드가 되어 저장되지 않는다.
    """

    def __init__(
        self,
        client: Any | None = None,
        *,
        task: str = WIKI_TASK,
        api_key: str | None = None,
        timeout: float = 90.0,
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

    def write(self, request: WikiFieldRequest) -> WikiFieldDraft:
        """필드 하나를 쓰고 허용 목록 안의 인용만 돌려준다."""
        if not request.evidence:
            return WikiFieldDraft(field_name=request.field_name)

        payload = self._request(request)
        return self._draft(request, payload)

    # ------------------------------------------------------------ 내부
    def _request(self, request: WikiFieldRequest) -> dict[str, Any]:
        response = self._sdk().chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": WIKI_FIELD_PROMPT},
                {
                    "role": "user",
                    "content": user_message(
                        request.field_name,
                        request.canonical_label,
                        [
                            (chunk.chunk_id, str(chunk.source_tier), chunk.text)
                            for chunk in request.evidence
                        ],
                        request.guidance,
                    ),
                },
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "wiki_field",
                    "schema": FIELD_RESPONSE_SCHEMA,
                    "strict": True,
                },
            },
        )
        content = response.choices[0].message.content
        if not content:
            raise ValueError("Wiki 생성 응답이 비었다")
        parsed = json.loads(content)
        if not isinstance(parsed, dict):
            raise ValueError("Wiki 생성 응답이 객체가 아니다")
        return parsed

    def _draft(
        self, request: WikiFieldRequest, payload: dict[str, Any]
    ) -> WikiFieldDraft:
        """목록 밖의 인용을 버리고 초안을 만든다.

        인용 순서는 요청에 담긴 근거 순서로 다시 세운다. 모델이 순서를 흔들어도 같은
        입력이 같은 `wiki_evidence` 목록을 만든다.
        """
        allowed = request.allowed_chunk_ids
        cited = {
            str(value)
            for value in payload.get("cited_chunk_ids") or ()
            if str(value) in allowed
        }
        lines = tuple(
            str(line).strip()
            for line in payload.get("lines") or ()
            if str(line).strip()
        )
        try:
            return WikiFieldDraft(
                field_name=request.field_name,
                lines=lines,
                chunk_ids=tuple(
                    chunk.chunk_id
                    for chunk in request.evidence
                    if chunk.chunk_id in cited
                ),
            )
        except ValidationError as exc:
            raise ValueError(f"Wiki 생성 응답을 읽지 못했다: {exc}") from exc

    def _sdk(self) -> Any:
        """실제로 호출할 때 만든다. 대역만 쓰는 실행 경로가 키를 요구하지 않는다."""
        if self._client is None:
            from openai import OpenAI

            key = self._api_key or os.getenv("OPENAI_API_KEY")
            if not key:
                raise RuntimeError("OPENAI_API_KEY 가 agent/.env 에 없다")
            self._client = OpenAI(api_key=key, timeout=self._timeout, max_retries=2)
        return self._client


class StubWikiWriter:
    """결정적 대역. 외부를 호출하지 않는다.

    근거 청크마다 한 줄을 만들고 그 청크를 전부 인용한다. 실제 집필이 아니라 저장
    경로와 근거 정책을 끝까지 돌리기 위한 대역이며, 근거 목록 밖의 청크를 만들지
    않는다는 계약만 지킨다.

    `lines` 는 필드별 문장을 지정한다. `silent_fields` 는 근거가 있어도 빈 초안을
    돌려주며, 근거 없는 필드가 저장되지 않는 경로를 검사할 때 쓴다. `failing_fields`
    는 예외를 던져 생성 실패가 실행을 어떻게 끝내는지 검사할 때 쓴다.

    `calls` 는 호출마다 받은 `(역량, 필드, 청크 식별자)` 다.
    """

    model = "stub-wiki-writer"

    def __init__(
        self,
        lines: dict[str, tuple[str, ...]] | None = None,
        silent_fields: tuple[str, ...] = (),
        failing_fields: tuple[str, ...] = (),
    ) -> None:
        self._lines = dict(lines or {})
        self._silent = frozenset(silent_fields)
        self._failing = frozenset(failing_fields)
        self.calls: list[tuple[str, str, tuple[str, ...]]] = []

    def write(self, request: WikiFieldRequest) -> WikiFieldDraft:
        self.calls.append(
            (
                request.capability_id,
                request.field_name,
                tuple(chunk.chunk_id for chunk in request.evidence),
            )
        )
        if request.field_name in self._failing:
            raise RuntimeError(f"대역 생성 실패: {request.field_name}")
        if request.field_name in self._silent or not request.evidence:
            return WikiFieldDraft(field_name=request.field_name)

        forced = self._lines.get(request.field_name)
        lines = forced if forced is not None else self._default_lines(request)
        return WikiFieldDraft(
            field_name=request.field_name,
            lines=tuple(lines),
            chunk_ids=tuple(chunk.chunk_id for chunk in request.evidence),
        )

    def _default_lines(self, request: WikiFieldRequest) -> tuple[str, ...]:
        """근거 하나마다 한 문장. 계층을 남겨 어느 자료에서 왔는지 보이게 한다."""
        return tuple(
            f"{request.canonical_label} 의 {request.field_name}: "
            f"{chunk.source_tier} 계층 {chunk.chunk_id}"
            for chunk in request.evidence
        )


__all__ = ["OpenAIWikiWriter", "StubWikiWriter"]
