"""sse-contract.md 적합성 테스트.

계약 문서의 "이벤트 목록"과 "순서 규칙"을 코드로 옮긴 것이다.
계약에 **없는 필드를 보내지 않고**, 있는 필드를 **빠뜨리지 않는지** 검사한다.

정상 실행만으로는 `retry`·`paper_failed`·`empty`·`error` 분기가 나오지 않으므로,
그 경로들은 여기서 각각 만들어 검사한다. 실제 API 호출 없이 돈다.
"""

import json

import pytest

from app import agent, main, prompt_loader

# ---------------------------------------------------------------------------
# docs/spec/sse-contract.md "이벤트 목록"을 그대로 옮긴 것.
# 계약을 고치면 여기도 같이 고친다 (계약이 먼저, 코드가 나중 — CLAUDE.md).
# ---------------------------------------------------------------------------
CONTRACT_FIELDS: dict[str, set[str]] = {
    "search": {"stage", "topic"},
    "found": {"stage", "count"},
    "judge": {"stage", "total", "selected", "picked", "excluded"},
    "read": {"stage", "index", "total", "title", "used_fulltext", "reason"},
    "retry": {"stage", "index", "attempt", "feedback"},
    "paper_done": {
        "stage",
        "index",
        "title",
        "arxiv_id",
        "url",
        "date",
        "used_fulltext",
        "retried",
        "summary",
        "abstract",
    },
    "paper_failed": {"stage", "index", "title", "url", "reason"},
    "trend": {"stage"},
    "done": {"stage", "elapsed", "stats", "trend"},
    "empty": {"stage", "scanned", "suggestions"},
    "error": {"stage", "message", "code", "at"},
}

TERMINAL_STAGES = {"done", "empty", "error"}

# `done.stats`와 `paper_done.summary`는 중첩 dict라 별도로 규정돼 있다.
STATS_FIELDS = {"scanned", "selected", "succeeded", "failed", "llm_calls"}
SUMMARY_FIELDS = {"contribution", "method", "result"}


def assert_contract(event: dict) -> None:
    """이벤트 하나가 계약과 정확히 일치하는지 검사한다."""
    stage = event.get("stage")
    assert stage in CONTRACT_FIELDS, f"계약에 없는 stage: {stage!r}"

    expected = CONTRACT_FIELDS[stage]
    actual = set(event)
    assert not (actual - expected), f"{stage}: 계약에 없는 필드 {actual - expected}"
    assert not (expected - actual), f"{stage}: 계약에 있는 필드 누락 {expected - actual}"

    if stage == "done":
        assert set(event["stats"]) == STATS_FIELDS, f"done.stats 필드 불일치: {event['stats']}"
        assert set(event["trend"]) == {"flows", "gap"}, f"done.trend 필드 불일치: {event['trend']}"
    if stage == "paper_done":
        assert set(event["summary"]) == SUMMARY_FIELDS, (
            "요약은 반드시 3키 고정이다 (기여·방법·결과). 자유 문단 금지."
        )


def assert_order(events: list[dict]) -> None:
    """종결 이벤트가 정확히 마지막에 한 번만 나오는지 검사한다.

    계약: done/empty/error는 종결 이벤트다. 이후 아무것도 보내지 않는다.
    """
    stages = [e["stage"] for e in events]
    terminal_positions = [i for i, s in enumerate(stages) if s in TERMINAL_STAGES]

    assert terminal_positions, f"종결 이벤트가 없다: {stages}"
    assert len(terminal_positions) == 1, f"종결 이벤트가 여러 번 나왔다: {stages}"
    assert terminal_positions[0] == len(stages) - 1, f"종결 이벤트 뒤에 이벤트가 더 있다: {stages}"


def assert_trend_references(events: list[dict]) -> None:
    """트렌드의 `flows[].papers`가 실제로 나간 `paper_done.index`만 가리키는지 검사한다.

    계약: "flows[].papers는 paper_done의 index 배열. 프론트는 이걸로 논문 칩을 만들고
    클릭 시 해당 카드로 스크롤한다. **주장에는 근거가 붙어야 한다.**"
    없는 index를 가리키면 칩을 눌러도 아무 데도 가지 않는다.
    """
    done = [e for e in events if e["stage"] == "done"]
    if not done:
        return

    available = {e["index"] for e in events if e["stage"] == "paper_done"}
    for flow in done[0]["trend"]["flows"]:
        referenced = set(flow.get("papers", []))
        assert referenced <= available, (
            f"트렌드가 없는 논문을 가리킨다: {referenced - available} (가능: {available})"
        )


