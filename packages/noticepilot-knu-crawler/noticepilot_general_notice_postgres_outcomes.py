#!/usr/bin/env python3
"""PostgreSQL writer for the restricted General Notice S2 outcome slice.

Only `created_new_event` materializes a CalendarEvent in v0.1.  Review and
baseline-match outcomes persist immutable evidence without changing a sealed
baseline event, head, revision, or source link.
"""
from __future__ import annotations

from contextlib import contextmanager
from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
from typing import Any, Callable, Iterator, Mapping, Sequence

from noticepilot_calendar_event_registry import OpaqueIdIssuer
from noticepilot_calendar_event_source_link import build_source_link_draft, persist_source_link
from noticepilot_general_notice_reconciliation_input import canonical_json_bytes, canonical_sha256
from noticepilot_reconciliation_candidate_view import build_reconciliation_candidate_view, load_board_registry

RECEIPT_SCHEMA_VERSION = "noticepilot.generalNoticeS2ConsumerReceipt.v0.1"
OUTCOME_SCHEMA_VERSION = "noticepilot.generalNoticeS2Outcome.v0.1"
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


class GeneralNoticeOutcomeError(RuntimeError):
    pass


class GeneralNoticeOutcomeConflict(GeneralNoticeOutcomeError):
    pass


class GeneralNoticeOutcomeIntegrityError(GeneralNoticeOutcomeError):
    pass


class GeneralNoticePostCommitAmbiguousError(GeneralNoticeOutcomeError):
    pass


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _from_json(value: Any) -> Any:
    return json.loads(value) if isinstance(value, str) else value


def _stable_id(prefix: str, value: Any) -> str:
    return f"{prefix}_{hashlib.sha256(canonical_json_bytes(value)).hexdigest()[:32]}"


def _require_hash(value: Any, field: str, *, nullable: bool = False) -> str | None:
    if value is None and nullable:
        return None
    if not isinstance(value, str) or SHA256_RE.fullmatch(value) is None:
        raise GeneralNoticeOutcomeError(f"{field} must be lowercase SHA-256")
    return value


def build_consumer_receipt(
    *,
    producer_batch_id: str,
    producer_manifest_digest: str,
    producer_receipt_digest: str | None,
    normalized_notices: Sequence[Mapping[str, Any]],
    extraction_version: str,
    adapter_version: str,
    promotion_policy_version: str,
    reconciliation_contract_version: str,
    ordered_dispositions: Sequence[Mapping[str, Any]],
    created_at: str,
) -> dict[str, Any]:
    """Build the immutable S2 receipt and its deterministic idempotency key."""
    _require_hash(producer_manifest_digest, "producerManifestDigest")
    _require_hash(producer_receipt_digest, "producerReceiptDigest", nullable=True)
    notices = [
        {"sourceNoticeId": str(row["noticeId"]), "sourceContentHash": str(row["contentHash"])}
        for row in normalized_notices
    ]
    notices.sort(key=lambda row: (row["sourceNoticeId"].encode("utf-8"), row["sourceContentHash"].encode("utf-8")))
    if len({(row["sourceNoticeId"], row["sourceContentHash"]) for row in notices}) != len(notices):
        raise GeneralNoticeOutcomeError("receipt normalized notices must be unique")
    versions = {
        "candidateExtractionVersion": extraction_version,
        "extractionAdapterVersion": adapter_version,
        "promotionPolicyVersion": promotion_policy_version,
        "reconciliationContractVersion": reconciliation_contract_version,
    }
    if any(not isinstance(value, str) or not value for value in versions.values()):
        raise GeneralNoticeOutcomeError("receipt contract versions are required")
    idempotency_material = {
        "schemaVersion": RECEIPT_SCHEMA_VERSION,
        "producerBatchId": producer_batch_id,
        "producerManifestDigest": producer_manifest_digest,
        "producerReceiptDigest": producer_receipt_digest,
        "normalizedNotices": notices,
        "contractVersions": versions,
    }
    idempotency_key = canonical_sha256(idempotency_material)
    dispositions = [deepcopy(dict(value)) for value in ordered_dispositions]
    dispositions.sort(key=lambda row: str(row.get("candidateId") or "").encode("utf-8"))
    payload = {
        "schemaVersion": RECEIPT_SCHEMA_VERSION,
        "receiptId": _stable_id("gns2rec", idempotency_material),
        "producerBatchId": producer_batch_id,
        "producerManifestDigest": producer_manifest_digest,
        "producerReceiptDigest": producer_receipt_digest,
        "normalizedNotices": notices,
        "normalizedNoticeIds": [row["sourceNoticeId"] for row in notices],
        "normalizedNoticeContentHashes": [row["sourceContentHash"] for row in notices],
        "deterministicInputOrder": [
            {"sourceNoticeId": row["sourceNoticeId"], "sourceContentHash": row["sourceContentHash"]}
            for row in notices
        ],
        "contractVersions": versions,
        "orderedDispositions": dispositions,
        "idempotencyKey": idempotency_key,
        "createdAt": created_at,
    }
    return payload


