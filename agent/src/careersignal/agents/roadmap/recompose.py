"""체크 상태를 반영한 로드맵 재조합.

정의는 docs/architecture.md 9.1, docs/backlog.md 22-2, docs/agent-design.md 7.6 이다.

화면의 네 결과 가운데 **로드맵만** 체크 변경에 재조합으로 반응한다. 체크리스트는
내용을 유지한 채 보유 상태만 바뀌고, 포트폴리오·자소서·면접 전략은 변하지 않는다.
이미 가진 것을 채우는 단계를 앞에 두면 남은 기간을 이미 끝난 일에 쓰게 되므로,
로드맵만 순서를 다시 짠다.

**순수 함수다.** 저장된 payload 와 체크 맵을 받아 새 payload 를 돌려준다. 저장소도
모델도 부르지 않고 입력을 고치지도 않는다. 그래서 Express 조합기와 FastAPI 가 같은
규칙을 쓰고, 같은 입력에 같은 결과가 나온다는 것을 데이터베이스 없이 검사할 수 있다.

체크 맵의 키는 `checklist_concepts.concept_id` 다. payload 의 `fills[].item_id` 와
`check_rows[].item_id` 가 같은 값을 담으므로 세 곳이 하나의 키로 이어진다.

재조합은 **버리지 않는다.** 이미 채운 단계도 뒤로 밀 뿐 목록에 남긴다. 사라지면
사용자가 체크를 되돌렸을 때 무엇이 있었는지 알 수 없고, 저장된 로드맵과 화면의
단계 수가 달라진다.
"""

from __future__ import annotations

import re
from collections.abc import Mapping, Sequence
from typing import Any

HELD_LABEL = "보유"
"""이미 채운 개념의 `check_rows[].source_step`."""

LOWER_PRIORITY: dict[str, str] = {
    "vhigh": "high",
    "high": "mid",
    "mid": "mid",
    "track": "track",
}
"""이미 채운 단계의 우선순위를 한 칸 내린다.

0 으로 만들지 않는다. 체크는 사용자의 자기 보고이고 되돌릴 수 있으므로, 순위를
지우면 되돌렸을 때 원래 값을 복원할 근거가 payload 에 없다. 한 칸만 내려 뒤로
밀렸다는 사실을 표시한다. `track` 은 순위가 아니라 갈래이므로 내리지 않는다.
"""

_STEP_NUMBER = re.compile(r"(STEP\s*)(\d+)")
"""`STEP 01 · 3주`, `STEP 01와 병행`, `STEP 01` 에서 번호만 집는다.

단계 번호는 `project_steps[].phase` 와 `study_tracks[].phase` 와
`check_rows[].source_step` 세 곳에 글자로 들어간다. 순서를 바꾸면 세 곳이 함께
움직여야 하므로 번호만 갈아 끼운다. 나머지 글자(기간, `와 병행`)는 건드리지 않는다.
"""

__all__ = [
    "HELD_LABEL",
    "LOWER_PRIORITY",
    "held_concepts",
    "recompose",
]


def held_concepts(checks: Mapping[str, bool]) -> frozenset[str]:
    """보유로 표시된 개념 식별자.

    값이 거짓인 키는 보유가 아니다. 브라우저가 체크를 껐다 켠 흔적으로 거짓을 함께
    보내므로, 키가 있다는 것만으로 보유로 읽으면 끈 체크가 되살아난다.
    """
    return frozenset(key for key, value in checks.items() if value)


def _fill_ids(entry: Mapping[str, Any]) -> tuple[str, ...]:
    fills = entry.get("fills") or ()
    return tuple(
        str(fill.get("item_id"))
        for fill in fills
        if isinstance(fill, Mapping) and fill.get("item_id")
    )


def _is_held(entry: Mapping[str, Any], held: frozenset[str]) -> bool:
    """이 단계가 채우는 것을 이미 다 가졌는가.

    채우는 것이 하나도 없는 단계는 보유로 보지 않는다. 코딩테스트 트랙처럼 체크리스트
    항목을 갖지 않는 자리가 있고, 그것을 보유로 읽으면 체크와 무관하게 늘 뒤로 밀린다.
    """
    ids = _fill_ids(entry)
    return bool(ids) and all(item_id in held for item_id in ids)


