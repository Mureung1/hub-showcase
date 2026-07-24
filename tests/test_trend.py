"""트렌드 추론(trend) 테스트."""

import json

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


def test_build_trend_prompt_serializes_summaries_as_json_array():
    """summaries가 유효 JSON 배열 문자열로, 한글 이스케이프 없이 프롬프트에 들어간다 (5-3)."""
    summaries = [
        {"index": 1, "title": "T1", "contribution": "계층적 에이전트", "method": "m1", "result": "r1"},
        {"index": 2, "title": "T2", "contribution": "메모리 계획", "method": "m2", "result": "r2"},
    ]

    prompt = agent._build_trend_prompt("LLM agent planning", summaries)

    # 완료 기준: summaries_json이 올바른 JSON 배열 문자열로 포함된다
    serialized = json.dumps(summaries, ensure_ascii=False)
    assert serialized in prompt
    parsed = json.loads(serialized)
    assert isinstance(parsed, list) and len(parsed) == 2
    # 한글이 이스케이프되지 않음(ensure_ascii=False)
    assert "계층적 에이전트" in prompt
    assert "\\uac00" not in prompt.lower()
    # topic·n·summaries_json 자리표시자 모두 치환됨
    for placeholder in ("{topic}", "{n}", "{summaries_json}"):
        assert placeholder not in prompt
    # topic과 n(=2)이 실제로 반영됨
    assert "LLM agent planning" in prompt
    assert "2편" in prompt


def test_call_trend_fallback_on_broken_response(monkeypatch):
    """LLM이 JSON이 아닌 응답을 줘도 _call_trend는 예외 없이 {"flows":[],"gap":None}을 반환한다 (5-4).

    trend 고유의 사실은 "fallback 값이 하필 {"flows":[],"gap":None}"이라는 점 — 그것만 검증한다.
    (파싱 실패를 흡수하는 ask_llm_json 메커니즘 자체는 이 래퍼를 통해 간접 실행될 뿐,
    격리 단위 테스트(test_tools.py)는 아직 없다 — 그 갭을 채우는 건 Task 0 책임이다.)
    """
    monkeypatch.setattr(
        "app.tools.ask_llm", lambda prompt: "이건 JSON이 아니라 그냥 설명문입니다."
    )

    summaries = [{"index": 1, "title": "T", "contribution": "c", "method": "m", "result": "r"}]
    # 이 줄에 도달해 통과한다는 것 자체가 "예외 없이 반환됐다"를 증명한다(예외 시 pytest가 자동 실패).
    result = agent._call_trend("LLM agent planning", summaries)

    assert result == {"flows": [], "gap": None}