@dataclass(frozen=True)
class PersistedOutcomeResult:
    status: str
    receipt_id: str
    outcomes: tuple[dict[str, Any], ...]


class GeneralNoticeS2PostgresOutcomeStore:
    """One Python-owned transaction boundary over the existing S29 ledger."""

    def __init__(
        self,
        *,
        dsn: str,
        foundation_root: Path,
        connection_factory: Callable[[], Any] | None = None,
        id_issuer: OpaqueIdIssuer | None = None,
    ) -> None:
        if not dsn or not dsn.strip():
            raise GeneralNoticeOutcomeError("database URL is required")
        self._dsn = dsn
        self._foundation_root = Path(foundation_root).resolve()
        self._connection_factory = connection_factory
        self._id_issuer = id_issuer or OpaqueIdIssuer()
        self._board_registry = load_board_registry(
            self._foundation_root / "configs/knu_board_registry.v0.2.json"
        )

    def _connect(self) -> Any:
        if self._connection_factory is not None:
            return self._connection_factory()
        try:
            import psycopg  # type: ignore
            from psycopg.rows import dict_row  # type: ignore
        except ImportError as exc:  # pragma: no cover - environment gate
            raise GeneralNoticeOutcomeError("PostgreSQL driver is unavailable") from exc
        return psycopg.connect(
            self._dsn,
            connect_timeout=5,
            application_name="noticepilot_general_notice_s2_v01",
            row_factory=dict_row,
        )

    @contextmanager
    def _transaction(self) -> Iterator[tuple[Any, Any]]:
        connection = self._connect()
        try:
            cursor = connection.cursor()
            cursor.execute("SET LOCAL statement_timeout = '10s'")
            cursor.execute("SET LOCAL lock_timeout = '3s'")
            cursor.execute("SET LOCAL idle_in_transaction_session_timeout = '10s'")
            cursor.execute("SET LOCAL TIME ZONE 'UTC'")
            yield connection, cursor
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    @staticmethod
    def _lock(cursor: Any, key: str) -> None:
        cursor.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))", (key,))

    @staticmethod
    def _row(cursor: Any) -> Mapping[str, Any] | None:
        row = cursor.fetchone()
        if row is None:
            return None
        if isinstance(row, Mapping):
            return row
        raise GeneralNoticeOutcomeIntegrityError("database cursor must provide mapping rows")

    @staticmethod
    def _field(row: Any, name: str, index: int = 0) -> Any:
        return row[name] if isinstance(row, Mapping) else row[index]

    def _assert_receipt_match(self, stored: Mapping[str, Any], receipt: Mapping[str, Any]) -> None:
        if canonical_json_bytes(_from_json(stored["payload"])) != canonical_json_bytes(dict(receipt)):
            raise GeneralNoticeOutcomeConflict("idempotency key payload conflict")

    def _insert_source_and_candidates(
        self,
        cursor: Any,
        *,
        unit: Mapping[str, Any],
        now: str,
    ) -> None:
        notice = unit["normalizedNotice"]
        payload = unit["candidatePayload"]
        board = notice["board"]
        source_notice_id = str(notice["noticeId"])
        category = str(board["category"])
        source_identity = f"kangwon:{category}:{notice['pstSn']}"
        cursor.execute(
            "SELECT source_identity_key, content_hash, payload FROM noticepilot.source_notice "
            "WHERE source_notice_id = %s FOR UPDATE",
            (source_notice_id,),
        )
        existing = self._row(cursor)
        if existing is None:
            cursor.execute(
                "INSERT INTO noticepilot.source_notice ("
                "source_notice_id,institution_id,canonical_board_category,source_post_id,source_identity_key,"
                "title,source_url,canonical_source_url,published_at,fetched_at,content_hash,semantic_content_hash,"
                "status,source_revision,payload,created_at,updated_at) VALUES ("
                "%s,'kangwon',%s,%s,%s,%s,%s,%s,%s,%s,%s,NULL,'active',1,%s::jsonb,%s,%s) "
                "ON CONFLICT DO NOTHING",
                (
                    source_notice_id, category, str(notice["pstSn"]), source_identity,
                    str(notice["title"]), notice["sourceUrl"], notice["sourceUrl"], notice.get("publishedAt"),
                    notice["crawler"]["crawledAt"], notice["contentHash"], _json(notice), now, now,
                ),
            )
        else:
            if str(existing["source_identity_key"]) != source_identity or str(existing["content_hash"]).strip() != str(notice["contentHash"]):
                raise GeneralNoticeOutcomeConflict("S2 does not revise an existing source notice")
        # A competing first writer can insert after the initial SELECT.  The
        # conflict-tolerant INSERT above serializes on the primary key; verify
        # the committed provenance afterwards instead of treating an identical
        # source observation as a database error.
        cursor.execute(
            "SELECT source_identity_key, content_hash FROM noticepilot.source_notice "
            "WHERE source_notice_id = %s FOR UPDATE",
            (source_notice_id,),
        )
        stored_notice = self._row(cursor)
        if stored_notice is None or (
            str(stored_notice["source_identity_key"]) != source_identity
            or str(stored_notice["content_hash"]).strip() != str(notice["contentHash"])
        ):
            raise GeneralNoticeOutcomeConflict("source notice identity conflict")

        run_material = {
            "sourceNoticeId": source_notice_id,
            "sourceContentHash": notice["contentHash"],
            "extractorVersion": payload["extractor"]["version"],
            "candidatePayload": payload,
        }
        extraction_run_id = _stable_id("extrun", run_material)
        result_hash = canonical_sha256(payload)
        cursor.execute(
            "INSERT INTO noticepilot.extraction_run ("
            "extraction_run_id,source_notice_id,source_content_hash,extractor_version,policy_version,status,"
            "result_hash,payload,started_at,completed_at,created_at) VALUES ("
            "%s,%s,%s,%s,'noticepilot.generalNoticeS2.v0.1','completed',%s,%s::jsonb,%s,%s,%s) "
            "ON CONFLICT (source_notice_id,source_content_hash,extractor_version,policy_version) DO NOTHING",
            (extraction_run_id, source_notice_id, notice["contentHash"], payload["extractor"]["version"], result_hash, _json(payload), now, now, now),
        )
        cursor.execute(
            "SELECT extraction_run_id, result_hash FROM noticepilot.extraction_run WHERE "
            "source_notice_id=%s AND source_content_hash=%s AND extractor_version=%s "
            "AND policy_version='noticepilot.generalNoticeS2.v0.1' FOR UPDATE",
            (source_notice_id, notice["contentHash"], payload["extractor"]["version"]),
        )
        run = self._row(cursor)
        if run is None or str(run["result_hash"]).strip() != result_hash:
            raise GeneralNoticeOutcomeConflict("extraction run identity conflict")
        actual_run_id = str(run["extraction_run_id"])
        for candidate in unit["candidateUnits"]:
            raw = candidate["rawCandidate"]
            candidate_hash = canonical_sha256(raw)
            cursor.execute(
                "INSERT INTO noticepilot.calendar_event_candidate ("
                "candidate_id,source_notice_id,extraction_run_id,candidate_hash,publishability_status,"
                "include_in_calendar_feed,payload,created_at,updated_at) VALUES ("
                "%s,%s,%s,%s,%s,%s,%s::jsonb,%s,%s) ON CONFLICT (candidate_id) DO NOTHING",
                (raw["id"], source_notice_id, actual_run_id, candidate_hash, raw["status"], raw["includeInCalendarFeed"], _json(raw), now, now),
            )
            cursor.execute(
                "SELECT candidate_hash, source_notice_id FROM noticepilot.calendar_event_candidate "
                "WHERE candidate_id=%s FOR UPDATE",
                (raw["id"],),
            )
            stored_candidate = self._row(cursor)
            if stored_candidate is None or str(stored_candidate["candidate_hash"]).strip() != candidate_hash or str(stored_candidate["source_notice_id"]) != source_notice_id:
                raise GeneralNoticeOutcomeConflict("candidate identity conflict")

    def _persist_outcome(
        self,
        cursor: Any,
        *,
        receipt: Mapping[str, Any],
        unit_by_candidate: Mapping[str, Mapping[str, Any]],
        outcome: Mapping[str, Any],
        now: str,
        fail_after: str | None,
    ) -> dict[str, Any]:
        candidate_id = str(outcome["candidateId"])
        disposition = str(outcome["disposition"])
        unit = unit_by_candidate[candidate_id]
        calendar_event_id: str | None = None
        source_link_id: str | None = None
        if disposition == "created_new_event":
            self._lock(cursor, f"noticepilot.general_notice_s2.candidate:{candidate_id}")
            cursor.execute(
                "SELECT calendar_event_id FROM noticepilot.candidate_event_assignment WHERE candidate_id=%s FOR UPDATE",
                (candidate_id,),
            )
            if self._row(cursor) is not None:
                raise GeneralNoticeOutcomeConflict("candidate is already assigned to a CalendarEvent")
            normalized_notice = unit["normalizedNotice"]
            # The sealed S27 view predates normalizedNotice.v0.3 and names
            # these two immutable provenance fields with the legacy source*
            # spelling.  This is a field-name adapter only; all values remain
            # the selected normalized notice's validated identity and digest.
            s27_notice = {
                **normalized_notice,
                "sourceNoticeId": normalized_notice["noticeId"],
                "sourceContentHash": normalized_notice["contentHash"],
            }
            view = build_reconciliation_candidate_view(
                unit["rawCandidate"], s27_notice, self._board_registry
            )
            calendar_event_id = self._id_issuer.issue("calendar_event")
            revision_id = self._id_issuer.issue("calendar_event_revision")
            source_link_id = self._id_issuer.issue("calendar_event_source_link")
            assignment_id = self._id_issuer.issue("calendar_event_assignment")
            cursor.execute(
                "INSERT INTO noticepilot.calendar_event (calendar_event_id,canonical_candidate_id,"
                "canonical_source_notice_id,active_revision_id,status,sequence,version,relation_basis,"
                "projection,created_at,updated_at) VALUES (%s,%s,%s,NULL,'published',0,0,'singleton',%s::jsonb,%s,%s)",
                (calendar_event_id, candidate_id, view["sourceNoticeId"], _json(view["eventProjection"]), now, now),
            )
            if fail_after == "event":
                raise GeneralNoticeOutcomeError("injected failure after event insert")
            evidence_pair_ids = [decision["pairId"] for decision in outcome["reconciliationEvidence"]["decisions"]]
            cursor.execute(
                "INSERT INTO noticepilot.calendar_event_revision (revision_id,calendar_event_id,source_candidate_id,"
                "previous_revision_id,revision_number,sequence,kind,active,projection,evidence_pair_ids,recorded_at) "
                "VALUES (%s,%s,%s,NULL,1,0,'created',true,%s::jsonb,%s::jsonb,%s)",
                (revision_id, calendar_event_id, candidate_id, _json(view["eventProjection"]), _json(sorted(evidence_pair_ids)), now),
            )
            updated = cursor.execute(
                "UPDATE noticepilot.calendar_event SET active_revision_id=%s, updated_at=%s "
                "WHERE calendar_event_id=%s AND active_revision_id IS NULL AND version=0",
                (revision_id, now, calendar_event_id),
            )
            if int(getattr(updated, "rowcount", 0) or 0) != 1:
                raise GeneralNoticeOutcomeConflict("new event active-head compare-and-swap failed")
            draft = build_source_link_draft(
                view, relation_role="canonical", canonical=True,
                evidence_pair_ids=evidence_pair_ids,
                decision_rule_ids=["S2.unambiguous_no_match"],
            )
            link = persist_source_link(
                draft, source_link_id=source_link_id, calendar_event_id=calendar_event_id,
                first_observed_at=now,
            )
            cursor.execute(
                "INSERT INTO noticepilot.calendar_event_source_link (source_link_id,calendar_event_id,source_candidate_id,source_notice_id,"
                "canonical,active_source,relation_role,source_identity,observed_source_url,canonical_source_url,published_at,"
                "decision_rule_ids,evidence_pair_ids,first_observed_at,last_observed_at,payload) VALUES ("
                "%s,%s,%s,%s,true,true,'canonical',%s::jsonb,%s,%s,%s,%s::jsonb,%s::jsonb,%s,%s,%s::jsonb)",
                (source_link_id, calendar_event_id, candidate_id, view["sourceNoticeId"], _json(link["sourceIdentity"]),
                 link["observedSourceUrl"], link["canonicalSourceUrl"], link["publishedAt"],
                 _json(link["decisionRuleIds"]), _json(link["evidencePairIds"]), now, now, _json(link)),
            )
            if fail_after == "source_link":
                raise GeneralNoticeOutcomeError("injected failure after source-link insert")
            assignment_payload = {
                "schemaVersion": "noticepilot.calendarEventIdentityAssignment.v0.1",
                "assignmentId": assignment_id,
                "candidateId": candidate_id,
                "calendarEventId": calendar_event_id,
                "assignmentRole": "canonical",
                "canonical": True,
                "sourceNoticeId": view["sourceNoticeId"],
                "decisionPairIds": sorted(evidence_pair_ids),
                "registryId": "general-notice-s2-incremental-v0.1",
                "assignedAt": now,
            }
            cursor.execute(
                "INSERT INTO noticepilot.candidate_event_assignment (candidate_id,calendar_event_id,assignment_kind,payload,assigned_at) "
                "VALUES (%s,%s,'canonical',%s::jsonb,%s)",
                (candidate_id, calendar_event_id, _json(assignment_payload), now),
            )

        outcome_id = _stable_id("gns2out", {"receiptId": receipt["receiptId"], "candidateId": candidate_id})
        persisted_payload = {
            "schemaVersion": OUTCOME_SCHEMA_VERSION,
            "outcomeId": outcome_id,
            "receiptId": receipt["receiptId"],
            **deepcopy(dict(outcome)),
            "calendarEventId": calendar_event_id,
            "sourceLinkId": source_link_id,
            "createdAt": now,
        }
        cursor.execute(
            "INSERT INTO noticepilot.general_notice_s2_reconciliation_outcome ("
            "outcome_id,receipt_id,candidate_id,disposition,calendar_event_id,baseline_calendar_event_id,"
            "reconciliation_evidence,payload,created_at) VALUES ("
            "%s,%s,%s,%s,%s,%s,%s::jsonb,%s::jsonb,%s)",
            (outcome_id, receipt["receiptId"], candidate_id, disposition, calendar_event_id,
             outcome.get("baselineCalendarEventId"), _json(outcome["reconciliationEvidence"]), _json(persisted_payload), now),
        )
        return persisted_payload

    def _load_receipt_outcomes(self, cursor: Any, receipt_id: str) -> tuple[dict[str, Any], ...]:
        cursor.execute(
            "SELECT payload FROM noticepilot.general_notice_s2_reconciliation_outcome "
            "WHERE receipt_id=%s ORDER BY candidate_id",
            (receipt_id,),
        )
        return tuple(deepcopy(_from_json(self._field(row, "payload"))) for row in cursor.fetchall())

    def _verify_committed(self, receipt_id: str, expected: Sequence[Mapping[str, Any]]) -> tuple[dict[str, Any], ...]:
        connection = self._connect()
        try:
            cursor = connection.cursor()
            cursor.execute(
                "SELECT payload FROM noticepilot.general_notice_s2_consumer_receipt WHERE receipt_id=%s",
                (receipt_id,),
            )
            if cursor.fetchone() is None:
                raise GeneralNoticeOutcomeIntegrityError("committed receipt is missing")
            rows = self._load_receipt_outcomes(cursor, receipt_id)
            if len(rows) != len(expected):
                raise GeneralNoticeOutcomeIntegrityError("committed outcome count mismatch")
            for row in rows:
                if row["disposition"] != "created_new_event":
                    continue
                event_id = row.get("calendarEventId")
                cursor.execute(
                    "SELECT e.active_revision_id AS active_revision_id, r.active AS revision_active, "
                    "l.canonical AS link_canonical, l.source_link_id AS source_link_id, "
                    "a.calendar_event_id AS assignment_event_id "
                    "FROM noticepilot.calendar_event e "
                    "JOIN noticepilot.calendar_event_revision r ON r.revision_id=e.active_revision_id "
                    "JOIN noticepilot.calendar_event_source_link l ON l.calendar_event_id=e.calendar_event_id "
                    "JOIN noticepilot.candidate_event_assignment a ON a.candidate_id=r.source_candidate_id "
                    "WHERE e.calendar_event_id=%s AND l.source_candidate_id=r.source_candidate_id",
                    (event_id,),
                )
                invariant = cursor.fetchone()
                if invariant is None or (
                    self._field(invariant, "revision_active", 1) is not True
                    or self._field(invariant, "link_canonical", 2) is not True
                    or self._field(invariant, "source_link_id", 3) != row.get("sourceLinkId")
                    or self._field(invariant, "assignment_event_id", 4) != event_id
                ):
                    raise GeneralNoticeOutcomeIntegrityError("committed event relationship invariant failed")
            return rows
        finally:
            connection.close()

    def persist(
        self,
        *,
        receipt: Mapping[str, Any],
        notice_units: Sequence[Mapping[str, Any]],
        outcomes: Sequence[Mapping[str, Any]],
        now: str | None = None,
        fail_after: str | None = None,
    ) -> PersistedOutcomeResult:
        if receipt.get("schemaVersion") != RECEIPT_SCHEMA_VERSION:
            raise GeneralNoticeOutcomeError("unsupported consumer receipt")
        _require_hash(receipt.get("idempotencyKey"), "idempotencyKey")
        now = now or _utc_now()
        unit_by_candidate: dict[str, Mapping[str, Any]] = {}
        for unit in notice_units:
            for candidate in unit["candidateUnits"]:
                candidate_id = str(candidate["sourceCandidateId"])
                if candidate_id in unit_by_candidate:
                    raise GeneralNoticeOutcomeError("candidate appears in multiple notice units")
                unit_by_candidate[candidate_id] = {
                    "normalizedNotice": unit["normalizedNotice"],
                    "rawCandidate": candidate["rawCandidate"],
                }
        ordered = sorted((deepcopy(dict(value)) for value in outcomes), key=lambda value: str(value["candidateId"]).encode("utf-8"))
        if {str(value["candidateId"]) for value in ordered} != set(unit_by_candidate):
            raise GeneralNoticeOutcomeError("outcomes must cover every receipt candidate")
        post_commit_failure = fail_after == "after_commit"
        try:
            with self._transaction() as (_connection, cursor):
                self._lock(cursor, f"noticepilot.general_notice_s2.receipt:{receipt['idempotencyKey']}")
                cursor.execute(
                    "SELECT payload FROM noticepilot.general_notice_s2_consumer_receipt WHERE idempotency_key=%s FOR UPDATE",
                    (receipt["idempotencyKey"],),
                )
                existing = self._row(cursor)
                if existing is not None:
                    self._assert_receipt_match(existing, receipt)
                    rows = self._load_receipt_outcomes(cursor, str(receipt["receiptId"]))
                    return PersistedOutcomeResult("already_applied", str(receipt["receiptId"]), rows)
                cursor.execute(
                    "INSERT INTO noticepilot.general_notice_s2_consumer_receipt ("
                    "receipt_id,schema_version,idempotency_key,producer_batch_id,producer_manifest_digest,"
                    "producer_receipt_digest,normalized_notice_digests,contract_versions,payload,created_at) VALUES ("
                    "%s,%s,%s,%s,%s,%s,%s::jsonb,%s::jsonb,%s::jsonb,%s)",
                    (receipt["receiptId"], receipt["schemaVersion"], receipt["idempotencyKey"],
                     receipt["producerBatchId"], receipt["producerManifestDigest"], receipt.get("producerReceiptDigest"),
                     _json(receipt["normalizedNotices"]), _json(receipt["contractVersions"]), _json(receipt), now),
                )
                if fail_after == "receipt":
                    raise GeneralNoticeOutcomeError("injected failure after receipt insert")
                for unit in notice_units:
                    self._insert_source_and_candidates(cursor, unit=unit, now=now)
                persisted = [
                    self._persist_outcome(
                        cursor, receipt=receipt, unit_by_candidate=unit_by_candidate,
                        outcome=outcome, now=now, fail_after=fail_after,
                    )
                    for outcome in ordered
                ]
                if fail_after == "before_commit":
                    raise GeneralNoticeOutcomeError("injected failure before commit")
            verified = self._verify_committed(str(receipt["receiptId"]), persisted)
            if post_commit_failure:
                raise GeneralNoticePostCommitAmbiguousError("outcome commit status is ambiguous to caller")
            return PersistedOutcomeResult("committed", str(receipt["receiptId"]), verified)
        except GeneralNoticePostCommitAmbiguousError:
            raise

    def load_overlay_views(self) -> list[dict[str, Any]]:
        """Load only prior S2-created events; bootstrap baseline rows are excluded."""
        connection = self._connect()
        try:
            cursor = connection.cursor()
            cursor.execute(
                "SELECT o.calendar_event_id, c.payload AS candidate_payload, s.payload AS notice_payload "
                "FROM noticepilot.general_notice_s2_reconciliation_outcome o "
                "JOIN noticepilot.calendar_event_candidate c ON c.candidate_id=o.candidate_id "
                "JOIN noticepilot.source_notice s ON s.source_notice_id=c.source_notice_id "
                "WHERE o.disposition='created_new_event' ORDER BY o.calendar_event_id"
            )
            values: list[dict[str, Any]] = []
            for row in cursor.fetchall():
                event_id = self._field(row, "calendar_event_id", 0)
                candidate_payload = self._field(row, "candidate_payload", 1)
                notice_payload = self._field(row, "notice_payload", 2)
                notice = _from_json(notice_payload)
                s27_notice = {
                    **notice,
                    "sourceNoticeId": notice["noticeId"],
                    "sourceContentHash": notice["contentHash"],
                }
                view = build_reconciliation_candidate_view(
                    _from_json(candidate_payload), s27_notice, self._board_registry
                )
                values.append({"origin": "overlay", "calendarEventId": str(event_id), "view": view})
            return values
        finally:
            connection.close()
