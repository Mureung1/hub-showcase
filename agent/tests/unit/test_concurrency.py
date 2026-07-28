"""모델 호출을 겹쳐 보내는 실행 도구 검증.

`providers/concurrency.py` 는 저장소도 모델도 모른다. 가짜 함수만으로 모든 갈래를
검사한다.

이 도구가 지켜야 하는 것은 셋이다. 결과가 입력 순서대로 나온다, 되살릴 수 없는
실패를 만나면 남은 일을 보내지 않는다, 동시 실행 수가 1 이어도 결과가 같다.
"""

from __future__ import annotations

import os
import threading
import time

import pytest

from careersignal.providers.concurrency import (
    DEFAULT_WORKERS,
    WORKERS_ENV,
    default_workers,
    map_ordered,
    untried,
)


class Recorder:
    """호출을 기록하는 가짜 작업.

    `delay` 로 도착 순서를 뒤집는다. 먼저 보낸 일이 더 오래 기다리므로, 도착 순서로
    결과를 쓰는 구현이면 순서가 어긋난다.
    """

    def __init__(self, delay: float = 0.0, fail_on: set[int] | None = None) -> None:
        self._delay = delay
        self._fail_on = fail_on or set()
        self._lock = threading.Lock()
        self.started: list[int] = []
        self.finished: list[int] = []
        self.threads: set[str] = set()
        self.inflight = 0
        self.peak = 0

    def __call__(self, item: int) -> str:
        with self._lock:
            self.started.append(item)
            self.threads.add(threading.current_thread().name)
            self.inflight += 1
            self.peak = max(self.peak, self.inflight)

        if self._delay:
            # 앞 항목일수록 오래 기다린다. 도착 순서가 입력 순서와 뒤집힌다.
            time.sleep(self._delay / (item + 1))

        with self._lock:
            self.inflight -= 1
            self.finished.append(item)

        if item in self._fail_on:
            raise RuntimeError(f"{item} 실패")
        return f"값 {item}"


def _quota_error(item: int) -> Exception:
    return type("AuthenticationError", (Exception,), {})("자격 증명이 틀렸다")


def _unrecoverable(exc: BaseException) -> bool:
    return type(exc).__name__ == "AuthenticationError"


# ============================================================ 순서
def test_the_results_follow_the_input_order() -> None:
    """도착 순서가 뒤섞여도 결과는 입력 순서다."""
    work = Recorder(delay=0.05)

    results = map_ordered(work, list(range(8)), workers=8)

    assert [record.item for record in results] == list(range(8))
    assert [record.value for record in results] == [f"값 {i}" for i in range(8)]
    # 도착 순서가 입력 순서와 달랐음을 확인한다. 같았다면 이 검사가 아무것도 못 본다.
    assert work.finished != list(range(8))


def test_one_worker_gives_the_same_results() -> None:
    """동시 실행 수가 1 이어도 같은 결과가 나온다."""
    many = map_ordered(Recorder(delay=0.02), list(range(10)), workers=6)
    one = map_ordered(Recorder(delay=0.02), list(range(10)), workers=1)

    assert [r.item for r in many] == [r.item for r in one]
    assert [r.value for r in many] == [r.value for r in one]


def test_a_failure_keeps_its_place_in_the_order() -> None:
    """실패한 항목도 제자리에 담긴다. 성공과 같은 목록이다."""
    work = Recorder(delay=0.02, fail_on={2, 5})

    results = map_ordered(work, list(range(7)), workers=7)

    assert [record.item for record in results] == list(range(7))
    assert [record.failed for record in results] == [
        False,
        False,
        True,
        False,
        False,
        True,
        False,
    ]
    assert results[2].value is None
    assert isinstance(results[2].error, RuntimeError)


def test_the_work_really_overlaps() -> None:
    """겹쳐 보낸다. 하나씩 부르면 이 검사가 실패한다."""
    work = Recorder(delay=0.05)

    map_ordered(work, list(range(6)), workers=6)

    assert work.peak > 1
    assert len(work.threads) > 1


def test_one_worker_does_not_overlap() -> None:
    """1 이면 겹치지 않는다. 하나씩 부른 것과 같다."""
    work = Recorder(delay=0.02)

    map_ordered(work, list(range(5)), workers=1)

    assert work.peak == 1
    assert work.started == list(range(5))


