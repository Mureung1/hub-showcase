from __future__ import annotations

import os
from pathlib import Path
from copy import deepcopy
import shutil
import tempfile
import threading
import unittest

from noticepilot_general_notice_postgres_outcomes import (
    GeneralNoticeOutcomeConflict,
    GeneralNoticeOutcomeError,
    GeneralNoticePostCommitAmbiguousError,
    GeneralNoticeS2PostgresOutcomeStore,
    build_consumer_receipt,
)
from noticepilot_general_notice_reconciliation_input import build_publishable_s27_views, validate_reconciliation_input
from noticepilot_general_notice_s2_consumer import run_selected_batch
from noticepilot_postgres_persistence import (
    PostgresPersistenceError,
    apply_migrations,
    execute_migration,
    file_sha256,
)
from general_notice_s2_fixtures import (
    BOARD_REGISTRY,
    normalized_notice,
    raw_candidate,
    reconciliation_input,
    write_s1a_batch,
)

ROOT = Path(__file__).resolve().parents[1]
DSN = os.environ.get("NOTICEPILOT_GENERAL_NOTICE_DATABASE_URL", "")


@unittest.skipUnless(DSN, "NOTICEPILOT_GENERAL_NOTICE_DATABASE_URL is required")
class GeneralNoticeS2PostgresOutcomeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        import psycopg

        cls.psycopg = psycopg
        if not psycopg.conninfo.conninfo_to_dict(DSN).get("dbname", "").endswith("_test"):
            raise RuntimeError("General Notice S2 tests require a *_test database")
        with psycopg.connect(DSN) as connection:
            apply_migrations(connection, ROOT / "migrations/postgresql")

    def setUp(self) -> None:
        with self.psycopg.connect(DSN) as connection:
            connection.execute(
                "TRUNCATE noticepilot.general_notice_s2_reconciliation_outcome, "
                "noticepilot.general_notice_s2_consumer_receipt, "
                "noticepilot.feed_snapshot_event, "
                "noticepilot.cross_notice_relation_decision, "
                "noticepilot.candidate_event_assignment, noticepilot.calendar_event_source_link, "
                "noticepilot.calendar_event_revision, noticepilot.calendar_event, "
                "noticepilot.calendar_event_candidate, noticepilot.extraction_run, "
                "noticepilot.source_processing_state, noticepilot.source_notice RESTART IDENTITY"
            )

    def _prepared(self, *, suffix="01", batch="batch-" + "c" * 64):
        notice = normalized_notice(notice_id=f"knu-504-9900{suffix}", content_hash=(suffix * 32)[:64])
        candidate = raw_candidate(notice, candidate_id=f"cand-knu-504-9900{suffix}-a")
        source = reconciliation_input(notice, candidate)
        unit = validate_reconciliation_input(source)
        unit["s27Views"] = build_publishable_s27_views(source, BOARD_REGISTRY)
        outcome = {
            "schemaVersion": "noticepilot.generalNoticeIncrementalReconciliation.v0.1",
            "candidateId": candidate["id"], "disposition": "created_new_event",
            "baselineCalendarEventId": None, "reason": "unambiguous_no_match",
            "reconciliationEvidence": {
                "schemaVersion": "noticepilot.generalNoticeS2ReconciliationEvidence.v0.1",
                "candidateId": candidate["id"], "decisions": [],
                "searchUniverse": {"baselineCount": 0, "overlayCount": 0},
            },
        }
        receipt = build_consumer_receipt(
            producer_batch_id=batch, producer_manifest_digest="d" * 64, producer_receipt_digest=None,
            normalized_notices=[notice], extraction_version="0.4.4",
            adapter_version="noticepilot.generalNoticeReconciliationInput.v0.1",
            promotion_policy_version="noticepilot.calendarCandidates.v0.4",
            reconciliation_contract_version="noticepilot.generalNoticeIncrementalReconciliation.v0.1",
            ordered_dispositions=[{"candidateId": candidate["id"], "disposition": "created_new_event", "reason": "unambiguous_no_match"}],
            created_at="2026-07-01T00:00:00Z",
        )
        return receipt, [unit], [outcome]

    def _store(self):
        return GeneralNoticeS2PostgresOutcomeStore(dsn=DSN, foundation_root=ROOT)

    def _count(self, table: str) -> int:
        with self.psycopg.connect(DSN) as connection:
            return int(connection.execute(f"SELECT count(*) FROM noticepilot.{table}").fetchone()[0])

    def test_migrations_apply_idempotently_and_checksum_conflict_fails_closed(self):
        with self.psycopg.connect(DSN) as connection:
            again = apply_migrations(connection, ROOT / "migrations/postgresql")
        self.assertEqual(set(again), {"0001_s29_initial", "0002_general_notice_s2_incremental_outcomes"})
        with tempfile.TemporaryDirectory() as temp:
            changed = Path(temp) / "0002_general_notice_s2_incremental_outcomes.sql"
            original = (ROOT / "migrations/postgresql/0002_general_notice_s2_incremental_outcomes.sql").read_bytes()
            changed.write_bytes(original.replace(b"\nCOMMIT;", b"\n-- checksum conflict\nCOMMIT;"))
            with self.psycopg.connect(DSN) as connection:
                with self.assertRaises(PostgresPersistenceError):
                    execute_migration(connection, changed)

    def test_migration_catalog_has_s2_immutability_and_source_link_identity(self):
        with self.psycopg.connect(DSN) as connection:
            row = connection.execute(
                "SELECT is_nullable, data_type FROM information_schema.columns "
                "WHERE table_schema='noticepilot' AND table_name='calendar_event_source_link' "
                "AND column_name='source_link_id'"
            ).fetchone()
            self.assertEqual(row, ("YES", "text"))
            triggers = {
                value[0]
                for value in connection.execute(
                    "SELECT tgname FROM pg_trigger WHERE tgrelid IN ("
                    "'noticepilot.general_notice_s2_consumer_receipt'::regclass,"
                    "'noticepilot.general_notice_s2_reconciliation_outcome'::regclass) "
                    "AND NOT tgisinternal"
                ).fetchall()
            }
            self.assertEqual(triggers, {"general_notice_s2_receipt_immutable", "general_notice_s2_outcome_immutable"})
            constraints = {
                value[0]
                for value in connection.execute(
                    "SELECT conname FROM pg_constraint WHERE conrelid="
                    "'noticepilot.general_notice_s2_reconciliation_outcome'::regclass"
                ).fetchall()
            }
            self.assertIn("general_notice_s2_outcome_receipt_candidate_unique", constraints)

    def test_no_match_writes_the_full_atomic_outcome_and_exact_retry_is_noop(self):
        receipt, units, outcomes = self._prepared()
        store = self._store()
        first = store.persist(receipt=receipt, notice_units=units, outcomes=outcomes, now="2026-07-02T00:00:00Z")
        self.assertEqual(first.status, "committed")
        persisted = first.outcomes[0]
        self.assertRegex(persisted["calendarEventId"], r"^evt_[0-9a-f]{32}$")
        self.assertRegex(persisted["sourceLinkId"], r"^evsrc_[0-9a-f]{32}$")
        self.assertEqual(self._count("calendar_event"), 1)
        self.assertEqual(self._count("calendar_event_revision"), 1)
        self.assertEqual(self._count("calendar_event_source_link"), 1)
        self.assertEqual(self._count("candidate_event_assignment"), 1)
        second = store.persist(receipt=receipt, notice_units=units, outcomes=outcomes, now="2026-07-02T00:00:00Z")
        self.assertEqual(second.status, "already_applied")
        self.assertEqual(self._count("calendar_event"), 1)

    def test_failures_roll_back_receipt_and_every_event_write_boundary(self):
        for index, boundary in enumerate(("receipt", "event", "source_link", "before_commit")):
            receipt, units, outcomes = self._prepared(suffix=f"{index + 2:02d}", batch=f"batch-{chr(ord('e') + index) * 64}")
            with self.assertRaises(GeneralNoticeOutcomeError):
                self._store().persist(receipt=receipt, notice_units=units, outcomes=outcomes, now="2026-07-02T00:00:00Z", fail_after=boundary)
            self.assertEqual(self._count("general_notice_s2_consumer_receipt"), 0)
            self.assertEqual(self._count("calendar_event"), 0)

    def test_post_commit_ambiguous_retry_returns_already_applied(self):
        receipt, units, outcomes = self._prepared()
        with self.assertRaises(GeneralNoticePostCommitAmbiguousError):
            self._store().persist(receipt=receipt, notice_units=units, outcomes=outcomes, now="2026-07-02T00:00:00Z", fail_after="after_commit")
        retry = self._store().persist(receipt=receipt, notice_units=units, outcomes=outcomes, now="2026-07-02T00:00:00Z")
        self.assertEqual(retry.status, "already_applied")
        self.assertEqual(self._count("calendar_event"), 1)

    def test_same_idempotency_key_with_divergent_payload_fails_closed(self):
        receipt, units, outcomes = self._prepared()
        self._store().persist(receipt=receipt, notice_units=units, outcomes=outcomes, now="2026-07-02T00:00:00Z")
        divergent = deepcopy(receipt)
        divergent["orderedDispositions"][0]["reason"] = "tampered"
        with self.assertRaises(GeneralNoticeOutcomeConflict):
            self._store().persist(receipt=divergent, notice_units=units, outcomes=outcomes, now="2026-07-02T00:00:00Z")

    def test_review_and_baseline_match_store_evidence_without_event_materialization(self):
        for suffix, disposition, baseline_id in (
            ("07", "requires_review", None),
            ("08", "baseline_match_evidence", "evt_" + "a" * 32),
        ):
            receipt, units, outcomes = self._prepared(suffix=suffix, batch="batch-" + suffix[0] * 64)
            outcomes[0]["disposition"] = disposition
            outcomes[0]["baselineCalendarEventId"] = baseline_id
            outcomes[0]["reason"] = "review_or_sealed_baseline"
            result = self._store().persist(
                receipt=receipt, notice_units=units, outcomes=outcomes, now="2026-07-02T00:00:00Z"
            )
            self.assertEqual(result.status, "committed")
            self.assertIsNone(result.outcomes[0]["calendarEventId"])
            self.assertIsNone(result.outcomes[0]["sourceLinkId"])
            self.assertEqual(self._count("calendar_event"), 0)

    def test_explicit_s1a_batch_runs_through_the_existing_pipeline_and_retries_idempotently(self):
        with tempfile.TemporaryDirectory() as temp:
            batch_id = write_s1a_batch(Path(temp))
            first = run_selected_batch(
                foundation_root=str(ROOT), state_root=temp, batch_id=batch_id,
                database_url=DSN, now="2026-07-02T00:00:00Z",
            )
            self.assertEqual(first["status"], "committed")
            self.assertEqual(first["outcomes"][0]["disposition"], "created_new_event")
            retry = run_selected_batch(
                foundation_root=str(ROOT), state_root=temp, batch_id=batch_id,
                database_url=DSN, now="2026-07-02T00:00:00Z",
            )
            self.assertEqual(retry["status"], "already_applied")
            self.assertEqual(self._count("calendar_event"), 1)

    def test_receipt_and_outcome_history_are_database_immutable(self):
        receipt, units, outcomes = self._prepared()
        self._store().persist(receipt=receipt, notice_units=units, outcomes=outcomes, now="2026-07-02T00:00:00Z")
        with self.psycopg.connect(DSN) as connection:
            with self.assertRaises(self.psycopg.Error):
                connection.execute(
                    "UPDATE noticepilot.general_notice_s2_consumer_receipt SET producer_batch_id='changed' WHERE receipt_id=%s",
                    (receipt["receiptId"],),
                )
            connection.rollback()
            with self.assertRaises(self.psycopg.Error):
                connection.execute("DELETE FROM noticepilot.general_notice_s2_reconciliation_outcome WHERE receipt_id=%s", (receipt["receiptId"],))

    def test_concurrent_same_candidate_creates_one_event_and_the_loser_conflicts(self):
        first = self._prepared(suffix="01", batch="batch-" + "f" * 64)
        second = self._prepared(suffix="01", batch="batch-" + "1" * 64)
        results: list[str] = []
        start = threading.Barrier(2)

        def write(prepared):
            try:
                start.wait(timeout=5)
                result = self._store().persist(receipt=prepared[0], notice_units=prepared[1], outcomes=prepared[2], now="2026-07-02T00:00:00Z")
                results.append(result.status)
            except GeneralNoticeOutcomeConflict:
                results.append("conflict")

        left = threading.Thread(target=write, args=(first,))
        right = threading.Thread(target=write, args=(second,))
        left.start(); right.start(); left.join(10); right.join(10)
        self.assertCountEqual(results, ["committed", "conflict"])
        self.assertEqual(self._count("calendar_event"), 1)


if __name__ == "__main__":
    unittest.main()
