"""트렌드 추론(trend) 테스트.

5-1(#34): 성공 논문에서 모은 요약 리스트의 각 원소가
index/title/contribution/method/result 키를 모두 가지는지 검증한다.
"""

from app import agent


def test_collect_summaries_flattens_to_five_keys():
    """성공 논문 리스트를 평탄화하면 각 원소가 5키를 최상위로 가진다 (5-1)."""
    # summary는 중첩 dict, 그 밖에 url 같은 여분 필드가 섞여 들어올 수 있다.
    successful = [
        {
            "index": 1,
            "title": "Tree-of-Agents",
            "summary": {"contribution": "c1", "method": "m1", "result": "r1"},
            "url": "https://arxiv.org/abs/2506.14231",
        },
        {
            "index": 2,
            "title": "Memory-Augmented Planning",
            "summary": {"contribution": "c2", "method": "m2", "result": "r2"},
        },
    ]

    result = agent._collect_summaries(successful)

    # 완료 기준: 각 원소가 5키를 모두 가진다
    for elem in result:
        assert {"index", "title", "contribution", "method", "result"} <= elem.keys()
    # 여분 필드(url)는 딸려오지 않고, summary는 최상위로 펼쳐진다
    assert result[0] == {
        "index": 1,
        "title": "Tree-of-Agents",
        "contribution": "c1",
        "method": "m1",
        "result": "r1",
    }


def test_trend_skips_when_no_summaries(monkeypatch):
    """성공 논문이 0편이면 LLM 호출 없이 즉시 빈 결과를 반환한다 (5-2)."""
    # LLM 경계를 "호출되면 실패"로 막는다. trend가 여길 타면 테스트가 깨진다.
    def _boom(prompt):
        raise AssertionError("성공 논문 0편이면 LLM을 호출하면 안 된다")

    monkeypatch.setattr("app.tools.ask_llm", _boom)

    result = agent.trend("LLM agent planning", [])

    assert result == {"flows": [], "gap": None}
