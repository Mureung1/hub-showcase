"""데모 시드 원자 교체의 거래 경계와 안전장치."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from typing import Any

import pytest


AGENT_ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "load_demo_seed_replace", AGENT_ROOT / "scripts" / "load_demo_seed.py"
)
assert SPEC and SPEC.loader
load_seed = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = load_seed
SPEC.loader.exec_module(load_seed)

ACTIVE_TRIGGER_STATES = tuple(
    (table, trigger, "O")
    for table, trigger in sorted(load_seed.REQUIRED_GUARDED_TRIGGERS)
)


class _Cursor:
    def __init__(self, lock_granted: bool = True) -> None:
        self.lock_granted = lock_granted
        self.statements: list[str] = []
        self.rowcount = 0
        self._one: tuple[Any, ...] | None = None

    def __enter__(self) -> "_Cursor":
        return self

    def __exit__(self, *_: object) -> bool:
        return False

    def execute(self, sql: str, params: Any = None) -> "_Cursor":
        text = " ".join(sql.split())
        self.statements.append(text)
        if "pg_try_advisory_xact_lock" in text:
            self._one = (self.lock_granted,)
        else:
            self._one = None
        return self

    def fetchone(self) -> tuple[Any, ...] | None:
        return self._one

    def fetchall(self) -> list[tuple[Any, ...]]:
        return []


class _Connection:
    def __init__(self, cursor: _Cursor | None = None) -> None:
        self.cur = cursor or _Cursor()
        self.commits = 0
        self.rollbacks = 0

    def __enter__(self) -> "_Connection":
        return self

    def __exit__(self, *_: object) -> bool:
        return False

    def cursor(self) -> _Cursor:
        return self.cur

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


def test_replace_is_mutually_exclusive_with_other_modes() -> None:
    for other in ("--dry-run", "--preflight", "--rollback"):
        with pytest.raises(SystemExit):
            load_seed.parse_args(["--replace", other])
    assert load_seed.parse_args(["--replace"]).replace is True


def test_replace_lock_conflict_fails_before_scope_or_delete(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    cur = _Cursor(lock_granted=False)
    conn = _Connection(cur)
    monkeypatch.setattr(load_seed, "_connect", lambda: conn)
    monkeypatch.setattr(load_seed, "validate_all", lambda _: ({"dataset_versions": 1}, []))
    monkeypatch.setattr(load_seed, "csv_paths", lambda _: [("dataset_versions", Path("x"))])
    monkeypatch.setattr(load_seed, "_assert_complete_replace_files", lambda _: None)

    with pytest.raises(load_seed.ReplaceBusyError):
        load_seed.run_replace(Path("seed"))

    assert conn.commits == 0
    assert conn.rollbacks == 1
    assert any("pg_try_advisory_xact_lock" in sql for sql in cur.statements)
    assert not any("CREATE TEMP TABLE demo_" in sql for sql in cur.statements)
    assert not any(sql.startswith("DELETE FROM") for sql in cur.statements)


def test_external_fk_aborts_before_triggers_and_delete(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    events: list[str] = []
    cur = _Cursor()
    monkeypatch.setattr(load_seed, "collect_replace_scope", lambda *_: events.append("scope"))
    monkeypatch.setattr(load_seed, "snapshot_protected_tables", lambda *_: {})
    monkeypatch.setattr(
        load_seed,
        "assert_no_external_seed_references",
        lambda *_: (_ for _ in ()).throw(
            load_seed.ExternalSeedReferenceError("evaluation_cases")
        ),
    )
    monkeypatch.setattr(
        load_seed,
        "set_guarded_triggers",
        lambda *args, **kwargs: events.append("trigger"),
    )
    monkeypatch.setattr(load_seed, "delete_seed_rows", lambda *_: events.append("delete"))

    with pytest.raises(load_seed.ExternalSeedReferenceError):
        load_seed.replace_in_transaction(cur, [], {})

    assert events == ["scope"]


@pytest.mark.parametrize("failure_stage", ["delete", "keys", "copy"])
def test_mutating_stage_failure_restores_triggers_and_caller_rolls_back(
    monkeypatch: pytest.MonkeyPatch,
    failure_stage: str,
) -> None:
    events: list[str] = []
    conn = _Connection()
    monkeypatch.setattr(load_seed, "_connect", lambda: conn)
    monkeypatch.setattr(load_seed, "validate_all", lambda _: ({"dataset_versions": 1}, []))
    monkeypatch.setattr(load_seed, "csv_paths", lambda _: [("dataset_versions", Path("x"))])
    monkeypatch.setattr(load_seed, "_assert_complete_replace_files", lambda _: None)
    monkeypatch.setattr(load_seed, "collect_replace_scope", lambda *_: events.append("scope"))
    monkeypatch.setattr(load_seed, "snapshot_protected_tables", lambda *_: {})
    monkeypatch.setattr(load_seed, "assert_no_external_seed_references", lambda *_: None)
    monkeypatch.setattr(load_seed, "guarded_trigger_states", lambda *_: ACTIVE_TRIGGER_STATES)
    monkeypatch.setattr(
        load_seed,
        "set_guarded_triggers",
        lambda _cur, enabled, **_: events.append("enable" if enabled else "disable"),
    )

    def stage(name: str, result: Any = None) -> Any:
        events.append(name)
        if failure_stage == name:
            raise ValueError(f"{name} failed")
        return result

    monkeypatch.setattr(load_seed, "delete_seed_rows", lambda *_: stage("delete", {}))
    monkeypatch.setattr(load_seed, "assert_replace_key_safety", lambda *_: stage("keys"))
    monkeypatch.setattr(load_seed, "load_tables", lambda *_: stage("copy", ({}, [])))

    with pytest.raises(ValueError, match=f"{failure_stage} failed"):
        load_seed.run_replace(Path("seed"))

    assert events[-1] == "enable"
    assert events.count("disable") == 1
    assert events.count("enable") == 1
    assert conn.rollbacks == 1
    assert conn.commits == 0


def test_success_verifies_before_commit_and_keeps_one_copy_per_table(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    events: list[str] = []
    conn = _Connection()
    files = [
        ("dataset_versions", Path("dataset_versions.csv")),
        ("postings", Path("postings.csv")),
    ]
    counts = {"dataset_versions": 1, "postings": 270}
    monkeypatch.setattr(load_seed, "_connect", lambda: conn)
    monkeypatch.setattr(load_seed, "validate_all", lambda _: (counts, []))
    monkeypatch.setattr(load_seed, "csv_paths", lambda _: files)
    monkeypatch.setattr(load_seed, "_assert_complete_replace_files", lambda _: None)
    monkeypatch.setattr(load_seed, "collect_replace_scope", lambda *_: events.append("scope"))
    monkeypatch.setattr(
        load_seed,
        "snapshot_protected_tables",
        lambda *_: {"job_roles": (9, "sig")},
    )
    monkeypatch.setattr(load_seed, "assert_no_external_seed_references", lambda *_: None)
    monkeypatch.setattr(load_seed, "guarded_trigger_states", lambda *_: ACTIVE_TRIGGER_STATES)
    monkeypatch.setattr(
        load_seed,
        "set_guarded_triggers",
        lambda _cur, enabled, **_: events.append("enable" if enabled else "disable"),
    )
    monkeypatch.setattr(load_seed, "delete_seed_rows", lambda *_: events.append("delete"))
    monkeypatch.setattr(load_seed, "assert_replace_key_safety", lambda *_: events.append("keys"))

    def fake_load(
        _cur: Any, incoming: Any, _counts: Any
    ) -> tuple[dict[str, tuple[int, int]], list[str]]:
        events.extend(f"copy:{table}" for table, _ in incoming)
        return {table: (counts[table], 0) for table, _ in incoming}, []

    monkeypatch.setattr(load_seed, "load_tables", fake_load)
    monkeypatch.setattr(
        load_seed,
        "verify_replacement",
        lambda *_: events.append("verify"),
    )
    monkeypatch.setattr(
        load_seed,
        "assert_protected_tables_unchanged",
        lambda *_: events.append("protected"),
    )

    assert load_seed.run_replace(Path("seed")) == load_seed.EXIT_OK
    assert events == [
        "scope",
        "disable",
        "delete",
        "keys",
        "copy:dataset_versions",
        "copy:postings",
        "enable",
        "verify",
        "protected",
    ]
    assert conn.commits == 1
    assert conn.rollbacks == 0


def test_commit_verification_contract_contains_all_required_gates() -> None:
    labels = {label for label, _sql, _expected in load_seed.REPLACEMENT_CHECKS}
    assert labels == {
        "dataset version",
        "posting total",
        "postings per job",
        "recent postings per job",
        "previous postings per job",
        "recent cluster postings per job",
        "previous cluster postings per job",
        "open postings per job",
        "closed postings per job",
        "recent open postings per job",
        "recent closed postings per job",
        "previous closed postings per job",
        "analysis outputs",
        "analysis outputs per job",
        "posting scoped outputs per job",
        "posting output coverage",
        "active analysis versions",
    }
    checks = {label: " ".join(sql.split()) for label, sql, _ in load_seed.REPLACEMENT_CHECKS}
    assert "COUNT(*) = 270" in checks["posting total"]
    assert "MIN(n) = 30" in checks["postings per job"]
    assert "MIN(n) = 18" in checks["recent postings per job"]
    assert "MIN(n) = 12" in checks["previous postings per job"]
    assert "COUNT(*) = 1008" in checks["analysis outputs"]
    assert "MIN(n) = 112" in checks["analysis outputs per job"]
    assert "COUNT(*) = 27" in checks["posting scoped outputs per job"]


def test_trigger_modes_are_restored_exactly() -> None:
    cur = _Cursor()
    states = (
        ("source_snapshots", "trg_origin", "O"),
        ("source_observations", "trg_always", "A"),
        ("agent_runs", "trg_replica", "R"),
    )
    load_seed.set_guarded_triggers(cur, enabled=False, states=states)
    load_seed.set_guarded_triggers(cur, enabled=True, states=states)
    joined = " | ".join(cur.statements)
    assert 'ALTER TABLE "source_snapshots" DISABLE TRIGGER "trg_origin"' in joined
    assert 'ALTER TABLE "source_snapshots" ENABLE TRIGGER "trg_origin"' in joined
    assert 'ALTER TABLE "source_observations" ENABLE ALWAYS TRIGGER "trg_always"' in joined
    assert 'ALTER TABLE "agent_runs" ENABLE REPLICA TRIGGER "trg_replica"' in joined


def test_external_fk_query_checks_only_rows_in_the_frozen_seed_scope() -> None:
    class ExternalCursor(_Cursor):
        def execute(self, sql: str, params: Any = None) -> "ExternalCursor":
            text = " ".join(sql.split())
            self.statements.append(text)
            if "FROM pg_constraint c" in text:
                self._result = [
                    (
                        "evaluation_cases",
                        "fk_eval_posting",
                        "postings",
                        ["posting_id"],
                        ["posting_id"],
                    )
                ]
                self._one = None
            elif text.startswith("WITH seed AS"):
                self._result = []
                self._one = (1,)
            return self

        def fetchall(self) -> list[tuple[Any, ...]]:
            return list(getattr(self, "_result", []))

    cur = ExternalCursor()
    with pytest.raises(load_seed.ExternalSeedReferenceError, match="evaluation_cases"):
        load_seed.assert_no_external_seed_references(
            cur,
            {"ds": load_seed.DATASET_VERSION, "an": load_seed.ANALYSIS_VERSION_PATTERN},
        )
    checked = next(sql for sql in cur.statements if sql.startswith("WITH seed AS"))
    assert "WHERE posting_id IN (SELECT posting_id FROM demo_posting)" in checked
    assert 'FROM "evaluation_cases" AS external JOIN seed' in checked