# ============================================================ 멈춤
def test_an_unrecoverable_failure_stops_the_remaining_work() -> None:
    """되살릴 수 없는 실패를 만나면 남은 일을 보내지 않는다."""

    def work(item: int) -> str:
        if item == 1:
            raise _quota_error(item)
        return f"값 {item}"

    items = list(range(50))
    results = map_ordered(work, items, workers=2, stop_when=_unrecoverable)

    assert len(results) < len(items)
    assert untried(items, results) > 0
    assert results[1].failed
    # 결과는 입력의 앞부분이다. 부르는 쪽이 남은 항목을 뒤에서 잘라 쓴다.
    assert [record.item for record in results] == items[: len(results)]


def test_the_stop_does_not_throw_away_the_requests_already_sent() -> None:
    """이미 날아간 요청의 결과는 받아서 담는다.

    요청은 이미 나갔으니 비용이 들었고, 버리면 그 항목을 다음 실행이 다시 부른다.
    """

    def work(item: int) -> str:
        if item == 1:
            raise _quota_error(item)
        return f"값 {item}"

    results = map_ordered(work, list(range(10)), workers=3, stop_when=_unrecoverable)

    assert results[0].value == "값 0"
    assert results[2].value == "값 2"
    # 0~2 는 처음에 함께 보냈고 3 은 0 이 끝나 빈 자리를 채운 것이다. 4 를 거둘 때
    # 이미 멈춤이 정해져 더 보내지 않았다.
    assert len(results) == 4
    assert results[3].value == "값 3"


def test_a_recoverable_failure_does_not_stop_the_run() -> None:
    """멈출 사유가 아닌 실패는 그 항목만 실패로 세고 끝까지 돈다."""
    items = list(range(6))

    results = map_ordered(
        Recorder(fail_on={0, 3}), items, workers=3, stop_when=_unrecoverable
    )

    assert len(results) == len(items)
    assert untried(items, results) == 0
    assert sum(record.failed for record in results) == 2


def test_without_a_predicate_nothing_stops() -> None:
    """판정을 주지 않으면 실패해도 끝까지 돈다."""
    items = list(range(6))

    results = map_ordered(Recorder(fail_on={1}), items, workers=3)

    assert len(results) == len(items)


# ============================================================ 예산
def test_the_caller_trims_the_items_to_the_budget() -> None:
    """예산은 부르는 쪽이 미리 자른다. 자른 만큼만 부른다."""
    work = Recorder()
    budget = 4

    map_ordered(work, list(range(20))[:budget], workers=8)

    assert len(work.started) == budget
    assert work.started == [0, 1, 2, 3]


def test_no_work_is_sent_for_an_empty_list() -> None:
    work = Recorder()

    assert map_ordered(work, [], workers=4) == ()
    assert work.started == []


def test_a_worker_count_below_one_is_refused() -> None:
    """0 이나 음수는 무한정 보내는 것과 구분되지 않는다. 받지 않는다."""
    with pytest.raises(ValueError):
        map_ordered(Recorder(), [1, 2], workers=0)


# ============================================================ 기본값
def test_the_default_is_conservative() -> None:
    """등급이 낮은 계정에서도 한도를 건드리지 않을 값이다."""
    assert 1 <= DEFAULT_WORKERS <= 8


def test_the_environment_variable_raises_the_default(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv(WORKERS_ENV, "12")

    assert default_workers() == 12


@pytest.mark.parametrize("value", ["", "여섯", "0", "-3"])
def test_an_unreadable_value_falls_back_to_the_default(
    monkeypatch: pytest.MonkeyPatch, value: str
) -> None:
    """오타 하나로 실행이 죽지 않는다. 보수적인 값으로 돈다."""
    monkeypatch.setenv(WORKERS_ENV, value)

    assert default_workers() == DEFAULT_WORKERS


def test_the_default_applies_without_the_environment_variable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv(WORKERS_ENV, raising=False)

    assert default_workers() == DEFAULT_WORKERS
    assert WORKERS_ENV not in os.environ


# ============================================================ 순수성
def test_the_module_knows_no_repository_or_provider() -> None:
    """저장소와 모델 제공자를 모른다. 함수와 목록만 받는다."""
    from pathlib import Path

    from careersignal.providers import concurrency

    source = Path(concurrency.__file__).read_text(encoding="utf-8")

    assert "import openai" not in source
    assert "from openai" not in source
    assert "careersignal.repositories" not in source
    assert "careersignal.agents" not in source
