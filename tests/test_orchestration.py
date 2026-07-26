"""오케스트레이션(run_agent) 테스트."""

from app import agent


def _mock_papers():
    return [
        {"id": "1", "title": "T1", "abstract": "A1", "url": "u1", "pdf_url": "p1", "published": "2026-01-01"},
        {"id": "2", "title": "T2", "abstract": "A2", "url": "u2", "pdf_url": "p2", "published": "2026-01-02"},
    ]


def test_run_agent_yields_search_then_found(monkeypatch):
    """맨 처음 두 이벤트가 search→found 순서로 나간다 (6-1)."""
    papers = [
        {"title": "T1", "abstract": "A1", "id": "1", "url": "u1", "pdf_url": "p1", "published": "2026-01-01"},
        {"title": "T2", "abstract": "A2", "id": "2", "url": "u2", "pdf_url": "p2", "published": "2026-01-02"},
    ]
    monkeypatch.setattr("app.tools.search_arxiv", lambda *a, **k: papers)

    events = agent.run_agent("LLM agent planning", limit=3)

    assert next(events) == {"stage": "search", "topic": "LLM agent planning"}
    assert next(events) == {"stage": "found", "count": 2}


def test_run_agent_ends_with_empty_when_no_papers(monkeypatch):
    """검색 결과 0편이면 search→found→empty로 끝나고 그 뒤로 아무 이벤트도 없다 (6-2)."""
    monkeypatch.setattr("app.tools.search_arxiv", lambda *a, **k: [])

    events = list(agent.run_agent("LLM agent planning", limit=3))

    assert events == [
        {"stage": "search", "topic": "LLM agent planning"},
        {"stage": "found", "count": 0},
        {"stage": "empty", "scanned": 0, "suggestions": []},
    ]


def test_run_agent_emits_read_and_paper_done_per_picked_paper(monkeypatch):
    """선택된 논문 2편 각각에 read→paper_done이 순서대로 나온다 (6-3, retry 없는 경로)."""
    papers = _mock_papers()
    monkeypatch.setattr("app.tools.search_arxiv", lambda *a, **k: papers)
    monkeypatch.setattr(
        "app.agent._call_judge",
        lambda topic, papers: {
            "picked": [{"index": 0, "reason": "r0"}, {"index": 1, "reason": "r1"}],
            "excluded": [],
        },
    )
    monkeypatch.setattr(
        "app.agent._select_tool", lambda paper: {"need_fulltext": False, "reason": "초록으로 충분"}
    )
    summary = {"contribution": "c", "method": "m", "result": "r"}
    monkeypatch.setattr("app.agent._call_summarize", lambda title, src, feedback="": summary)
    monkeypatch.setattr("app.agent._call_verify", lambda title, src, summ: {"is_good": True})

    events = list(agent.run_agent("LLM agent planning", limit=3))

    stages = [e["stage"] for e in events]
    assert stages == ["search", "found", "judge", "read", "paper_done", "read", "paper_done"]

    read1, done1 = events[3], events[4]
    assert read1 == {
        "stage": "read",
        "index": 1,
        "total": 2,
        "title": "T1",
        "used_fulltext": False,
        "reason": "초록으로 충분",
    }
    assert done1 == {
        "stage": "paper_done",
        "index": 1,
        "title": "T1",
        "arxiv_id": "1",
        "url": "u1",
        "date": "2026-01-01",
        "used_fulltext": False,
        "retried": 0,
        "summary": summary,
        "abstract": "A1",
    }

    read2, done2 = events[5], events[6]
    assert read2["index"] == 2 and read2["title"] == "T2"
    assert done2["index"] == 2 and done2["title"] == "T2" and done2["arxiv_id"] == "2"


def test_run_agent_includes_retry_events_between_read_and_paper_done(monkeypatch):
    """검증 실패→재시도가 있으면 read와 paper_done 사이에 retry 이벤트가 끼어든다 (6-3)."""
    papers = _mock_papers()[:1]
    monkeypatch.setattr("app.tools.search_arxiv", lambda *a, **k: papers)
    monkeypatch.setattr(
        "app.agent._call_judge",
        lambda topic, papers: {"picked": [{"index": 0, "reason": "r0"}], "excluded": []},
    )
    monkeypatch.setattr(
        "app.agent._select_tool", lambda paper: {"need_fulltext": False, "reason": "초록으로 충분"}
    )
    monkeypatch.setattr("app.agent._call_summarize", lambda title, src, feedback="": {"contribution": "c", "method": "m", "result": "r"})
    verdicts = iter([{"is_good": False, "feedback": "부족함"}, {"is_good": True}])
    monkeypatch.setattr("app.agent._call_verify", lambda title, src, summ: next(verdicts))

    events = list(agent.run_agent("LLM agent planning", limit=3))

    stages = [e["stage"] for e in events]
    assert stages == ["search", "found", "judge", "read", "retry", "paper_done"]
    assert events[4] == {"stage": "retry", "index": 1, "attempt": 1, "feedback": "부족함"}
    assert events[5]["retried"] == 1
