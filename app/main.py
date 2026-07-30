"""FastAPI 앱. run_agent()의 yield를 SSE로 감싸기만 한다 — 로직은 여기 없다.

의존 방향은 한 방향이다 (CLAUDE.md): main.py → agent.py → tools.py.
따라서 이 파일은 agent를 import하지만, agent는 이 파일을 절대 모른다.
그 덕분에 웹 없이도 `python -m app.agent`로 에이전트를 완성할 수 있다.
"""

import json
import logging
from collections.abc import AsyncIterator, Iterator
from pathlib import Path

from fastapi import FastAPI, Query, Request
from fastapi.responses import Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import iterate_in_threadpool
from starlette.types import Scope

from app import agent, config

# 정적 프론트가 있는 곳. 이 파일 기준으로 찾으므로 작업 디렉토리와 무관하다.
WEB_DIR = Path(__file__).resolve().parent.parent / "web"

logger = logging.getLogger(__name__)

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

    예상하지 못한 예외는 여기서 `error` 이벤트로 바꿔 내보내고 정상 종료한다.
    그냥 끊기면 브라우저는 "아직 오는 중"과 구분하지 못해 매달리고, EventSource가
    자동 재연결하면 에이전트가 통째로 재실행되어 API 비용이 탄다.
    `except Exception`은 `GeneratorExit`(BaseException 상속)을 잡지 않으므로
    7-3의 중단 경로를 삼키지 않는다.

    **한계**: 여기서 보내는 `error`는 최후의 그물이다. `paper_done`이 이미 나간 뒤에
    발동하면 sse-contract.md의 "아무것도 못 건진 경우에만 error" 규정을 어기게 된다.
    다만 이 시점에는 유효한 `done`을 만들 재료(stats)가 없고, 아무것도 안 보내면
    브라우저가 재연결해 에이전트를 통째로 재실행한다 — 그쪽이 더 비싸다.
    근본 해결은 agent.py의 trend/done 조립부를 보호하는 것이다 (이슈 #65).
    """
    try:
        for event in agent.run_agent(topic, limit=limit):
            yield _sse_frame(event)
    except Exception as exc:
        # 스택트레이스는 서버 로그에만 남긴다 — 응답에 넣으면 내부 구조가 노출된다.
        logger.exception("스트림 도중 예상하지 못한 예외가 발생했다 (topic=%s)", topic)
        yield _sse_frame(
            {
                "stage": "error",
                "message": "예상하지 못한 오류로 중단되었습니다. 잠시 뒤 다시 시도해 주세요.",
                "code": "internal_error",
                "at": f"스트리밍 중 ({type(exc).__name__})",
            }
        )


async def _guarded_stream(request: Request, source: Iterator[str]) -> AsyncIterator[str]:
    """동기 이터러블을 워커 스레드에서 소비하되, 매 이벤트 사이에 연결 상태를 확인한다.

    **왜 Starlette에 맡기지 않는가.** StreamingResponse에 동기 이터러블을 그대로 넘겨도
    클라이언트가 끊기면 에이전트는 실제로 멈춘다(Starlette가 async 래퍼를 취소한다).
    그런데 실측해보면 **밑에 있는 동기 제너레이터는 닫히지 않고 방치된다** — GeneratorExit이
    전달되지 않아 `finally`가 실행되지 않고, 중단됐다는 흔적도 로그에 남지 않는다.
    즉 "우연히 멈추는" 상태이지 우리가 통제하는 상태가 아니다.

    여기서 직접 감싸면 세 가지를 얻는다:
    1. 중단을 로그로 관측할 수 있다 (없으면 완료 기준을 확인할 방법 자체가 없다)
    2. `finally`에서 확정적으로 `close()`를 호출한다 — 나중에 정리 코드를 걸 수 있다
    3. Starlette 내부 동작 변경에 흔들리지 않는다

    끊김을 감지해도 **진행 중인 이벤트 하나는 끝까지 간다.** `iterate_in_threadpool()`이
    `next()`를 워커 스레드에 던지는데, 실행 중인 스레드는 중간에 죽일 수 없기 때문이다.
    즉 중단은 항상 "이벤트 경계"에서 일어난다.
    """
    stream = iterate_in_threadpool(source)
    try:
        async for frame in stream:
            yield frame
            if await request.is_disconnected():
                logger.info("클라이언트 연결이 끊겨 에이전트를 중단한다.")
                break
    finally:
        # 동기 제너레이터를 확정적으로 닫는다 (GC에 맡기지 않는다).
        source.close()  # type: ignore[attr-defined]
        await stream.aclose()


@app.get("/api/brief/stream")
async def stream_brief(
    request: Request,
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

    동기 제너레이터를 `_guarded_stream()`으로 감싸 넘긴다. 감싸는 쪽에서
    next() 호출을 워커 스레드에 던지므로, 에이전트가 LLM 응답을 수십 초 기다려도
    이벤트 루프는 막히지 않는다.
    """
    return StreamingResponse(
        _guarded_stream(request, _event_stream(topic, limit)),
        media_type=SSE_MEDIA_TYPE,
        headers=SSE_HEADERS,
    )


class RevalidatedStaticFiles(StaticFiles):
    """정적 자산을 **쓸 때마다 서버에 물어보게** 만든다.

    `StaticFiles`는 `ETag`·`Last-Modified`만 붙이고 `Cache-Control`은 주지 않는다.
    그러면 브라우저가 휴리스틱 캐싱(RFC 9111 §4.2.2)으로 "마지막 수정 이후 경과
    시간의 10%쯤은 신선하다"고 스스로 정하고, 그 창 안에서는 재검증조차 하지 않는다.

    그래서 **배포해도 옛 화면이 그대로 도는 일이 실제로 일어났다** (2026-07-29):
    `DEFAULT_LIMIT`을 8로 고쳐 배포했는데 페이지는 계속 `limit=3`을 보냈고,
    서버 로그에는 재배포 이후 `/app.js` 요청이 **아예 찍히지 않았다** — 브라우저가
    묻지도 않고 캐시본을 쓴 것이다. 데모 중에 코드를 고치면 다시 겪는다.

    `no-cache`는 캐시 금지가 아니라 **"재검증한 뒤 써라"** 다. 파일이 그대로면
    `304`로 끝나므로 트래픽은 거의 늘지 않고, 바뀌었으면 즉시 새 파일을 받는다.
    """

    async def get_response(self, path: str, scope: Scope) -> Response:
        response = await super().get_response(path, scope)
        response.headers["Cache-Control"] = "no-cache"
        return response


# 정적 프론트를 같은 오리진에서 서빙한다. 이러면 EventSource가 상대 경로
# `/api/brief/stream`을 그대로 쓸 수 있어 CORS 설정이 필요 없다.
#
# **반드시 API 라우트를 정의한 뒤에 마운트한다.** 라우트는 등록 순서대로 검사되므로,
# 이 줄이 위에 있으면 `/`에 걸린 마운트가 `/api/...`까지 먼저 잡아 404를 낸다.
#
# 여기서 하는 일은 파일을 내보내는 것뿐이다. 에이전트 로직은 절대 이 파일로
# 새지 않는다 (CLAUDE.md 의존 방향: main.py → agent.py → tools.py).
app.mount("/", RevalidatedStaticFiles(directory=WEB_DIR, html=True), name="web")