def _paper(i: int) -> dict:
    return {
        "id": f"260{i}.0000{i}",
        "title": f"Paper {i}",
        "abstract": f"Abstract {i}",
        "url": f"https://arxiv.org/abs/260{i}.0000{i}",
        "pdf_url": f"https://arxiv.org/pdf/260{i}.0000{i}",
        "published": "2026-07-01",
    }


# 각 프롬프트의 첫 문장. prompt_loader.load()가 '## 프롬프트' 블록만 뽑아내므로
# 파일의 `# N단계` 제목은 실제 프롬프트에 들어가지 않는다 — 블록 안에서 표지를 잡아야 한다.
# 아무 키워드나 쓰면 프롬프트끼리 겹친다(예: "본문"은 select_tool·summarize 양쪽에 나온다).
STAGE_MARKERS = {
    "judge": "논문 큐레이터다",
    "select_tool": "초록만으로 '기여·방법·결과'를 정확히 쓸 수 있는가",
    "summarize": "AI 연구자용으로 요약하라",
    "verify": "너는 까다로운 리뷰어다",
    "trend": "이들을 관통하는 흐름을 찾아라",
}


@pytest.mark.parametrize(("stage", "marker"), STAGE_MARKERS.items())
def test_stage_markers_still_match_prompts(stage: str, marker: str):
    """스텁이 쓰는 표지가 실제 프롬프트에 남아 있는지 확인한다.

    프롬프트를 고쳐 표지가 사라지면 스텁이 조용히 fallback으로 빠지고, 아래 테스트들이
    "아무것도 검증하지 않으면서 통과"하게 된다. 그 상태를 여기서 먼저 실패시킨다.
    """
    assert marker in prompt_loader.load(stage), (
        f"prompts/{stage}.md가 바뀌어 표지 {marker!r}가 사라졌다. STAGE_MARKERS를 갱신할 것."
    )


@pytest.fixture
def stub_llm(monkeypatch):
    """LLM·arXiv를 전부 대역으로 바꾼다. 단계별 응답을 테스트가 지정한다.

    `responses`는 {단계이름: 응답} 또는 {단계이름: [응답, 응답, ...]}(호출 순서대로 소비).
    """

    def _apply(*, papers: list[dict], responses: dict) -> None:
        monkeypatch.setattr("app.tools.search_arxiv", lambda *a, **k: papers)
        monkeypatch.setattr("app.tools.fetch_fulltext", lambda *a, **k: "본문 텍스트")

        def _fake_ask_llm_json(prompt: str, fallback, attempts: int = 1):
            for stage, marker in STAGE_MARKERS.items():
                if marker in prompt and stage in responses:
                    value = responses[stage]
                    return value.pop(0) if isinstance(value, list) else value
            return fallback

        monkeypatch.setattr("app.tools.ask_llm_json", _fake_ask_llm_json)

    return _apply


def _judge_response(papers: list[dict]) -> dict:
    """judge LLM의 원시 응답. index 기반이다 — SSE의 title/reason 형태는
    _format_judge_event()가 따로 만든다 (agent.py:73)."""
    return {
        "picked": [{"index": i, "reason": "관련 있음"} for i in range(len(papers))],
        "excluded": [],
    }


def test_normal_path_matches_contract(stub_llm):
    """정상 경로(search→found→judge→read→paper_done→trend→done)가 계약과 일치한다."""
    papers = [_paper(1)]
    stub_llm(
        papers=papers,
        responses={
            "judge": _judge_response(papers),
            "select_tool": {"need_fulltext": False, "reason": "초록으로 충분"},
            "summarize": {"contribution": "기여", "method": "방법", "result": "결과"},
            "verify": {"is_good": True, "feedback": ""},
            "trend": {"flows": [], "gap": None},
        },
    )

    events = list(agent.run_agent("LLM agent planning", limit=1))

    for event in events:
        assert_contract(event)
    assert_order(events)
    assert [e["stage"] for e in events] == [
        "search",
        "found",
        "judge",
        "read",
        "paper_done",
        "trend",
        "done",
    ]


