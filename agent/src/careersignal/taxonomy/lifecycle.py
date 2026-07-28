"""요구 차원과 후보의 생명주기 전이.

순서는 docs/statistics-model.md 3.3 이고, 값 집합은 docs/erd.md 7.4 의
`lifecycle_status` CHECK 와 같다. `requirement_candidates.lifecycle_status`
(docs/erd.md 7.7)도 같은 값 집합을 쓴다.

순수 함수다. 저장소와 생성 모델을 import 하지 않는다. 상태 문자열을 받아 전이가
허용되는지 가르고 경로를 돌려줄 뿐이다.

전이를 함수로 두는 이유는 `active` 이전의 차원이 통계에 들어가지 않기 때문이다
(docs/statistics-model.md 3.3). `proposed` 에서 `active` 로 바로 건너뛰면 승격
심사를 거치지 않은 차원이 집계 어휘에 들어간다. 데이터베이스의 CHECK 는 값의
집합만 강제하고 순서를 강제하지 않으므로 순서는 이 모듈이 지킨다.
"""

from __future__ import annotations

from collections import deque

PROPOSED = "proposed"
"""발견이 만든 첫 상태. 근거를 아직 세지 않았다."""

COLLECTING_EVIDENCE = "collecting_evidence"
"""심사를 받았으나 임계값을 채우지 못해 근거를 더 모으는 상태."""

UNDER_REVIEW = "under_review"
"""임계값을 채워 심사에 올라간 상태."""

APPROVED = "approved"
"""승격이 결정된 상태. 분류체계 버전 발행 전이다."""

ACTIVE = "active"
"""발행된 분류체계 버전의 어휘. 이 상태의 차원만 집계에 들어간다."""

MERGED = "merged"
"""다른 차원으로 합쳐진 상태. 별칭으로 처리된 후보가 여기서 끝난다."""

SPLIT = "split"
"""둘 이상의 차원으로 갈린 상태."""

DEPRECATED = "deprecated"
"""더 쓰지 않는 상태. 기각된 후보가 여기서 끝난다."""

LIFECYCLE_STATUSES: tuple[str, ...] = (
    PROPOSED,
    COLLECTING_EVIDENCE,
    UNDER_REVIEW,
    APPROVED,
    ACTIVE,
    MERGED,
    SPLIT,
    DEPRECATED,
)
"""docs/erd.md 7.4 의 `lifecycle_status` CHECK 와 같은 집합이다."""

PROMOTION_CHAIN: tuple[str, ...] = (
    PROPOSED,
    COLLECTING_EVIDENCE,
    UNDER_REVIEW,
    APPROVED,
    ACTIVE,
)
"""docs/statistics-model.md 3.3 의 승격 경로. 건너뛰는 전이를 두지 않는다."""

TERMINAL_STATUSES: frozenset[str] = frozenset({MERGED, SPLIT, DEPRECATED})
"""나가는 전이가 없는 상태. 이 상태의 차원은 다음 버전으로 승계하지 않는다."""

_ALLOWED: dict[str, frozenset[str]] = {
    PROPOSED: frozenset({COLLECTING_EVIDENCE}),
    COLLECTING_EVIDENCE: frozenset({UNDER_REVIEW}),
    UNDER_REVIEW: frozenset({APPROVED, MERGED, DEPRECATED}),
    APPROVED: frozenset({ACTIVE}),
    ACTIVE: frozenset({MERGED, SPLIT, DEPRECATED}),
    MERGED: frozenset(),
    SPLIT: frozenset(),
    DEPRECATED: frozenset(),
}
"""상태마다 허용하는 다음 상태.

`under_review` 에서 `merged` 와 `deprecated` 로 나가는 두 전이는 후보의 종료
경로다. 승격 심사의 판정 넷 가운데 `merge` 는 후보를 기존 차원의 별칭으로 접고
`reject` 는 후보를 버리므로, 두 판정을 받은 후보는 차원이 되지 않는다. 심사를
받은 자리에서 끝내지 않으면 후보가 `proposed` 에 남아 다음 실행이 같은 판정을
반복한다.
"""


def is_terminal(status: str) -> bool:
    """나가는 전이가 없는 상태인가."""
    return status in TERMINAL_STATUSES


def can_transition(current: str, target: str) -> bool:
    """한 걸음 전이가 허용되는가. 등록되지 않은 상태는 거부한다."""
    return target in _ALLOWED.get(current, frozenset())


def require_transition(current: str, target: str) -> None:
    """허용되지 않는 전이를 예외로 막는다."""
    if current not in _ALLOWED:
        raise ValueError(f"생명주기 상태가 아니다: {current!r}")
    if not can_transition(current, target):
        raise ValueError(f"{current} 에서 {target} 으로 전이할 수 없다")


def path_to(current: str, target: str) -> tuple[str, ...]:
    """현재 상태에서 목표 상태까지 밟는 상태의 차례.

    같은 상태면 빈 값이고, 닿을 수 없으면 예외다. 걸음 수가 가장 적은 경로를
    돌려주며 허용 전이만 지난다.

    저장은 마지막 상태 하나만 한다. 중간 상태를 한 실행에서 차례로 쓰면 같은 행에
    의미 없는 갱신이 쌓이고, 각 상태에 머문 시간이 기록으로 남지도 않는다. 이
    함수는 목표 상태가 순서를 건너뛰지 않고 닿는 자리인지 확인하는 데 쓴다.
    """
    if current not in _ALLOWED:
        raise ValueError(f"생명주기 상태가 아니다: {current!r}")
    if target not in _ALLOWED:
        raise ValueError(f"생명주기 상태가 아니다: {target!r}")
    if current == target:
        return ()

    queue: deque[tuple[str, tuple[str, ...]]] = deque([(current, ())])
    seen = {current}
    while queue:
        status, walked = queue.popleft()
        for following in sorted(_ALLOWED[status]):
            if following in seen:
                continue
            route = (*walked, following)
            if following == target:
                return route
            seen.add(following)
            queue.append((following, route))
    raise ValueError(f"{current} 에서 {target} 으로 전이할 수 없다")


def reachable(current: str, target: str) -> bool:
    """목표 상태까지 허용 전이만으로 닿는가."""
    try:
        path_to(current, target)
    except ValueError:
        return False
    return True


__all__ = [
    "ACTIVE",
    "APPROVED",
    "COLLECTING_EVIDENCE",
    "DEPRECATED",
    "LIFECYCLE_STATUSES",
    "MERGED",
    "PROMOTION_CHAIN",
    "PROPOSED",
    "SPLIT",
    "TERMINAL_STATUSES",
    "UNDER_REVIEW",
    "can_transition",
    "is_terminal",
    "path_to",
    "reachable",
    "require_transition",
]
