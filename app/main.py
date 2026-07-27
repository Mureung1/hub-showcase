"""FastAPI 앱. run_agent()의 yield를 SSE로 감싸기만 한다 — 로직은 여기 없다.

의존 방향은 한 방향이다 (CLAUDE.md): main.py → agent.py → tools.py.
따라서 이 파일은 agent를 import하지만, agent는 이 파일을 절대 모른다.
그 덕분에 웹 없이도 `python -m app.agent`로 에이전트를 완성할 수 있다.
"""

import json
from collections.abc import Iterator

from fastapi import FastAPI, Query
from fastapi.responses import StreamingResponse

from app import agent, config

app = FastAPI(
    title="hub",
    description="arXiv 논문을 스스로 판단해 골라 읽고 요약하는 LLM 에이전트",
)

# SSE 응답에 매번 붙는 고정 헤더. 요청마다 값이 같으므로 모듈 레벨 상수로 둔다.
#
# sse-contract.md의 "전송 형식"에 적힌 것만 보낸다 — 계약에 없는 헤더를 늘리지 않는다.
#
# Cache-Control      : 중간 캐시가 스트림을 저장·재생하지 못하게 한다.
# X-Accel-Buffering  : nginx 계열 리버스 프록시의 응답 버퍼링을 끈다.
#                      이게 없으면 로컬에서는 멀쩡하고 배포한 뒤에만 실시간이 사라진다
#                      (프록시가 3분치 이벤트를 모아뒀다 한 번에 보낸다).
#                      배포 후에는 로컬에서 재현이 안 되므로 지금 넣어둔다.
#
# `Connection: keep-alive`는 일부러 넣지 않는다. HTTP/1.1에서는 이미 기본값이라 효과가
# 없고, HTTP/2에서는 금지된 hop-by-hop 헤더다(RFC 9113 §8.2.2). 연결 유지는 uvicorn과
# 프록시가 관리한다.
SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
}

SSE_MEDIA_TYPE = "text/event-stream"


def _sse_frame(event: dict) -> str:
    """이벤트 dict 하나를 SSE 메시지 한 개로 직렬화한다.

    규칙 두 가지를 지킨다 (CLAUDE.md · sse-contract.md):
    - `ensure_ascii=False`: 기본값 True면 한글이 `\\uc694\\uc57d`로 나가 디버깅이 불가능해진다.
    - 끝의 빈 줄(`\\n\\n`): 하나만 빠져도 브라우저가 메시지 경계를 인식하지 못한다.
    """
    payload = json.dumps(event, ensure_ascii=False)
    return f"data: {payload}\n\n"


def _event_stream(topic: str, limit: int) -> Iterator[str]:
    """run_agent()가 yield하는 dict를 받는 즉시 SSE 프레임으로 바꿔 흘려보낸다.

    **리스트에 모았다가 마지막에 보내지 않는다.** 그러면 사용자는 3분을 기다렸다가
    한꺼번에 받게 되고, 이 서비스의 핵심인 "판단 과정이 실시간으로 보인다"가 사라진다.
    """
    for event in agent.run_agent(topic, limit=limit):
        yield _sse_frame(event)


@app.get("/api/brief/stream")
async def stream_brief(
    topic: str = Query(..., min_length=1, description="검색할 연구 주제"),
    limit: int = Query(
        config.DEFAULT_LIMIT,
        ge=1,
        le=config.MAX_LIMIT,
        description="수집할 논문 수 상한",
    ),
) -> StreamingResponse:
    """에이전트 실행 과정을 SSE로 흘려보낸다.

    **반드시 GET이다.** 브라우저의 EventSource는 POST를 지원하지 않으므로
    이 엔드포인트를 POST로 바꾸면 프론트가 붙지 않는다 (CLAUDE.md 절대 금지 항목).

    동기 제너레이터를 그대로 넘긴다. StreamingResponse가 동기 이터러블을 받으면
    내부에서 `iterate_in_threadpool()`로 감싸 next() 호출마다 워커 스레드에 던지므로,
    에이전트가 LLM 응답을 수십 초 기다려도 이벤트 루프는 막히지 않는다
    (starlette/responses.py :: StreamingResponse.__init__).
    """
    return StreamingResponse(
        _event_stream(topic, limit),
        media_type=SSE_MEDIA_TYPE,
        headers=SSE_HEADERS,
    )
