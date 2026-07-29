"""항목 단위 되돌림 지점과 거래 사망 판정, 묶음 저장 검증.

정의는 `repositories/base.py` 다. PostgreSQL 은 거래 안에서 오류가 나면 그 거래의
남은 명령을 전부 거부하므로, 항목을 순회하며 저장하는 자리는 항목 하나를 되돌림
지점으로 감싸야 한 항목의 실패가 뒤 항목의 저장을 막지 않는다.

행이 만 단위인 자리는 묶어 넣는다. 묶음의 되돌림 단위가 묶음이므로 한 행의 실패가
묶음 전체를 되돌리며, 되돌아간 묶음을 한 줄씩 다시 넣어 나쁜 행만 골라낸다. 저장되는
행 집합이 하나씩 넣던 것과 같은지가 여기서 갈린다.

데이터베이스에 붙지 않는다. 되돌림 지점의 psycopg 호출은 대역으로 흉내 내고, 거래
사망 판정은 예외 클래스 이름과 메시지 문자열만 보는 순수 함수라 값으로 검사한다.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

import pytest
from psycopg.pq import TransactionStatus

from careersignal.domain.permissions import Component
from careersignal.repositories.base import (
    INSERT_BATCH_SIZE,
    MAX_STATEMENT_PARAMETERS,
    TRANSACTION_FATAL_MARKERS,
    Unit,
    insert_in_batches,
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


# ============================================================ 여러 행 INSERT
class RecordingCursor(FakeCursor):
    def __init__(self, log: list[tuple[str, Any]]) -> None:
        self._calls = log

    def execute(self, sql: str, params: Any = None) -> None:
        self._calls.append((sql, params))

    def executemany(self, sql: str, params: Any = None) -> None:
        raise AssertionError("executemany 는 쓰지 않는다")


class RecordingConnection:
    def __init__(self) -> None:
        self.calls: list[tuple[str, Any]] = []

    def cursor(self, row_factory: Any = None) -> RecordingCursor:
        return RecordingCursor(self.calls)


def test_여러_행을_한_문장의_VALUES_로_넣는다() -> None:
    """행마다 문장을 보내면 왕복이 행 수만큼이다. 왕복 하나로 줄인다."""
    conn = RecordingConnection()
    unit = Unit(conn, Component.AGENT_STATS)  # type: ignore[arg-type]
    unit.insert_many(
        "saturation_observations",
        [{"a": 1, "b": "x"}, {"a": 2, "b": "y"}, {"a": 3, "b": "z"}],
    )

    assert len(conn.calls) == 1
    sql, params = conn.calls[0]
    assert sql.startswith("INSERT INTO saturation_observations (a, b) VALUES ")
    assert sql.count("%(r0_a)s") == 1
    assert sql.count("), (") == 2  # 행 셋을 잇는 쉼표
    assert params["r0_a"] == 1
    assert params["r2_b"] == "z"
    assert len(params) == 6


def test_빈_목록은_문장을_보내지_않는다() -> None:
    conn = RecordingConnection()
    unit = Unit(conn, Component.AGENT_STATS)  # type: ignore[arg-type]
    unit.insert_many("saturation_observations", [])
    assert conn.calls == []


# ============================================================ 묶음 저장
class BatchStore:
    """묶음 저장의 대역.

    `bad` 에 든 값은 넣을 수 없다. 묶음 저장은 한 행이 걸리면 묶음 전체를 남기지 않아
    실제 세이브포인트의 되돌림과 같게 움직인다.
    """

    def __init__(self, bad: set[str] = frozenset(), fatal: set[str] = frozenset()):
        self.bad = set(bad)
        self.fatal = set(fatal)
        self.rows: list[str] = []
        self.statements: list[int] = []

    def _check(self, values: dict[str, Any]) -> None:
        if values["name"] in self.fatal:
            raise InFailedSqlTransaction("current transaction is aborted")
        if values["name"] in self.bad:
            raise UniqueViolation(f"duplicate key: {values['name']}")

    def insert_many(self, rows: Sequence[dict[str, Any]]) -> None:
        self.statements.append(len(rows))
        for values in rows:
            self._check(values)
        self.rows.extend(values["name"] for values in rows)

    def insert_one(self, values: dict[str, Any]) -> None:
        self.statements.append(1)
        self._check(values)
        self.rows.append(values["name"])


def _rows(*names: str) -> list[dict[str, Any]]:
    return [{"name": name} for name in names]


def test_묶음이_통째로_들어가면_문장이_하나다() -> None:
    store = BatchStore()
    written = insert_in_batches(
        object(), store.insert_many, store.insert_one, _rows("a", "b", "c")
    )
    assert store.rows == ["a", "b", "c"]
    assert store.statements == [3]
    assert written.stored == [0, 1, 2]
    assert written.failed == []
    assert written.fatal is None


def test_묶음_크기마다_문장을_나눈다() -> None:
    store = BatchStore()
    rows = _rows(*(f"n{index}" for index in range(7)))
    insert_in_batches(
        object(), store.insert_many, store.insert_one, rows, batch_size=3
    )
    assert store.statements == [3, 3, 1]
    assert len(store.rows) == 7


def test_묶음이_되돌아가면_한_줄씩_다시_넣어_나쁜_행만_뺀다() -> None:
    """묶어도 저장되는 행 집합이 하나씩 넣던 것과 같다."""
    store = BatchStore(bad={"b"})
    written = insert_in_batches(
        object(), store.insert_many, store.insert_one, _rows("a", "b", "c")
    )
    assert store.rows == ["a", "c"]
    assert written.stored == [0, 2]
    assert [index for index, _ in written.failed] == [1]
    assert written.fatal is None


def test_되돌아간_묶음만_다시_시도한다() -> None:
    """정상 경로의 왕복 수는 묶음 수 그대로다."""
    store = BatchStore(bad={"e"})
    rows = _rows("a", "b", "c", "d", "e", "f")
    insert_in_batches(
        object(), store.insert_many, store.insert_one, rows, batch_size=3
    )
    # 첫 묶음은 한 문장, 둘째 묶음은 되돌아가 세 줄을 다시 넣는다.
    assert store.statements == [3, 3, 1, 1, 1]
    assert store.rows == ["a", "b", "c", "d", "f"]


def test_거래를_죽이는_실패는_한_줄씩_다시_시도하지_않는다() -> None:
    """죽은 거래에 계속 넣으면 같은 사유의 실패 줄만 묶음 크기만큼 쌓인다."""
    store = BatchStore(fatal={"b"})
    written = insert_in_batches(
        object(), store.insert_many, store.insert_one, _rows("a", "b", "c")
    )
    assert store.statements == [3]
    assert written.stored == []
    assert len(written.failed) == 1
    assert transaction_is_dead(written.fatal)  # type: ignore[arg-type]


def test_한_줄씩_다시_넣다_거래가_죽으면_그_자리에서_멈춘다() -> None:
    store = BatchStore(bad={"a"}, fatal={"b"})
    written = insert_in_batches(
        object(), store.insert_many, store.insert_one, _rows("a", "b", "c")
    )
    assert store.rows == []
    assert [index for index, _ in written.failed] == [0, 1]
    assert written.fatal is not None


def test_큰_목록은_매개변수_한계에_맞춰_문장을_나눈다() -> None:
    """한 문장의 매개변수가 상한을 넘으면 드라이버가 문장을 통째로 거절한다."""
    conn = RecordingConnection()
    unit = Unit(conn, Component.AGENT_STATS)  # type: ignore[arg-type]
    span = MAX_STATEMENT_PARAMETERS // 2
    unit.insert_many(
        "saturation_observations",
        [{"a": index, "b": index} for index in range(span + 1)],
    )

    assert len(conn.calls) == 2
    assert all(len(params) <= MAX_STATEMENT_PARAMETERS for _, params in conn.calls)


def test_기본_묶음_크기는_문장_하나의_매개변수_한계_아래에_둔다() -> None:
    """확장 질의 프로토콜의 매개변수 상한은 65,535개다.

    `statistics_facts` 는 컬럼이 17개다(docs/erd.md 10.5). 묶음 크기가 이 상한을 넘기면
    문장이 통째로 거절되고, 되돌아간 묶음을 한 줄씩 다시 넣어도 같은 결과가 나온다.
    """
    assert INSERT_BATCH_SIZE * 17 < MAX_STATEMENT_PARAMETERS < 65_535
