"""SSE 스트리밍(app/main.py) 테스트.

에이전트 로직은 건드리지 않는다 — 여기서 검증하는 것은 "yield를 SSE로 감싸는 껍데기"뿐이다.
"""

import json

import anyio

from app import main


class _FakeRequest:
    """`is_disconnected()`만 흉내내는 요청 대역.

    `_guarded_stream()`이 Request에서 쓰는 것이 이 메서드 하나뿐이라 전체를 만들 필요가 없다.
    """

    def __init__(self, disconnect_after: int | None = None) -> None:
        self._calls = 0
        self._disconnect_after = disconnect_after

    async def is_disconnected(self) -> bool:
        self._calls += 1
        if self._disconnect_after is None:
            return False
        return self._calls >= self._disconnect_after


def _tracked_source(marks: list[str], count: int = 5):
    """소비 흔적을 남기는 동기 제너레이터. 닫혔는지·완주했는지를 marks로 알린다."""
    try:
        for i in range(1, count + 1):
            yield f'data: {{"tick": {i}}}\n\n'
        marks.append("completed")
    finally:
        marks.append("closed")


def _drain(request: _FakeRequest, source) -> list[str]:
    """_guarded_stream()을 끝까지 소비해 프레임 목록을 돌려준다."""
    frames: list[str] = []

    async def _run() -> None:
        async for frame in main._guarded_stream(request, source):
            frames.append(frame)

    anyio.run(_run)
    return frames


def test_sse_frame_has_data_prefix_and_blank_line():
    """SSE 메시지는 `data: ` 접두 + JSON 1줄 + 빈 줄로 끝난다 (7-2).

    끝의 빈 줄이 하나라도 빠지면 브라우저가 메시지 경계를 인식하지 못한다.
    """
    frame = main._sse_frame({"stage": "found", "count": 12})

    assert frame.startswith("data: ")
    assert frame.endswith("\n\n")
    assert frame.count("\n") == 2
    assert json.loads(frame[len("data: ") :]) == {"stage": "found", "count": 12}


def test_sse_frame_keeps_hangul_unescaped():
    """한글이 `\\uXXXX`로 이스케이프되지 않는다 (7-2).

    이스케이프되면 curl 출력을 사람이 읽을 수 없어 디버깅이 불가능해진다.
    """
    frame = main._sse_frame({"stage": "retry", "feedback": "실험 설정 설명이 누락됨"})

    assert "실험 설정 설명이 누락됨" in frame
    assert "\\u" not in frame


def test_guarded_stream_completes_and_closes_source():
    """정상 완주 시 모든 프레임이 나가고 소스가 닫힌다 (7-3)."""
    marks: list[str] = []
    frames = _drain(_FakeRequest(), _tracked_source(marks, count=5))

    assert len(frames) == 5
    assert marks == ["completed", "closed"]


def test_guarded_stream_stops_when_client_disconnects():
    """연결이 끊기면 남은 이벤트를 만들지 않고 중단한다 (7-3).

    끊긴 뒤에도 계속 돌면 아무도 보지 않는 결과를 만드느라 무료 티어 LLM 한도가 탄다.
    """
    marks: list[str] = []
    # 2번째 확인(=2번째 이벤트 직후)에서 끊긴 것으로 응답한다.
    frames = _drain(_FakeRequest(disconnect_after=2), _tracked_source(marks, count=5))

    assert len(frames) == 2, "끊긴 뒤에도 이벤트를 계속 만들었다"
    assert "completed" not in marks, "중단됐는데 소스가 끝까지 돌았다"


def test_event_stream_ends_with_error_event_on_exception(monkeypatch):
    """스트림 도중 예외가 나면 error 이벤트로 종결한다 (7-4).

    그냥 끊기면 브라우저는 "아직 오는 중"과 구분하지 못해 매달리고,
    EventSource가 자동 재연결하면 에이전트가 통째로 재실행되어 API 비용이 탄다.
    """

    def _blows_up(topic, limit=None):
        yield {"stage": "search", "topic": topic}
        raise RuntimeError("의도적 실패")

    monkeypatch.setattr(main.agent, "run_agent", _blows_up)

    frames = list(main._event_stream("LLM agent planning", limit=3))

    assert len(frames) == 2, "search 뒤에 종결 이벤트가 나오지 않았다"
    last = json.loads(frames[-1][len("data: ") :])
    assert last["stage"] == "error"
    assert last["code"] == "internal_error"
    assert "RuntimeError" in last["at"]
    assert set(last) == {"stage", "message", "code", "at"}, "계약에 없는 필드가 섞였다"


def test_event_stream_does_not_swallow_generator_exit(monkeypatch):
    """GeneratorExit은 error로 바꾸지 않는다 (7-4).

    잡아서 삼키면 7-3의 중단 경로가 죽는다 — 끊긴 뒤에도 스트림이 살아남는다.
    """

    def _endless(topic, limit=None):
        while True:
            yield {"stage": "search", "topic": topic}

    monkeypatch.setattr(main.agent, "run_agent", _endless)

    stream = main._event_stream("LLM agent planning", limit=3)
    next(stream)
    stream.close()  # GeneratorExit을 던진다

    # close()가 조용히 끝나면 성공. error 이벤트를 yield하려 했다면
    # "generator ignored GeneratorExit" RuntimeError가 났을 것이다.


def test_guarded_stream_closes_source_on_disconnect():
    """중단 시에도 소스를 확정적으로 닫는다 — GC에 맡기지 않는다 (7-3).

    Starlette에 그냥 맡기면 동기 제너레이터가 닫히지 않고 방치되어 finally가 실행되지
    않는다(실측 확인). 정리 코드를 걸 수 있으려면 여기서 직접 close()해야 한다.
    """
    marks: list[str] = []
    _drain(_FakeRequest(disconnect_after=2), _tracked_source(marks, count=5))

    assert "closed" in marks, "중단 후 소스가 닫히지 않았다 (finally가 실행되지 않음)"
