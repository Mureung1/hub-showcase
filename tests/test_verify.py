"""자기 검증(verify) fallback 테스트.

4-2(#29): 깨진 응답(비-JSON)을 mock했을 때 예외 없이 is_good=True가 반환되는지 검증한다.
판단 불가 시 통과 쪽(비용이 덜 드는 쪽)으로 fallback하는 설계(prompts/verify.md)의 보증이다.
verify 고유의 사실은 "fallback 값이 하필 {"is_good": True}"라는 점 — 그것만 검증한다.
(파싱 실패·예외를 흡수하는 ask_llm_json 자체의 메커니즘은 Task 0의 책임이라 여기서 다시 테스트하지 않는다.)
"""

from app import agent


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
    """is_good=True면 _verify_loop이 그 요약을 그대로 채택하고 retried=0으로 종료한다 (4-3)."""
    # _call_verify를 통과 판정으로 고정한다 — LLM/프롬프트를 거치지 않고 루프 분기만 본다.
    monkeypatch.setattr("app.agent._call_verify", lambda title, src, summ: {"is_good": True})

    summary = {"contribution": "c", "method": "m", "result": "r"}
    adopted, retried = agent._verify_loop("제목", "원문", summary)

    assert adopted is summary  # 요약을 가공 없이 그대로 채택
    assert retried == 0  # 통과 시 retried는 증가하지 않는다
