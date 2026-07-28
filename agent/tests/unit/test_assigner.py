"""차원 배정 어댑터 검증.

규칙은 docs/erd.md 7.13 과 docs/statistics-model.md 3.2 에서 온다. 모델은 이미 승격된
차원 가운데 하나를 고르고, 고를 것이 없으면 비운다.

외부 호출은 하지 않는다. OpenAI 클라이언트를 대역으로 대체한다.
"""

from __future__ import annotations

import json
from types import SimpleNamespace
from typing import Any

import pytest
from pydantic import ValidationError

from careersignal.agents.statistics.assigner import (
    ASSIGNMENT_RESPONSE_SCHEMA,
    ASSIGNMENT_TASK,
    NO_DIMENSIONS,
    NO_SECTION,
    AssignmentJudgment,
    DimensionAssigner,
    OpenAIDimensionAssigner,
    StubDimensionAssigner,
    user_message,
)
from careersignal.agents.statistics.judge import DimensionOption
from careersignal.providers.models import TASK_TIER, Tier, chat_model


class FakeOpenAI:
    """OpenAI 클라이언트의 대역. 요청을 기록하고 정해 둔 답을 준다."""

    def __init__(self, payload: dict[str, Any]) -> None:
        self.requests: list[dict[str, Any]] = []
        self._payload = payload
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def _create(self, **kwargs: Any) -> Any:
        self.requests.append(kwargs)
        content = json.dumps(self._payload, ensure_ascii=False)
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=content))]
        )


def _payload(**overrides: Any) -> dict[str, Any]:
    payload = {
        "dimension_id": "dim_queue",
        "rationale": "메시지 브로커 운영은 메시지 큐 차원이다",
        "confidence": 0.7,
    }
    payload.update(overrides)
    return payload


def _options() -> tuple[DimensionOption, ...]:
    return (
        DimensionOption(
            dimension_id="dim_queue",
            label="메시지 큐",
            definition="메시지 브로커로 작업을 비동기로 전달한다",
        ),
    )


# ============================================================ 계약
def test_a_judgment_without_a_dimension_is_not_assigned() -> None:
    assert AssignmentJudgment().assigned is False


def test_a_judgment_with_a_dimension_is_assigned() -> None:
    assert AssignmentJudgment(dimension_id="dim_queue").assigned is True


def test_a_confidence_outside_the_range_is_rejected() -> None:
    with pytest.raises(ValidationError):
        AssignmentJudgment(dimension_id="dim_queue", confidence=1.5)


def test_the_assignment_task_is_placed_on_the_light_tier() -> None:
    """닫힌 목록에서 하나를 고르는 분류다. 근거는 docs/agent-design.md 13장이다."""
    assert TASK_TIER[ASSIGNMENT_TASK] is Tier.LIGHT
    assert OpenAIDimensionAssigner(FakeOpenAI({})).model == chat_model(ASSIGNMENT_TASK)


# ============================================================ 대역
def test_the_stub_satisfies_the_port() -> None:
    assert isinstance(StubDimensionAssigner(), DimensionAssigner)


def test_the_stub_assigns_nothing_without_options() -> None:
    assert StubDimensionAssigner().assign("Kafka 운영 경험").dimension_id is None


def test_the_stub_assigns_the_label_it_finds() -> None:
    judgment = StubDimensionAssigner().assign("메시지 큐 운영 경험", _options())

    assert judgment.dimension_id == "dim_queue"


def test_the_stub_keeps_a_forced_dimension_inside_the_options() -> None:
    """목록 밖의 차원을 강제해도 배정하지 않는다."""
    assert (
        StubDimensionAssigner("dim_ghost").assign("무엇이든", _options()).dimension_id
        is None
    )


def test_the_stub_records_what_it_received() -> None:
    stub = StubDimensionAssigner()

    stub.assign("메시지 큐 운영 경험", _options(), "자격요건")

    assert stub.calls == [("메시지 큐 운영 경험", ("dim_queue",), "자격요건")]


# ============================================================ OpenAI 어댑터
def test_the_adapter_asks_for_structured_output() -> None:
    client = FakeOpenAI(_payload())

    OpenAIDimensionAssigner(client).assign("메시지 브로커 운영 경험", _options())

    request = client.requests[0]["response_format"]
    assert request["type"] == "json_schema"
    assert request["json_schema"]["strict"] is True
    assert request["json_schema"]["schema"] == ASSIGNMENT_RESPONSE_SCHEMA


def test_the_adapter_returns_the_chosen_dimension() -> None:
    assigner = OpenAIDimensionAssigner(FakeOpenAI(_payload()))

    judgment = assigner.assign("메시지 브로커 운영 경험", _options())

    assert judgment.dimension_id == "dim_queue"
    assert judgment.confidence == 0.7


def test_a_dimension_outside_the_options_is_dropped() -> None:
    """없는 차원에 할당을 붙이면 외래키가 끊긴다."""
    assigner = OpenAIDimensionAssigner(FakeOpenAI(_payload(dimension_id="dim_ghost")))

    assert assigner.assign("메시지 브로커 운영 경험", _options()).dimension_id is None


def test_a_null_dimension_stays_unassigned() -> None:
    """가장 가까운 차원에 억지로 붙이지 않는다."""
    assigner = OpenAIDimensionAssigner(FakeOpenAI(_payload(dimension_id=None)))

    assert assigner.assign("Kubernetes 운영", _options()).dimension_id is None


def test_an_empty_option_list_is_not_sent() -> None:
    client = FakeOpenAI(_payload())

    judgment = OpenAIDimensionAssigner(client).assign("Kafka 운영 경험")

    assert judgment.dimension_id is None
    assert client.requests == []


def test_an_empty_expression_is_not_sent() -> None:
    client = FakeOpenAI(_payload())

    with pytest.raises(ValueError):
        OpenAIDimensionAssigner(client).assign("   ", _options())

    assert client.requests == []


# ============================================================ 사용자 메시지
def test_the_user_message_lists_the_options() -> None:
    message = user_message("메시지 브로커 운영 경험", _options(), "자격요건")

    assert "dim_queue | 메시지 큐" in message
    assert "자격요건" in message


def test_the_user_message_marks_what_is_missing() -> None:
    message = user_message("메시지 브로커 운영 경험")

    assert NO_DIMENSIONS in message
    assert NO_SECTION in message
