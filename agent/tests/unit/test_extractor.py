"""요구 표현 추출 검증.

규칙은 docs/knowledge-schema.md 5장과 docs/erd.md 6.1에서 온다. 생성 모델을
대역으로 대체하고 원문 일치·라벨 보존·구조화 출력 요청만 검사한다. 외부 호출은
하지 않는다.
"""

from __future__ import annotations

import json
from types import SimpleNamespace
from typing import Any

import pytest
from pydantic import ValidationError

from careersignal.agents.statistics.extractor import (
    EXTRACTION_TASK,
    MENTION_EXTRACTION_PROMPT,
    MENTION_RESPONSE_SCHEMA,
    NO_SECTION,
    NON_REQUIREMENT_KINDS,
    REQUIREMENT_SCOPE,
    MentionCandidate,
    MentionExtractor,
    OpenAIMentionExtractor,
    StubMentionExtractor,
    user_message,
)
from careersignal.providers.models import TASK_TIER, Tier, chat_model

SECTION = "자격요건"
CHUNK = """자격요건
- Java 또는 Kotlin 으로 서비스를 개발한 경험
- 관계형 데이터베이스 사용 경험
· 대규모 트래픽 처리에 대한 이해
저희는 즐겁게 일하는 팀입니다.
"""


class FakeOpenAI:
    """OpenAI 클라이언트의 대역. 요청을 기록하고 정해 둔 답을 준다."""

    def __init__(self, mentions: list[dict[str, Any]] | None = None) -> None:
        self.requests: list[dict[str, Any]] = []
        self._mentions = mentions if mentions is not None else []
        self.chat = SimpleNamespace(
            completions=SimpleNamespace(create=self._create)
        )

    def _create(self, **kwargs: Any) -> Any:
        self.requests.append(kwargs)
        content = json.dumps({"mentions": self._mentions}, ensure_ascii=False)
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=content))]
        )


class RawOpenAI:
    """응답 본문을 그대로 정하는 대역. 스키마를 벗어난 답을 흉내 낸다."""

    def __init__(self, content: str | None) -> None:
        self.requests: list[dict[str, Any]] = []
        self._content = content
        self.chat = SimpleNamespace(
            completions=SimpleNamespace(create=self._create)
        )

    def _create(self, **kwargs: Any) -> Any:
        self.requests.append(kwargs)
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=self._content))]
        )


def mention(
    raw_expression: str,
    stated_requiredness: str = SECTION,
    confidence: float | None = 0.9,
) -> dict[str, Any]:
    return {
        "raw_expression": raw_expression,
        "stated_requiredness": stated_requiredness,
        "confidence": confidence,
    }


# ============================================================ 프롬프트가 다루는 사례
# 프롬프트의 품질은 모델을 부르지 않고 잴 수 없다. 대신 프롬프트가 다루기로 한 사례를
# 상수로 두고, 그 상수가 지시문 안에 실제로 들어 있는지와 알려진 오추출 갈래를
# 덮는지를 확인한다. 문장 표현이 아니라 사례 목록에만 걸어 결합을 좁게 둔다.
def test_the_prompt_carries_every_case_it_declares() -> None:
    """상수와 지시문이 갈라지지 않는다."""
    for case in REQUIREMENT_SCOPE + NON_REQUIREMENT_KINDS:
        assert case in MENTION_EXTRACTION_PROMPT


def test_the_requirement_scope_is_stated_positively() -> None:
    """제외 목록은 언제나 불완전하므로 요구의 적극적 기준을 함께 준다."""
    assert REQUIREMENT_SCOPE
    joined = " ".join(REQUIREMENT_SCOPE)
    assert "지원자가 갖추어야 할" in joined


def test_the_requirement_scope_covers_the_work_to_be_done() -> None:
    """`requiredness` 의 `responsibility` 는 주요업무 구간에서만 나온다."""
    assert "맡을 업무" in " ".join(REQUIREMENT_SCOPE)


@pytest.mark.parametrize(
    "phrase",
    ["법령 고지", "장애인고용촉진 및 직업재활법", "우대 채용 대상", "개인정보"],
)
def test_a_legal_notice_is_not_a_requirement(phrase: str) -> None:
    """공고 끝머리의 고지 문단이 요구로 뽑히던 갈래다."""
    assert phrase in " ".join(NON_REQUIREMENT_KINDS)


@pytest.mark.parametrize("phrase", ["수습 기간", "근무지", "근무 시간"])
def test_a_working_condition_is_not_a_requirement(phrase: str) -> None:
    """`근무 조건` 이라는 갈래 이름만으로는 실제 문장과 닿지 않는다."""
    assert phrase in " ".join(NON_REQUIREMENT_KINDS)


def test_the_prompt_keeps_an_excluded_word_from_hiding_a_requirement() -> None:
    """제외 갈래의 말이 들어 있어도 맡을 일이면 뽑는다.

    docs/eval/backend_v1.json 의 `exp_daangn_identity_05` 가 `개인정보` 를 담은
    기대 항목이다. 갈래 이름만 읽으면 개인정보 안내로 오인할 수 있다.
    """
    assert "안내 문장" in MENTION_EXTRACTION_PROMPT
    assert "개인정보 보호를 고려한 인증 시스템을" in MENTION_EXTRACTION_PROMPT


