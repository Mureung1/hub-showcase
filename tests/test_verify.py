"""자기 검증(verify) fallback 테스트.

4-2(#29): 깨진 응답(비-JSON)을 mock했을 때 예외 없이 is_good=True가 반환되는지 검증한다.
판단 불가 시 통과 쪽(비용이 덜 드는 쪽)으로 fallback하는 설계(prompts/verify.md)의 보증이다.
verify 고유의 사실은 "fallback 값이 하필 {"is_good": True}"라는 점 — 그것만 검증한다.
(파싱 실패·예외를 흡수하는 ask_llm_json 자체의 메커니즘은 Task 0의 책임이라 여기서 다시 테스트하지 않는다.)
"""

from app import agent


def _drain(gen):
    """제너레이터를 끝까지 소진해 (yield된 이벤트 목록, return값)을 돌려준다.

    list(gen)은 yield만 모으고 return값(StopIteration.value)을 버리므로 쓸 수 없다.
    _verify_loop은 retry 이벤트를 yield하면서 최종 (summary, retried)를 return하기에
    두 가지를 모두 회수해야 한다.
    """
    events = []
    try:
        while True:
            events.append(next(gen))
    except StopIteration as stop:
        return events, stop.value


def test_verify_fallback_on_broken_response(monkeypatch):
    """LLM이 JSON이 아닌 응답을 돌려줘도 _call_verify는 예외 없이 {"is_good": True}를 반환한다."""
    # 가장 바깥 LLM 경계(tools.ask_llm)만 교체한다. ask_llm_json이 호출 순간
    # tools 네임스페이스에서 ask_llm을 조회하므로, 여기를 바꾸면 실제 Gemini
    # 호출 없이 "깨진 응답"을 재현할 수 있다.
    monkeypatch.setattr(
        "app.tools.ask_llm", lambda prompt: "이건 JSON이 아니라 그냥 설명문입니다."
    )

    summary = {"contribution": "c", "method": "m", "result": "r"}
    result = agent._call_verify("제목", "원문", summary)

    assert result == {"is_good": True}


def test_verify_loop_adopts_summary_on_good(monkeypatch):
    """is_good=True면 _verify_loop이 그 요약을 그대로 채택하고 retried=0으로 종료한다 (4-3).

    _verify_loop이 제너레이터라 retry 이벤트 없이(events == []) 즉시 종료하고,
    return값으로 (요약, 0)을 넘긴다.
    """
    # _call_verify를 통과 판정으로 고정한다 — LLM/프롬프트를 거치지 않고 루프 분기만 본다.
    monkeypatch.setattr("app.agent._call_verify", lambda title, src, summ: {"is_good": True})

    summary = {"contribution": "c", "method": "m", "result": "r"}
    events, (adopted, retried) = _drain(agent._verify_loop(1, "제목", "원문", summary))

    assert events == []  # 통과 시 retry 이벤트는 없다
    assert adopted is summary  # 요약을 가공 없이 그대로 채택
    assert retried == 0  # 통과 시 retried는 증가하지 않는다


def test_verify_loop_emits_retry_and_resummarizes_on_bad(monkeypatch):
    """is_good=False면 retry 이벤트(attempt:1)를 흘리고 feedback으로 재요약해 채택한다 (4-4)."""
    # 첫 검증은 실패(feedback 포함), 재요약 후 두 번째 검증은 통과하도록 고정한다.
    verdicts = iter([{"is_good": False, "feedback": "실험 설정 설명이 누락됨"}, {"is_good": True}])
    monkeypatch.setattr("app.agent._call_verify", lambda title, src, summ: next(verdicts))
    new_summary = {"contribution": "c2", "method": "m2", "result": "r2"}
    monkeypatch.setattr("app.agent._call_summarize", lambda title, src, fb: new_summary)

    original = {"contribution": "c", "method": "m", "result": "r"}
    events, (adopted, retried) = _drain(agent._verify_loop(1, "제목", "원문", original))

    # 완료 기준: retry 이벤트가 {stage,index,attempt:1,feedback} 형태로 실제 발생한다
    assert events == [
        {"stage": "retry", "index": 1, "attempt": 1, "feedback": "실험 설정 설명이 누락됨"}
    ]
    assert adopted == new_summary  # 재요약 결과를 채택
    assert retried == 1