def _reordered(
    entries: Sequence[Mapping[str, Any]], held: frozenset[str]
) -> tuple[tuple[int, ...], tuple[bool, ...]]:
    """미보유를 앞, 보유를 뒤로 보낸 **자리 번호**를 돌려준다.

    항목 자체가 아니라 자리 번호를 돌려주는 이유는 옛 번호와 새 번호를 잇는 표가
    필요하기 때문이다. 항목만 있으면 같은 내용의 단계가 둘일 때 어느 것이 몇 번이던
    것인지 되찾을 수 없다.

    안정 정렬이라 선수 관계가 정한 순서가 무리 안에서 유지된다. 보유 단계끼리도
    원래 순서를 지키므로 체크를 되돌리면 원래 배열로 돌아온다.
    """
    flags = [_is_held(entry, held) for entry in entries]
    order = sorted(range(len(entries)), key=lambda index: (flags[index], index))
    return tuple(order), tuple(flags[index] for index in order)


def _renumber(text: str, mapping: Mapping[int, int]) -> str:
    """글자 안의 단계 번호를 새 번호로 바꾼다. 모르는 번호는 그대로 둔다."""

    def replace(match: re.Match[str]) -> str:
        old = int(match.group(2))
        new = mapping.get(old)
        return match.group(0) if new is None else f"{match.group(1)}{new:02d}"

    return _STEP_NUMBER.sub(replace, text)


def recompose(payload: Mapping[str, Any], checks: Mapping[str, bool]) -> dict[str, Any]:
    """체크 상태를 반영해 저장된 로드맵의 순서와 우선순위를 다시 짠다.

    - 채우는 개념을 이미 다 가진 단계는 뒤로 밀고 우선순위를 한 칸 내린다.
    - 남은 단계의 번호를 1 부터 다시 매기고 `phase` 의 번호를 함께 고친다.
    - 보유한 개념의 `check_rows[].source_step` 을 `보유` 로 바꾸고, 나머지는 새 단계
      번호를 가리키게 고친다.

    입력 payload 를 바꾸지 않는다. 돌려주는 것은 새 사전이다.
    """
    held = held_concepts(checks)

    steps: Sequence[Mapping[str, Any]] = payload.get("project_steps") or ()
    tracks: Sequence[Mapping[str, Any]] = payload.get("study_tracks") or ()
    rows: Sequence[Mapping[str, Any]] = payload.get("check_rows") or ()

    step_order, step_held = _reordered(steps, held)
    # 옛 번호 → 새 번호. `n` 이 없으면 저장된 배열 자리를 번호로 본다.
    mapping = {
        int(steps[old].get("n", old + 1)): position + 1
        for position, old in enumerate(step_order)
    }

    new_steps: list[dict[str, Any]] = []
    for position, (old, was_held) in enumerate(zip(step_order, step_held), 1):
        step = steps[old]
        entry = dict(step)
        entry["n"] = position
        entry["phase"] = _renumber(str(step.get("phase", "")), mapping)
        if was_held:
            entry["priority"] = LOWER_PRIORITY.get(
                str(step.get("priority", "")), str(step.get("priority", ""))
            )
        new_steps.append(entry)

    track_order, track_held = _reordered(tracks, held)
    new_tracks: list[dict[str, Any]] = []
    for old, was_held in zip(track_order, track_held):
        track = tracks[old]
        entry = dict(track)
        entry["phase"] = _renumber(str(track.get("phase", "")), mapping)
        if was_held:
            entry["priority"] = LOWER_PRIORITY.get(
                str(track.get("priority", "")), str(track.get("priority", ""))
            )
        new_tracks.append(entry)

    new_rows: list[dict[str, Any]] = []
    for row in rows:
        entry = dict(row)
        if str(row.get("item_id")) in held:
            entry["source_step"] = HELD_LABEL
        else:
            entry["source_step"] = _renumber(str(row.get("source_step", "")), mapping)
        new_rows.append(entry)

    recomposed = dict(payload)
    recomposed["project_steps"] = new_steps
    recomposed["study_tracks"] = new_tracks
    recomposed["check_rows"] = new_rows
    return recomposed