def test_the_prompt_warns_against_splitting_alternatives() -> None:
    """선택지를 쪼개면 `posting_prevalence` 의 분자가 차원마다 늘어난다."""
    assert "Java/Kotlin 기반 서버 개발 경험" in MENTION_EXTRACTION_PROMPT


def test_the_prompt_says_the_missing_label_placeholder_is_not_a_label() -> None:
    """사용자 메시지가 라벨 자리에 이 말을 적는다."""
    assert NO_SECTION in MENTION_EXTRACTION_PROMPT
    assert NO_SECTION in user_message(None, CHUNK)


def test_the_schema_fields_match_the_candidate() -> None:
    """프롬프트가 늘어나도 응답 모양은 그대로다."""
    item = MENTION_RESPONSE_SCHEMA["properties"]["mentions"]["items"]

    assert set(item["properties"]) == set(MentionCandidate.model_fields)


# ============================================================ 대역
def test_the_stub_takes_list_items_as_expressions() -> None:
    candidates = StubMentionExtractor().extract(SECTION, CHUNK)

    assert [c.raw_expression for c in candidates] == [
        "Java 또는 Kotlin 으로 서비스를 개발한 경험",
        "관계형 데이터베이스 사용 경험",
        "대규모 트래픽 처리에 대한 이해",
    ]


def test_the_stub_leaves_lines_without_a_list_mark() -> None:
    """목록이 아닌 줄은 표현이 아니다. 회사 소개가 여기서 걸러진다."""
    candidates = StubMentionExtractor().extract(SECTION, CHUNK)

    assert all("즐겁게" not in c.raw_expression for c in candidates)


def test_every_stub_expression_is_a_substring_of_the_chunk() -> None:
    """`evidence_span_*` 이 이 문자열을 원문 위치로 고정한다."""
    candidates = StubMentionExtractor().extract(SECTION, CHUNK)

    assert candidates
    assert all(c.raw_expression in CHUNK for c in candidates)


def test_the_stub_passes_the_section_label_through() -> None:
    """`stated_requiredness` 는 열거값이 아니라 라벨 원문이다."""
    candidates = StubMentionExtractor().extract("이런 분을 찾습니다", CHUNK)

    assert {c.stated_requiredness for c in candidates} == {"이런 분을 찾습니다"}


def test_the_stub_gives_the_same_result_for_the_same_input() -> None:
    extractor = StubMentionExtractor()

    assert extractor.extract(SECTION, CHUNK) == extractor.extract(SECTION, CHUNK)
    assert StubMentionExtractor().extract(SECTION, CHUNK) == extractor.extract(
        SECTION, CHUNK
    )


def test_the_stub_without_a_section_leaves_the_label_empty() -> None:
    candidates = StubMentionExtractor().extract(None, CHUNK)

    assert {c.stated_requiredness for c in candidates} == {""}


def test_the_stub_returns_nothing_for_a_chunk_without_list_items() -> None:
    candidates = StubMentionExtractor().extract(SECTION, "회사 소개 문단입니다.")

    assert candidates == ()


def test_the_stub_satisfies_the_extractor_protocol() -> None:
    assert isinstance(StubMentionExtractor(), MentionExtractor)
    assert isinstance(OpenAIMentionExtractor(FakeOpenAI()), MentionExtractor)


# ============================================================ 후보 계약
@pytest.mark.parametrize("confidence", [-0.1, 1.1, 2.0])
def test_a_confidence_outside_zero_and_one_is_refused(confidence: float) -> None:
    """`extraction_confidence` 의 `CHECK BETWEEN 0 AND 1` 을 앞당겨 막는다."""
    with pytest.raises(ValidationError):
        MentionCandidate(
            raw_expression="Java 숙련",
            stated_requiredness=SECTION,
            confidence=confidence,
        )


def test_an_unknown_key_is_refused() -> None:
    with pytest.raises(ValidationError):
        MentionCandidate(
            raw_expression="Java 숙련",
            stated_requiredness=SECTION,
            dimension_id="dim_java",
        )


def test_a_candidate_cannot_be_changed_after_creation() -> None:
    candidate = MentionCandidate(raw_expression="Java 숙련", stated_requiredness=SECTION)

    with pytest.raises(ValidationError):
        candidate.raw_expression = "Java"


def test_a_candidate_without_a_confidence_is_allowed() -> None:
    """`extraction_confidence` 는 nullable 이다."""
    candidate = MentionCandidate(raw_expression="Java 숙련", stated_requiredness=SECTION)

    assert candidate.confidence is None


