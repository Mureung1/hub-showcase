#!/usr/bin/env python3
"""Explicit operator-only General Notice S2 incremental consumer.

The command never discovers a latest batch.  It accepts one private immutable
S1 batch selected by the operator, validates it before candidate generation,
and has no HTTP, scheduler, feed, snapshot, or ICS behaviour.
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
from typing import Any, Mapping

from noticepilot_candidate_extractor import extract_candidates_from_notice
from noticepilot_general_notice_incremental_reconciler import (
    GeneralNoticeIncrementalReconciler,
    load_sealed_baseline_views,
)
from noticepilot_general_notice_postgres_outcomes import (
    GeneralNoticeOutcomeError,
    GeneralNoticeS2PostgresOutcomeStore,
    build_consumer_receipt,
)
from noticepilot_general_notice_reconciliation_input import (
    GeneralNoticeReconciliationInputError,
    canonical_json_bytes,
    canonical_sha256,
    build_publishable_s27_views,
    validate_reconciliation_input,
)
from noticepilot_postgres_persistence import apply_migrations

S1A_MANIFEST_SCHEMA = "noticepilot.routeS.batchManifest.v1"
S1B_MANIFEST_SCHEMA = "noticepilot.routeS.repeatableBatchManifest.v1"
S1A_CHECKPOINT_SCHEMA = "noticepilot.routeS.checkpoint.v1"
S1B_CHECKPOINT_SCHEMA = "noticepilot.routeS.repeatableCheckpoint.v1"


class GeneralNoticeS2ConsumerError(RuntimeError):
    pass


@dataclass(frozen=True)
class SelectedS1Batch:
    kind: str
    path: Path
    manifest: dict[str, Any]
    manifest_digest: str
    producer_receipt_digest: str | None
    notices: tuple[dict[str, Any], ...]


def _sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _private(path: Path, expected: str) -> bool:
    try:
        entry = path.lstat()
    except OSError:
        return False
    if stat.S_ISLNK(entry.st_mode) or entry.st_mode & 0o077:
        return False
    return stat.S_ISDIR(entry.st_mode) if expected == "directory" else stat.S_ISREG(entry.st_mode)


def _require_private_directory(path: Path, code: str) -> Path:
    if not path.is_absolute() or path.is_symlink() or not _private(path, "directory"):
        raise GeneralNoticeS2ConsumerError(code)
    resolved = path.resolve()
    repository_root = Path(__file__).resolve().parents[2]
    try:
        resolved.relative_to(repository_root)
    except ValueError:
        return resolved
    raise GeneralNoticeS2ConsumerError("mutable_runtime_state_as_input")


def _read_private_json(path: Path, code: str) -> dict[str, Any]:
    if not _private(path, "file"):
        raise GeneralNoticeS2ConsumerError(code)
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise GeneralNoticeS2ConsumerError(code) from exc
    if not isinstance(value, dict):
        raise GeneralNoticeS2ConsumerError(code)
    return value


def _reject_symlinked_tree(root: Path) -> None:
    for path in root.rglob("*"):
        if path.is_symlink():
            raise GeneralNoticeS2ConsumerError("symlinked_input")


def _relative_notice_path(value: Any) -> Path:
    if not isinstance(value, str):
        raise GeneralNoticeS2ConsumerError("malformed_normalized_path")
    path = Path(value)
    if path.is_absolute() or ".." in path.parts or path.parts[:2] != ("normalized", "notices") or path.suffix != ".json":
        raise GeneralNoticeS2ConsumerError("malformed_normalized_path")
    return path


def _validate_checkpoint(state_root: Path, batch_id: str, kind: str, manifest: Mapping[str, Any]) -> None:
    checkpoint_path = state_root / "checkpoint.json"
    checkpoint = _read_private_json(checkpoint_path, "manifest_checkpoint_disagreement")
    if kind == "s1a":
        if checkpoint.get("schemaVersion") != S1A_CHECKPOINT_SCHEMA or checkpoint.get("lastCleanBatchId") != batch_id:
            raise GeneralNoticeS2ConsumerError("manifest_checkpoint_disagreement")
        return
    if checkpoint.get("schemaVersion") != S1B_CHECKPOINT_SCHEMA or not isinstance(checkpoint.get("sourceStates"), dict):
        raise GeneralNoticeS2ConsumerError("manifest_checkpoint_disagreement")
    for source in manifest["sources"]:
        state = checkpoint["sourceStates"].get(source["sourceId"])
        if not isinstance(state, Mapping) or state.get("lastCleanBatchId") != batch_id:
            raise GeneralNoticeS2ConsumerError("manifest_checkpoint_disagreement")


def _validate_s1a_manifest(manifest: Mapping[str, Any], notices: list[dict[str, Any]]) -> None:
    required = {
        "schemaVersion", "batchId", "status", "institutionId", "boardId", "startedAt", "finishedAt",
        "attemptedNoticeCount", "successfulNoticeCount", "failedNoticeCount", "changedNoticeCount",
        "unchangedNoticeCount", "normalizedPaths", "failureReasonCodes", "integrity", "eligibleForDownstream",
    }
    if set(manifest) != required or manifest.get("schemaVersion") != S1A_MANIFEST_SCHEMA or manifest.get("status") != "clean":
        raise GeneralNoticeS2ConsumerError("unknown_manifest")
    if manifest.get("eligibleForDownstream") is not True:
        raise GeneralNoticeS2ConsumerError("unknown_manifest")
    if manifest["failedNoticeCount"] != 0 or manifest["successfulNoticeCount"] != len(notices):
        raise GeneralNoticeS2ConsumerError("partial")
    integrity = manifest.get("integrity")
    if not isinstance(integrity, Mapping) or integrity.get("algorithm") != "sha256" or not isinstance(integrity.get("normalizedContentHashes"), Mapping):
        raise GeneralNoticeS2ConsumerError("unknown_manifest")
    actual = {str(row["pstSn"]): row["contentHash"] for row in notices}
    if dict(integrity["normalizedContentHashes"]) != actual:
        raise GeneralNoticeS2ConsumerError("digest_mismatch")
    expected_batch = "batch-" + canonical_sha256([
        {"pstSn": pst, "contentHash": actual[pst]} for pst in sorted(actual)
    ])
    if manifest.get("batchId") != expected_batch:
        raise GeneralNoticeS2ConsumerError("digest_mismatch")


def _validate_s1b_manifest(manifest: Mapping[str, Any], notices: list[dict[str, Any]]) -> str:
    required = {
        "schemaVersion", "batchId", "status", "institutionId", "sourceCount", "noticeCount",
        "changedNoticeCount", "eligibleForDownstream", "observationOnly", "receipt", "sources",
    }
    if set(manifest) != required or manifest.get("schemaVersion") != S1B_MANIFEST_SCHEMA or manifest.get("status") != "clean":
        raise GeneralNoticeS2ConsumerError("unknown_manifest")
    if manifest.get("eligibleForDownstream") is not False or manifest.get("observationOnly") is not True:
        raise GeneralNoticeS2ConsumerError("unknown_manifest")
    if not isinstance(manifest.get("receipt"), list) or not isinstance(manifest.get("sources"), list):
        raise GeneralNoticeS2ConsumerError("unknown_manifest")
    if len(manifest["sources"]) != manifest["sourceCount"] or manifest["noticeCount"] != len(notices):
        raise GeneralNoticeS2ConsumerError("partial")
    # S1-B names its per-source result field ``result`` (the aggregate
    # manifest itself uses ``status``).  Every selected source must be clean;
    # a partial aggregate is deliberately not forward-processable.
    if any(
        not isinstance(source, Mapping) or source.get("result") != "clean"
        for source in manifest["sources"]
    ):
        raise GeneralNoticeS2ConsumerError("partial")
    receipt_digest = canonical_sha256(manifest["receipt"])
    if manifest.get("batchId") != f"batch-{receipt_digest}":
        raise GeneralNoticeS2ConsumerError("digest_mismatch")
    expected = {(str(row["pstSn"]), str(row["contentHash"])) for row in notices}
    observed: set[tuple[str, str]] = set()
    for row in manifest["receipt"]:
        if not isinstance(row, Mapping) or row.get("result") != "clean":
            raise GeneralNoticeS2ConsumerError("partial")
        hashes = row.get("normalizedNoticeContentHashes")
        if not isinstance(hashes, list):
            raise GeneralNoticeS2ConsumerError("unknown_manifest")
        for entry in hashes:
            if not isinstance(entry, Mapping):
                raise GeneralNoticeS2ConsumerError("unknown_manifest")
            observed.add((str(entry.get("pstSn")), str(entry.get("contentHash"))))
    if expected != observed:
        raise GeneralNoticeS2ConsumerError("digest_mismatch")
    return receipt_digest


def validate_selected_s1_batch(*, state_root: str, batch_id: str) -> SelectedS1Batch:
    """Validate one explicit private S1 batch; never discover a latest batch."""
    state = _require_private_directory(Path(state_root), "mutable_runtime_state_as_input")
    if not isinstance(batch_id, str) or not batch_id.startswith("batch-"):
        raise GeneralNoticeS2ConsumerError("batch_id_invalid")
    batch = state / "batches" / batch_id
    if not _private(batch, "directory") or batch.resolve().parent != (state / "batches").resolve():
        raise GeneralNoticeS2ConsumerError("batch_not_private")
    if batch.name.startswith(".stage-"):
        raise GeneralNoticeS2ConsumerError("staging_directory")
    _reject_symlinked_tree(batch)
    manifest_path = batch / "manifest.json"
    manifest_bytes = manifest_path.read_bytes() if _private(manifest_path, "file") else b""
    manifest = _read_private_json(manifest_path, "unknown_manifest")
    if manifest.get("batchId") != batch_id:
        raise GeneralNoticeS2ConsumerError("digest_mismatch")
    normalized_paths: list[str] = []
    if manifest.get("schemaVersion") == S1A_MANIFEST_SCHEMA:
        normalized_paths = list(manifest.get("normalizedPaths") or [])
        kind = "s1a"
    elif manifest.get("schemaVersion") == S1B_MANIFEST_SCHEMA:
        kind = "s1b"
        for source in manifest.get("sources") or []:
            if not isinstance(source, Mapping):
                raise GeneralNoticeS2ConsumerError("unknown_manifest")
            normalized_paths.extend(source.get("normalizedPaths") or [])
    else:
        raise GeneralNoticeS2ConsumerError("unknown_manifest")
    paths = [_relative_notice_path(value) for value in normalized_paths]
    if len(paths) != len(set(paths)):
        raise GeneralNoticeS2ConsumerError("digest_mismatch")
    notices: list[dict[str, Any]] = []
    for relative in sorted(paths, key=lambda path: str(path).encode("utf-8")):
        path = batch / relative
        notice = _read_private_json(path, "missing_normalized_file")
        if notice.get("schemaVersion") != "noticepilot.normalizedNotice.v0.3":
            raise GeneralNoticeS2ConsumerError("unknown_manifest")
        notices.append(notice)
    notices.sort(key=lambda row: (str(row["noticeId"]).encode("utf-8"), str(row["contentHash"]).encode("utf-8")))
    if kind == "s1a":
        _validate_s1a_manifest(manifest, notices)
        receipt_digest = None
    else:
        receipt_digest = _validate_s1b_manifest(manifest, notices)
    _validate_checkpoint(state, batch_id, kind, manifest)
    return SelectedS1Batch(kind, batch, manifest, _sha256_bytes(manifest_bytes), receipt_digest, tuple(notices))


def _node_reconciliation_input(
    *,
    repository_root: Path,
    normalized_notice: Mapping[str, Any],
    candidate_payload: Mapping[str, Any],
    board_registry: list[dict[str, Any]],
) -> dict[str, Any]:
    module = repository_root / "server/src/domain/adapters/normalizeGeneralNoticeReconciliationInput.js"
    if not module.is_file():
        raise GeneralNoticeS2ConsumerError("adapter_unavailable")
    request = {
        "normalizedNotice": normalized_notice,
        "candidatePayload": candidate_payload,
        "boardRegistry": board_registry,
    }
    try:
        completed = subprocess.run(
            ["node", str(module)], input=_json_line(request), text=True,
            capture_output=True, check=False, timeout=20,
        )
        response = json.loads(completed.stdout.strip())
    except (OSError, subprocess.TimeoutExpired, ValueError) as exc:
        raise GeneralNoticeS2ConsumerError("adapter_unavailable") from exc
    if completed.returncode != 0 or response.get("ok") is not True or not isinstance(response.get("value"), dict):
        raise GeneralNoticeS2ConsumerError("invalid_reconciliation_input")
    return response["value"]


def _json_line(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"


def run_selected_batch(
    *,
    foundation_root: str,
    state_root: str,
    batch_id: str,
    database_url: str,
    now: str | None = None,
    fail_after: str | None = None,
) -> dict[str, Any]:
    foundation = Path(foundation_root)
    if not foundation.is_absolute() or not foundation.is_dir():
        raise GeneralNoticeS2ConsumerError("foundation_root_invalid")
    foundation = foundation.resolve()
    selected = validate_selected_s1_batch(state_root=state_root, batch_id=batch_id)
    deterministic_created_at = str(selected.manifest.get("finishedAt") or "1970-01-01T00:00:00Z")
    board_registry = json.loads((foundation / "configs/knu_board_registry.v0.2.json").read_text(encoding="utf-8"))
    units: list[dict[str, Any]] = []
    for notice in selected.notices:
        candidate_payload = extract_candidates_from_notice(notice)
        # The immutable S1 manifest supplies the reproducible extraction time;
        # the rule generator's wall-clock stamp is not an input identity.
        candidate_payload["extractor"]["createdAt"] = deterministic_created_at
        node_value = _node_reconciliation_input(
            repository_root=foundation.parents[1], normalized_notice=notice,
            candidate_payload=candidate_payload, board_registry=board_registry,
        )
        try:
            unit = validate_reconciliation_input(node_value)
            views = build_publishable_s27_views(node_value, board_registry)
        except GeneralNoticeReconciliationInputError as exc:
            raise GeneralNoticeS2ConsumerError("invalid_reconciliation_input") from exc
        unit["s27Views"] = views
        units.append(unit)
    policy = json.loads((foundation / "configs/noticepilot_cross_notice_reconciliation_policy.v0.3.json").read_text(encoding="utf-8"))
    store = GeneralNoticeS2PostgresOutcomeStore(dsn=database_url, foundation_root=foundation)
    reconciler = GeneralNoticeIncrementalReconciler(policy)
    incoming_views = [view for unit in units for view in unit["s27Views"]]
    outcomes = reconciler.classify(
        incoming_views,
        baseline_views=load_sealed_baseline_views(foundation),
        overlay_views=store.load_overlay_views(),
    )
    outcome_ids = {row["candidateId"] for row in outcomes}
    for unit in units:
        for candidate in unit["candidateUnits"]:
            if candidate["sourceCandidateId"] not in outcome_ids:
                outcomes.append({
                    "schemaVersion": "noticepilot.generalNoticeIncrementalReconciliation.v0.1",
                    "candidateId": candidate["sourceCandidateId"],
                    "disposition": "requires_review",
                    "baselineCalendarEventId": None,
                    "reason": "candidate_requires_review",
                    "reconciliationEvidence": {
                        "schemaVersion": "noticepilot.generalNoticeS2ReconciliationEvidence.v0.1",
                        "candidateId": candidate["sourceCandidateId"],
                        "decisions": [],
                        "searchUniverse": {"baselineCount": 0, "overlayCount": 0},
                    },
                })
    outcomes.sort(key=lambda row: str(row["candidateId"]).encode("utf-8"))
    receipt = build_consumer_receipt(
        producer_batch_id=batch_id,
        producer_manifest_digest=selected.manifest_digest,
        producer_receipt_digest=selected.producer_receipt_digest,
        normalized_notices=selected.notices,
        extraction_version="0.4.4",
        adapter_version="noticepilot.generalNoticeReconciliationInput.v0.1",
        promotion_policy_version="noticepilot.calendarCandidates.v0.4",
        reconciliation_contract_version="noticepilot.generalNoticeIncrementalReconciliation.v0.1",
        ordered_dispositions=[
            {"candidateId": row["candidateId"], "disposition": row["disposition"], "reason": row["reason"]}
            for row in outcomes
        ],
        created_at=deterministic_created_at,
    )
    result = store.persist(receipt=receipt, notice_units=units, outcomes=outcomes, now=now, fail_after=fail_after)
    return {
        "schemaVersion": "noticepilot.generalNoticeS2RunResult.v0.1",
        "status": result.status,
        "receiptId": result.receipt_id,
        "outcomes": list(result.outcomes),
    }


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run the explicit General Notice S2 consumer.")
    commands = parser.add_subparsers(dest="command", required=True)
    run = commands.add_parser("run")
    run.add_argument("--foundation-root", required=True)
    run.add_argument("--state-root", required=True)
    run.add_argument("--batch-id", required=True)
    run.add_argument("--database-url-env", required=True)
    run.add_argument("--confirm-persist", action="store_true")
    migrate = commands.add_parser("migrate")
    migrate.add_argument("--foundation-root", required=True)
    migrate.add_argument("--database-url-env", required=True)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    dsn = os.environ.get(args.database_url_env, "")
    if not dsn:
        print("General Notice S2 command failed.", file=sys.stderr)
        return 1
    try:
        foundation = Path(args.foundation_root).resolve()
        if args.command == "migrate":
            try:
                import psycopg  # type: ignore
            except ImportError as exc:
                raise GeneralNoticeS2ConsumerError("driver_unavailable") from exc
            with psycopg.connect(dsn) as connection:
                applied = apply_migrations(connection, foundation / "migrations/postgresql")
            print(json.dumps({"applied": applied}, ensure_ascii=False, sort_keys=True))
            return 0
        if not args.confirm_persist:
            raise GeneralNoticeS2ConsumerError("confirmation_required")
        result = run_selected_batch(
            foundation_root=args.foundation_root,
            state_root=args.state_root,
            batch_id=args.batch_id,
            database_url=dsn,
        )
        print(json.dumps(result, ensure_ascii=False, sort_keys=True))
        return 0
    except (GeneralNoticeS2ConsumerError, GeneralNoticeOutcomeError, OSError, ValueError):
        print("General Notice S2 command failed.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
