"""FastAPI 앱. run_agent()의 yield를 SSE로 감싸기만 한다 — 로직은 여기 없다.

의존 방향은 한 방향이다 (CLAUDE.md): main.py → agent.py → tools.py.
따라서 이 파일은 agent를 import하지만, agent는 이 파일을 절대 모른다.
그 덕분에 웹 없이도 `python -m app.agent`로 에이전트를 완성할 수 있다.
"""

from collections.abc import Iterator

from fastapi import FastAPI, Query
from fastapi.responses import StreamingResponse

from app import config

app = FastAPI(
    title="hub",
    description="arXiv 논문을 스스로 판단해 골라 읽고 요약하는 LLM 에이전트",
)

# SSE 응답에 매번 붙는 고정 헤더. 요청마다 값이 같으므로 모듈 레벨 상수로 둔다.
#
# Cache-Control      : 중간 캐시가 스트림을 저장·재생하지 못하게 한다.
# X-Accel-Buffering  : nginx 계열 리버스 프록시의 응답 버퍼링을 끈다.
#                      이게 없으면 로컬에서는 멀쩡하고 배포한 뒤에만 실시간이 사라진다
#                      (프록시가 3분치 이벤트를 모아뒀다 한 번에 보낸다).
#                      배포 후에는 로컬에서 재현이 안 되므로 지금 넣어둔다.
# Connection         : 스트리밍 도중 연결이 끊기지 않도록 유지를 명시한다.
SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
    "Connection": "keep-alive",
}

SSE_MEDIA_TYPE = "text/event-stream"


def _placeholder_events(topic: str, limit: int) -> Iterator[str]:
    """7-1 전용 자리표시자. 7-2(#60)에서 run_agent() 연결로 통째로 교체된다.

    여기서 아직 에이전트를 돌리지 않는 이유는 기술적 제약이 아니라 디버깅 비용이다.
    7-1의 완료 기준은 응답 헤더 4종뿐인데, 에이전트까지 같이 돌면 헤더가 틀렸을 때
    실패 원인 후보가 "헤더 오타 / 직렬화 / arXiv 429 / Gemini 429"로 늘어난다.
    한 번에 한 가지만 새로 도입한다 (CLAUDE.md 개발 순서와 같은 논리).
    """
    yield f"[placeholder] topic={topic} limit={limit}\n"


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
        _placeholder_events(topic, limit),
        media_type=SSE_MEDIA_TYPE,
        headers=SSE_HEADERS,
    )
