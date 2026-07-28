"""항목 단위 되돌림 지점과 거래 사망 판정 검증.

정의는 `repositories/base.py` 다. PostgreSQL 은 거래 안에서 오류가 나면 그 거래의
남은 명령을 전부 거부하므로, 항목을 순회하며 저장하는 자리는 항목 하나를 되돌림
지점으로 감싸야 한 항목의 실패가 뒤 항목의 저장을 막지 않는다.

데이터베이스에 붙지 않는다. 되돌림 지점의 psycopg 호출은 대역으로 흉내 내고, 거래
사망 판정은 예외 클래스 이름과 메시지 문자열만 보는 순수 함수라 값으로 검사한다.
"""

from __future__ import annotations

from typing import Any

import pytest
from psycopg.pq import TransactionStatus

from careersignal.domain.permissions import Component
from careersignal.repositories.base import (
    TRANSACTION_FATAL_MARKERS,
    Unit,
    is_transaction_fatal,
    item_savepoint,
    transaction_is_dead,
)


class InFailedSqlTransaction(Exception):
    """거래가 이미 죽은 뒤의 명령. 이름이 판정의 재료다."""


class UniqueViolation(Exception):
    """기본키 중복. 항목 하나만 되돌리면 되는 실패다."""


# ============================================================ 거래 사망 판정
def test_거래가_죽은_뒤의_명령은_되살릴_수_없다() -> None:
    assert is_transaction_fatal("InFailedSqlTransaction", "")


def test_기본키_중복은_거래를_죽이지_않는다() -> None:
    """세이브포인트가 그 항목만 되돌리므로 뒤 항목은 계속 저장할 수 있다."""
    assert not is_transaction_fatal(
        "UniqueViolation", 'duplicate key value violates unique constraint "x_pkey"'
    )


def test_메시지에_적힌_사망_표지도_읽는다() -> None:
    for marker in TRANSACTION_FATAL_MARKERS:
        assert is_transaction_fatal("SomeWrappedError", f"ERROR: {marker.upper()} ...")


def test_예외_객체도_같은_판정을_받는다() -> None:
    assert transaction_is_dead(InFailedSqlTransaction("current transaction is aborted"))
    assert not transaction_is_dead(UniqueViolation("duplicate key"))


# ============================================================ 되돌림 지점
class FakeSavepoint:
    """되돌림 지점을 세는 대역 거래."""

    def __init__(self) -> None:
        self.entered = 0
        self.rolled_back = 0

    def __enter__(self) -> FakeSavepoint:
        self.entered += 1
        return self

    def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> bool:
        if exc_type is not None:
            self.rolled_back += 1
        return False


class FakeUnit:
    def __init__(self) -> None:
        self.scope = FakeSavepoint()

    def savepoint(self) -> FakeSavepoint:
        return self.scope


class FakeRepository:
    def __init__(self) -> None:
        self.unit = FakeUnit()


def test_저장소가_되돌림_지점을_주면_그_안에서_저장한다() -> None:
    repository = FakeRepository()
    with item_savepoint(repository):
        pass
    assert repository.unit.scope.entered == 1
    assert repository.unit.scope.rolled_back == 0


def test_실패한_항목은_되돌리고_예외를_그대로_올린다() -> None:
    """거래는 살아 있어야 한다. 예외는 부르는 쪽이 항목의 실패로 센다."""
    repository = FakeRepository()
    with pytest.raises(UniqueViolation):
        with item_savepoint(repository):
            raise UniqueViolation("duplicate key")
    assert repository.unit.scope.rolled_back == 1


def test_거래를_갖지_않는_대역_저장소는_그냥_통과한다() -> None:
    """규칙만 보는 검사가 데이터베이스를 끌어들이지 않게 한다."""
    calls: list[str] = []
    with item_savepoint(object()):
        calls.append("saved")
    assert calls == ["saved"]


# ============================================================ Unit 의 되돌림 지점
class FakeCursor:
    def __init__(self, log: list[str]) -> None:
        self._log = log

    def __enter__(self) -> FakeCursor:
        return self

    def __exit__(self, *exc: Any) -> bool:
        return False

    def execute(self, sql: str, params: Any = None) -> None:
        self._log.append(sql)


class FakePgconn:
    def __init__(self, status: Any) -> None:
        self.transaction_status = status


class FakeConnection:
    """psycopg 연결의 대역. 거래 상태와 호출 차례만 흉내 낸다."""

    def __init__(self, status: Any) -> None:
        self.log: list[str] = []
        self.pgconn = FakePgconn(status)
        self.scope = FakeSavepoint()

    def cursor(self, row_factory: Any = None) -> FakeCursor:
        return FakeCursor(self.log)

    def transaction(self) -> FakeSavepoint:
        self.log.append("SAVEPOINT")
        return self.scope


def test_거래가_열려_있으면_세이브포인트만_잡는다() -> None:
    conn = FakeConnection(TransactionStatus.INTRANS)
    unit = Unit(conn, Component.AGENT_STATS)  # type: ignore[arg-type]
    with unit.savepoint():
        pass
    assert conn.log == ["SAVEPOINT"]


def test_거래가_아직_없으면_먼저_열고_세이브포인트를_잡는다() -> None:
    """바깥 거래로 잡히면 정상 종료할 때 그 자리에서 커밋해 버린다."""
    conn = FakeConnection(TransactionStatus.IDLE)
    unit = Unit(conn, Component.AGENT_STATS)  # type: ignore[arg-type]
    with unit.savepoint():
        pass
    assert conn.log == ["SELECT 1", "SAVEPOINT"]
