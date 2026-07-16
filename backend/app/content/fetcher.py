"""feed HTTP GET 페치 계약. content_pipeline.md 5장.

httpx로 timeout, redirect host 검사, 응답 크기 제한, 재시도를 직접 통제한다.
받은 bytes만 parser에 넘겨 feedparser가 자체 fetch로 이 통제를 우회하지 않게 한다.
"""

from __future__ import annotations

import time
from urllib.parse import urlsplit

import httpx

from app.content.models import FeedError, PipelineError

USER_AGENT = "KkaemContentBot/0.1 (+https://github.com/kkaem)"
CONNECT_TIMEOUT_SECONDS = 5.0
READ_TIMEOUT_SECONDS = 15.0
MAX_REDIRECTS = 3
MAX_RESPONSE_BYTES = 5 * 1024 * 1024  # 5 MiB
RETRY_BACKOFF_SECONDS = (1.0, 3.0)  # 최대 2회 재시도
RETRYABLE_STATUS = {429, 500, 502, 503, 504}
ALLOWED_SCHEMES = {"http", "https"}


def fetch_feed(feed_url: str, *, sleep=time.sleep) -> "FetchResult":
    """feed_url을 GET해 응답 bytes를 돌려준다.

    실패는 모두 PipelineError(FeedError...)로 변환한다. sleep은 테스트 주입용이다.
    """
    from app.content.models import FetchResult

    scheme = urlsplit(feed_url).scheme.lower()
    if scheme not in ALLOWED_SCHEMES:
        raise PipelineError(FeedError.FETCH_HTTP_ERROR, f"unsupported scheme: {scheme}")

    origin_host = urlsplit(feed_url).hostname
    timeout = httpx.Timeout(connect=CONNECT_TIMEOUT_SECONDS, read=READ_TIMEOUT_SECONDS, write=READ_TIMEOUT_SECONDS, pool=CONNECT_TIMEOUT_SECONDS)
    headers = {"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml"}

    last_error: PipelineError | None = None
    # 최초 시도 + 재시도 최대 2회
    for attempt in range(len(RETRY_BACKOFF_SECONDS) + 1):
        try:
            with httpx.Client(
                timeout=timeout,
                follow_redirects=True,
                max_redirects=MAX_REDIRECTS,
                headers=headers,
            ) as client:
                response = client.get(feed_url)

            final_host = urlsplit(str(response.url)).hostname
            if final_host != origin_host:
                # host가 바뀐 redirect는 재시도하지 않는다.
                raise PipelineError(
                    FeedError.REDIRECT_HOST_CHANGED,
                    f"{origin_host} -> {final_host}",
                )

            if response.status_code in RETRYABLE_STATUS:
                last_error = PipelineError(FeedError.FETCH_HTTP_ERROR, f"status {response.status_code}")
                if attempt < len(RETRY_BACKOFF_SECONDS):
                    sleep(RETRY_BACKOFF_SECONDS[attempt])
                    continue
                raise last_error

            if response.status_code >= 400:
                # 그 외 4xx는 재시도하지 않는다.
                raise PipelineError(FeedError.FETCH_HTTP_ERROR, f"status {response.status_code}")

            content = response.content
            if len(content) > MAX_RESPONSE_BYTES:
                raise PipelineError(FeedError.FETCH_TOO_LARGE, f"{len(content)} bytes")

            return FetchResult(final_url=str(response.url), content=content)

        except httpx.TimeoutException as exc:
            last_error = PipelineError(FeedError.FETCH_TIMEOUT, str(exc))
        except httpx.TransportError as exc:
            last_error = PipelineError(FeedError.FETCH_HTTP_ERROR, str(exc))

        if attempt < len(RETRY_BACKOFF_SECONDS):
            sleep(RETRY_BACKOFF_SECONDS[attempt])

    raise last_error if last_error is not None else PipelineError(FeedError.FETCH_HTTP_ERROR)