# ============================================================ OpenAI 어댑터
def test_the_openai_extractor_asks_for_the_model_of_its_tier() -> None:
    """배치는 docs/agent-design.md 13장이고 표는 `TASK_TIER` 다."""
    sdk = FakeOpenAI([mention("Java 또는 Kotlin 으로 서비스를 개발한 경험")])

    OpenAIMentionExtractor(sdk).extract(SECTION, CHUNK)

    assert TASK_TIER[EXTRACTION_TASK] is Tier.STANDARD
    assert sdk.requests[0]["model"] == chat_model(EXTRACTION_TASK)


def test_the_openai_extractor_asks_for_structured_output() -> None:
    """자유 문장이 오지 않게 스키마를 강제한다."""
    sdk = FakeOpenAI()

    OpenAIMentionExtractor(sdk).extract(SECTION, CHUNK)

    response_format = sdk.requests[0]["response_format"]
    assert response_format["type"] == "json_schema"
    assert response_format["json_schema"]["strict"] is True
    assert response_format["json_schema"]["schema"] is MENTION_RESPONSE_SCHEMA

    item = MENTION_RESPONSE_SCHEMA["properties"]["mentions"]["items"]
    assert item["additionalProperties"] is False
    assert set(item["required"]) == {
        "raw_expression",
        "stated_requiredness",
        "confidence",
    }


def test_the_openai_extractor_sends_the_prompt_and_the_chunk() -> None:
    sdk = FakeOpenAI()

    OpenAIMentionExtractor(sdk).extract(SECTION, CHUNK)

    messages = sdk.requests[0]["messages"]
    assert messages[0]["content"] == MENTION_EXTRACTION_PROMPT
    assert SECTION in messages[1]["content"]
    assert CHUNK in messages[1]["content"]


def test_the_openai_extractor_keeps_the_label_the_model_reported() -> None:
    sdk = FakeOpenAI([mention("관계형 데이터베이스 사용 경험", "이런 분이면 더 좋아요")])

    candidates = OpenAIMentionExtractor(sdk).extract(SECTION, CHUNK)

    assert candidates[0].stated_requiredness == "이런 분이면 더 좋아요"
    assert candidates[0].confidence == 0.9


def test_an_expression_that_is_not_in_the_chunk_is_dropped() -> None:
    """표준 용어로 바꾼 표현은 원문 위치를 가질 수 없다."""
    sdk = FakeOpenAI(
        [
            mention("관계형 데이터베이스 사용 경험"),
            mention("RDBMS"),
        ]
    )

    candidates = OpenAIMentionExtractor(sdk).extract(SECTION, CHUNK)

    assert [c.raw_expression for c in candidates] == ["관계형 데이터베이스 사용 경험"]


def test_a_confidence_outside_the_range_drops_the_candidate() -> None:
    sdk = FakeOpenAI([mention("관계형 데이터베이스 사용 경험", SECTION, 1.4)])

    assert OpenAIMentionExtractor(sdk).extract(SECTION, CHUNK) == ()


def test_a_blank_expression_is_dropped() -> None:
    """공백만 남은 표현은 자리를 가질 수 없다."""
    sdk = FakeOpenAI([mention("   "), mention("관계형 데이터베이스 사용 경험")])

    candidates = OpenAIMentionExtractor(sdk).extract(SECTION, CHUNK)

    assert [c.raw_expression for c in candidates] == ["관계형 데이터베이스 사용 경험"]


def test_a_missing_label_becomes_an_empty_string() -> None:
    """`stated_requiredness` 는 NOT NULL 이다."""
    sdk = FakeOpenAI([{"raw_expression": "관계형 데이터베이스 사용 경험"}])

    candidates = OpenAIMentionExtractor(sdk).extract(SECTION, CHUNK)

    assert candidates[0].stated_requiredness == ""
    assert candidates[0].confidence is None


def test_an_item_that_is_not_an_object_is_ignored() -> None:
    expression = "관계형 데이터베이스 사용 경험"
    sdk = RawOpenAI(
        json.dumps({"mentions": [expression, mention(expression)]}, ensure_ascii=False)
    )

    candidates = OpenAIMentionExtractor(sdk).extract(SECTION, CHUNK)

    assert [c.raw_expression for c in candidates] == [expression]


def test_a_response_that_is_not_a_list_of_mentions_is_refused() -> None:
    """모양이 깨진 응답을 근거 없음으로 삼키지 않는다."""
    sdk = RawOpenAI(json.dumps({"mentions": {"raw_expression": "RDBMS"}}))

    with pytest.raises(ValueError):
        OpenAIMentionExtractor(sdk).extract(SECTION, CHUNK)


def test_an_empty_response_gives_no_candidate() -> None:
    assert OpenAIMentionExtractor(RawOpenAI("")).extract(SECTION, CHUNK) == ()


def test_an_empty_chunk_is_not_sent() -> None:
    sdk = FakeOpenAI()

    assert OpenAIMentionExtractor(sdk).extract(SECTION, "   \n ") == ()
    assert sdk.requests == []


def test_the_extractor_is_created_without_an_api_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """키는 실제로 호출할 때만 필요하다."""
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    extractor = OpenAIMentionExtractor()

    assert extractor.model == chat_model(EXTRACTION_TASK)
    assert extractor.task == EXTRACTION_TASK
