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


def test_run_agent_errors_when_search_fails(monkeypatch):
    """검색 자체가 실패하면(예외) error로 즉시 종결한다 (6-4b)."""
    def _boom(*a, **k):
        raise RuntimeError("network down")

    monkeypatch.setattr("app.tools.search_arxiv", _boom)

    events = list(agent.run_agent("LLM agent planning", limit=3))

    assert events == [
        {"stage": "search", "topic": "LLM agent planning"},
        {
            "stage": "error",
            "message": "arXiv 검색에 실패했습니다.",
            "code": "search_failed",
            "at": "검색 단계 (RuntimeError)",
        },
    ]


def test_run_agent_errors_when_judge_fails(monkeypatch):
    """judge가 완전히 실패(picked·excluded 둘 다 빈 raw 응답)하면 paper_done 없이 error로 종결한다 (6-4b)."""
    papers = _mock_papers()
    monkeypatch.setattr("app.tools.search_arxiv", lambda *a, **k: papers)
    monkeypatch.setattr("app.agent._call_judge", lambda topic, papers: {"picked": [], "excluded": []})

    events = list(agent.run_agent("LLM agent planning", limit=3))

    assert events == [
        {"stage": "search", "topic": "LLM agent planning"},
        {"stage": "found", "count": 2},
        {
            "stage": "error",
            "message": "논문 중요도 판단에 실패했습니다.",
            "code": "judge_failed",
            "at": "판단 단계",
        },
    ]


def test_run_agent_marks_only_failing_paper_as_paper_failed(monkeypatch):
    """논문 처리 중 예외가 나면 그 논문만 paper_failed, 나머지는 정상 진행한다 (6-4a)."""
    papers = _mock_papers()
    monkeypatch.setattr("app.tools.search_arxiv", lambda *a, **k: papers)
    monkeypatch.setattr(
        "app.agent._call_judge",
        lambda topic, papers: {
            "picked": [{"index": 0, "reason": "r0"}, {"index": 1, "reason": "r1"}],
            "excluded": [],
        },
    )

    def _select_tool(paper):
        if paper["title"] == "T1":
            raise RuntimeError("select_tool 폭발")
        return {"need_fulltext": False, "reason": "초록으로 충분"}

    monkeypatch.setattr("app.agent._select_tool", _select_tool)
    summary = {"contribution": "c", "method": "m", "result": "r"}
    monkeypatch.setattr("app.agent._call_summarize", lambda title, src, feedback="": summary)
    monkeypatch.setattr("app.agent._call_verify", lambda title, src, summ: {"is_good": True})

    events = list(agent.run_agent("LLM agent planning", limit=3))

    stages = [e["stage"] for e in events]
    assert stages == ["search", "found", "judge", "paper_failed", "read", "paper_done"]

    failed = events[3]
    assert failed["stage"] == "paper_failed" and failed["index"] == 1 and failed["title"] == "T1"
    # 예외 메시지 원문("select_tool 폭발")은 노출하지 않는다 — 비밀·경로 유출 방지. 예외 종류만 남긴다.
    assert "RuntimeError" in failed["reason"]
    assert "select_tool 폭발" not in failed["reason"]

    done = events[5]
    assert done["index"] == 2 and done["title"] == "T2"


def test_run_agent_marks_paper_failed_when_summarize_gives_up(monkeypatch):
    """summarize가 반복 실패해 None을 반환하면 verify를 거치지 않고 paper_failed로 넘어간다 (6-4a)."""
    papers = _mock_papers()[:1]
    monkeypatch.setattr("app.tools.search_arxiv", lambda *a, **k: papers)
    monkeypatch.setattr(
        "app.agent._call_judge",
        lambda topic, papers: {"picked": [{"index": 0, "reason": "r0"}], "excluded": []},
    )
    monkeypatch.setattr(
        "app.agent._select_tool", lambda paper: {"need_fulltext": False, "reason": "초록으로 충분"}
    )
    monkeypatch.setattr("app.agent._call_summarize", lambda title, src, feedback="": None)

    events = list(agent.run_agent("LLM agent planning", limit=3))

    stages = [e["stage"] for e in events]
    assert stages == ["search", "found", "judge", "read", "paper_failed"]
    assert events[4] == {
        "stage": "paper_failed",
        "index": 1,
        "title": "T1",
        "url": "u1",
        "reason": "요약 생성에 반복 실패했습니다.",
    }