def test_retry_path_matches_contract(stub_llm):
    """자기 검증 실패 → retry 이벤트가 계약과 일치한다.

    정상 실행에서는 좀처럼 안 나오는 분기라, 여기서 강제로 만들어 검사한다.
    이 이벤트는 "스스로 점검했다"는 증거이므로 감추지 않는다 (계약 하이라이트 2).
    """
    papers = [_paper(1)]
    stub_llm(
        papers=papers,
        responses={
            "judge": _judge_response(papers),
            "select_tool": {"need_fulltext": True, "reason": "세부 설정이 필요"},
            "summarize": {"contribution": "기여", "method": "방법", "result": "결과"},
            # 1회 실패 후 통과 → retry 이벤트가 정확히 1개 나온다
            "verify": [
                {"is_good": False, "feedback": "실험 설정 설명이 누락됨"},
                {"is_good": True, "feedback": ""},
            ],
            "trend": {"flows": [], "gap": None},
        },
    )

    events = list(agent.run_agent("LLM agent planning", limit=1))

    for event in events:
        assert_contract(event)
    assert_order(events)

    retries = [e for e in events if e["stage"] == "retry"]
    assert len(retries) == 1
    assert retries[0]["attempt"] == 1, "attempt는 1부터 센다 (계약)"
    assert retries[0]["feedback"] == "실험 설정 설명이 누락됨"


def test_paper_failed_path_matches_contract(stub_llm):
    """부분 실패(paper_failed)가 계약과 일치한다.

    이건 에러가 아니라 정상적인 결말이다. url은 필수 — AI가 못 읽었으면 사람이 읽으면 된다.
    """
    papers = [_paper(1)]
    stub_llm(
        papers=papers,
        responses={
            "judge": _judge_response(papers),
            "select_tool": {"need_fulltext": False, "reason": "초록으로 충분"},
            # summarize가 계속 파싱 실패해 None을 반환하는 상황
            "summarize": None,
            "trend": {"flows": [], "gap": None},
        },
    )

    events = list(agent.run_agent("LLM agent planning", limit=1))

    for event in events:
        assert_contract(event)
    assert_order(events)

    failed = [e for e in events if e["stage"] == "paper_failed"]
    assert len(failed) == 1
    assert failed[0]["url"], "paper_failed에는 원문 url이 반드시 있어야 한다"
    assert events[-1]["stage"] == "done", "부분 실패는 error가 아니라 done으로 끝난다"


def test_trend_only_references_papers_that_were_sent(stub_llm):
    """트렌드가 실제로 나간 논문만 가리킨다 (계약: 주장에는 근거가 붙어야 한다).

    없는 index를 가리키면 프론트의 논문 칩을 눌러도 아무 데도 가지 않는다.
    """
    papers = [_paper(1), _paper(2)]
    stub_llm(
        papers=papers,
        responses={
            "judge": _judge_response(papers),
            "select_tool": {"need_fulltext": False, "reason": "초록으로 충분"},
            "summarize": {"contribution": "기여", "method": "방법", "result": "결과"},
            "verify": {"is_good": True, "feedback": ""},
            "trend": {
                "flows": [{"title": "흐름", "body": "본문", "papers": [1, 2]}],
                "gap": "비용을 다루는 논문이 없다",
            },
        },
    )

    events = list(agent.run_agent("LLM agent planning", limit=2))

    for event in events:
        assert_contract(event)
    assert_order(events)
    assert_trend_references(events)


def test_empty_path_matches_contract(monkeypatch):
    """결과 없음(empty)은 에러가 아니며 계약과 일치한다."""
    monkeypatch.setattr("app.tools.search_arxiv", lambda *a, **k: [])

    events = list(agent.run_agent("존재하지 않는 주제", limit=3))

    for event in events:
        assert_contract(event)
    assert_order(events)
    assert [e["stage"] for e in events] == ["search", "found", "empty"]


def test_error_path_matches_contract(monkeypatch):
    """전체 실패(error)가 계약과 일치한다."""

    def _boom(*a, **k):
        raise RuntimeError("arXiv 접속 불가")

    monkeypatch.setattr("app.tools.search_arxiv", _boom)

    events = list(agent.run_agent("LLM agent planning", limit=3))

    for event in events:
        assert_contract(event)
    assert_order(events)
    assert events[-1]["stage"] == "error"


def test_stream_error_matches_contract(monkeypatch):
    """main.py가 만드는 error 이벤트도 계약과 일치한다 (7-4)."""

    def _blows_up(topic, limit=None):
        yield {"stage": "search", "topic": topic}
        raise RuntimeError("의도적 실패")

    monkeypatch.setattr(main.agent, "run_agent", _blows_up)

    frames = list(main._event_stream("LLM agent planning", limit=3))
    events = [json.loads(f[len("data: ") :]) for f in frames]

    for event in events:
        assert_contract(event)
    assert_order(events)
