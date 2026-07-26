"""오케스트레이션(run_agent) 테스트."""

from app import agent


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
