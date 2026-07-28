"""외부 제공자 호출을 동시에 보내는 실행 도구.

Stage D 의 Phase 8·9·11 은 항목 하나마다 생성 모델을 한 번 부른다. 실데이터
실행에서 그 호출이 2,349 회였고, 하나씩 순서대로 보내면 왕복 지연이 그대로
쌓인다. 호출은 대부분 네트워크를 기다리는 시간이므로 여러 개를 겹쳐 보내면
겹친 만큼 총 시간이 줄어든다.

자리를 `providers/` 에 둔다. 이것은 외부 제공자를 부르는 방식에 관한 것이고,
`domain/` 과 `contracts/` 는 순수해야 한다(docs/architecture.md 2.2).

이 모듈은 저장소도 모델 제공자도 import 하지 않는다. 함수 하나와 목록 하나만
받으므로 대역 함수로 모든 갈래를 검사할 수 있다.

스레드를 쓴다. 호출이 I/O 대기라 GIL 이 풀린 채로 겹치므로 스레드로 충분하고,
기존 실행 경로가 전부 동기 함수라 async 로 바꾸면 저장소까지 파급된다.

**저장은 이 모듈이 하지 않는다.** `repositories/base.py` 의 `Unit` 은 psycopg
연결 하나를 감싸며 스레드 안전하지 않다. 부르는 쪽은 모델 호출만 여기에 맡기고,
저장은 돌아온 결과를 주 갈래에서 입력 순서대로 수행한다.
"""

from __future__ import annotations

import os
from collections import deque
from collections.abc import Callable, Iterable, Sequence
from concurrent.futures import Future, ThreadPoolExecutor
from dataclasses import dataclass
from typing import Any, Generic, TypeVar

DEFAULT_WORKERS = 4
"""동시에 보낼 모델 요청 수의 기본값.

보수적으로 잡는다. OpenAI 의 분당 요청 수(RPM)와 분당 토큰 수(TPM) 한도는 계정
등급마다 다르고, 가장 낮은 등급은 이 한도가 낮아 동시 실행을 크게 올리면 실행
중간에 `RateLimitError` 가 쏟아진다. 그 오류는 되살릴 수 있는 실패로 분류되어
실행을 멈추지는 않지만, 그만큼의 표현이 결과에서 빠진다.

4 는 한 등급 낮춰 잡아도 한도를 건드리지 않으면서 직렬 실행 대비 네 배 가까운
속도를 주는 값이다. 계정 등급이 높으면 `CAREERSIGNAL_MODEL_WORKERS` 환경변수로
올린다. 값을 올리기 전에 `--limit` 을 걸어 짧게 돌려 보고 `RateLimitError` 가
나오지 않는지 확인한다.

1 을 주면 스레드를 만들지 않은 것과 같은 순서로 하나씩 부른다. 결과는 어떤
값에서도 같다.
"""

WORKERS_ENV = "CAREERSIGNAL_MODEL_WORKERS"
"""동시 실행 수를 올리는 환경변수 이름.

`.env.example` 은 다른 갈래가 소유하므로 이 이름은 여기에만 적는다.
"""

Item = TypeVar("Item")
Value = TypeVar("Value")


def default_workers() -> int:
    """환경변수가 있으면 그 값, 없으면 `DEFAULT_WORKERS`.

    읽을 수 없는 값과 1 미만은 기본값으로 되돌린다. 오타 하나로 실행이 죽는 것보다
    보수적인 값으로 도는 편이 낫다.
    """
    raw = os.getenv(WORKERS_ENV)
    if raw is None:
        return DEFAULT_WORKERS
    try:
        value = int(raw.strip())
    except ValueError:
        return DEFAULT_WORKERS
    return value if value >= 1 else DEFAULT_WORKERS


@dataclass(frozen=True, slots=True)
class Completed(Generic[Item, Value]):
    """항목 하나의 호출 결과. 성공과 실패를 같은 자리에 담는다."""

    item: Item
    value: Value | None
    error: BaseException | None

    @property
    def failed(self) -> bool:
        return self.error is not None


def map_ordered(
    work: Callable[[Item], Value],
    items: Iterable[Item],
    workers: int = DEFAULT_WORKERS,
    stop_when: Callable[[BaseException], bool] | None = None,
) -> tuple[Completed[Item, Value], ...]:
    """항목마다 `work(item)` 을 동시에 부르고 **입력 순서대로** 돌려준다.

    도착 순서를 쓰지 않는다. `as_completed` 로 먼저 온 것부터 처리하면 같은 입력이
    실행마다 다른 순서로 저장되고, `mention_identifier`·`candidate_identifier` 와
    근거 목록의 결정성이 깨진다. 여기서는 제출도 입력 순서고 결과를 거두는 것도
    입력 순서다.

    `stop_when(exc)` 이 참인 예외를 만나면 **아직 제출하지 않은 항목을 더 보내지
    않는다.** 이미 날아간 요청은 취소하지 않고 결과를 받아 담는다. 요청은 이미
    보내졌으니 비용이 나갔고, 버리면 그만큼의 표현이 다음 실행에서 다시 불린다.

    돌려주는 목록은 **입력의 앞부분(prefix)** 이다. 제출이 입력 순서라서 시도한
    항목은 언제나 앞에서부터 이어진다. 그래서 부르는 쪽은 시도하지 않은 항목을
    `items[len(results):]` 로 얻는다. 시도하지 않은 항목마다 빈 줄을 담지 않는
    이유는, 실패한 실행에서 그 줄 수백 개가 결과를 덮기 때문이다.

    예산은 여기서 세지 않는다. 부르는 쪽이 `items` 를 미리 잘라 보낸다. 예산은
    실행 봉투의 값이고 이 모듈은 봉투를 모른다.

    `workers` 가 1 이면 앞 항목을 끝내고 다음을 제출하므로 하나씩 부른 것과 결과가
    같다.
    """
    if workers < 1:
        raise ValueError("workers 는 1 이상이다")

    queue: Sequence[Item] = list(items)
    if not queue:
        return ()

    results: list[Completed[Item, Value]] = []
    inflight: deque[tuple[Item, Future[Value]]] = deque()
    cursor = 0
    stopped = False

    with ThreadPoolExecutor(max_workers=workers) as pool:
        while cursor < len(queue) and len(inflight) < workers:
            inflight.append((queue[cursor], pool.submit(work, queue[cursor])))
            cursor += 1

        while inflight:
            item, future = inflight.popleft()
            try:
                value = future.result()
            except BaseException as exc:  # noqa: BLE001 - 예외를 결과로 옮긴다
                results.append(Completed(item=item, value=None, error=exc))
                if stop_when is not None and stop_when(exc):
                    stopped = True
            else:
                results.append(Completed(item=item, value=value, error=None))

            # 한 자리가 비면 한 항목을 더 보낸다. 동시 실행 수가 유지된다.
            if not stopped and cursor < len(queue):
                inflight.append((queue[cursor], pool.submit(work, queue[cursor])))
                cursor += 1

    return tuple(results)


def untried(items: Sequence[Any], results: Sequence[Completed[Any, Any]]) -> int:
    """`map_ordered` 가 시도하지 않고 남긴 항목 수.

    결과가 입력의 앞부분이라는 계약을 한 자리에 적어 둔다. 부르는 쪽이 뺄셈을
    직접 하면 그 계약이 여러 자리로 흩어진다.
    """
    return max(len(items) - len(results), 0)


__all__ = [
    "DEFAULT_WORKERS",
    "WORKERS_ENV",
    "Completed",
    "default_workers",
    "map_ordered",
    "untried",
]
