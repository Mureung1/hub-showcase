#!/usr/bin/env python3
"""Incremental orchestration over the unchanged S27 view and reconciler.

This module never invokes the complete snapshot materializer.  It classifies
only the restricted v0.1 outcomes: a new event for an unambiguous no-match,
review-only evidence for ambiguity, and evidence-only treatment for a sealed
baseline match.
"""
from __future__ import annotations

from copy import deepcopy
import hashlib
import json
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

from noticepilot_cross_notice_reconciler import CrossNoticeReconciler
from noticepilot_reconciliation_candidate_view import (
    ReconciliationViewError,
    build_reconciliation_candidate_view,
    load_board_registry,
)

OUTCOME_SCHEMA_VERSION = "noticepilot.generalNoticeIncrementalReconciliation.v0.1"


class IncrementalReconciliationError(ValueError):
    pass


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    try:
        return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    except (OSError, ValueError) as exc:
        raise IncrementalReconciliationError(f"invalid immutable baseline artifact: {path.name}") from exc


def _pair_id(left_id: str, right_id: str) -> str:
    digest = hashlib.sha256("\x00".join(sorted((left_id, right_id))).encode("utf-8")).hexdigest()[:32]
    return f"gns2pair_{digest}"


def _candidate_sort_key(row: Mapping[str, Any]) -> tuple[bytes, bytes]:
    return (str(row["sourceNoticeId"]).encode("utf-8"), str(row["candidateId"]).encode("utf-8"))


def _is_s27_relation_candidate(left: Mapping[str, Any], right: Mapping[str, Any]) -> bool:
    """Select only plausible pair inputs for the unchanged S27 evaluator.

    S27 deliberately returns ``needs_review`` for an arbitrary unrelated
    pair: it is a pairwise relation authority, not a global no-match search
    engine.  The incremental consumer therefore searches on the two existing
    candidate-view identities that can establish a relation input: canonical
    source identity or S27's already-derived relation base title.  This does
    not decide a relation or merge on title/date; every selected pair still
    goes through the unchanged S27 evaluator.
    """
    return (
        left["sourceIdentity"]["identityKey"] == right["sourceIdentity"]["identityKey"]
        or left["titleAnalysis"]["relationBaseTitle"] == right["titleAnalysis"]["relationBaseTitle"]
    )


def load_sealed_baseline_views(root: Path) -> list[dict[str, Any]]:
    """Read baseline candidates as immutable reconciliation search evidence."""
    root = Path(root)
    documents = {
        str(row.get("sourceNoticeId")): row
        for row in _read_jsonl(root / "baseline/layered-s26-v1/candidates/notice-candidate-documents.jsonl")
    }
    assignments = {
        str(row.get("candidateId")): str(row.get("calendarEventId"))
        for row in _read_jsonl(root / "registry/s27c-v1/candidate-event-assignments.jsonl")
    }
    board_registry = load_board_registry(root / "configs/knu_board_registry.v0.2.json")
    views: list[dict[str, Any]] = []
    for candidate in _read_jsonl(root / "baseline/layered-s26-v1/candidates/layered-candidates.jsonl"):
        if candidate.get("includeInCalendarFeed") is not True:
            continue
        notice = documents.get(str(candidate.get("sourceNoticeId")))
        if notice is None:
            raise IncrementalReconciliationError("baseline candidate is missing immutable notice evidence")
        try:
            view = build_reconciliation_candidate_view(candidate, notice, board_registry)
        except ReconciliationViewError as exc:
            raise IncrementalReconciliationError("baseline candidate view is invalid") from exc
        event_id = assignments.get(str(view["candidateId"]))
        if not event_id:
            # An unassigned publishable baseline candidate is not an active event
            # and must not act as an event match candidate in the overlay.
            continue
        views.append({"origin": "baseline", "calendarEventId": event_id, "view": view})
    return sorted(views, key=lambda item: _candidate_sort_key(item["view"]))


class GeneralNoticeIncrementalReconciler:
    def __init__(self, policy: Mapping[str, Any]) -> None:
        self._reconciler = CrossNoticeReconciler(deepcopy(dict(policy)))

    def classify(
        self,
        incoming_views: Iterable[Mapping[str, Any]],
        *,
        baseline_views: Sequence[Mapping[str, Any]],
        overlay_views: Sequence[Mapping[str, Any]],
    ) -> list[dict[str, Any]]:
        universe = [deepcopy(dict(item)) for item in [*baseline_views, *overlay_views]]
        outcomes: list[dict[str, Any]] = []
        for raw_view in sorted((deepcopy(dict(item)) for item in incoming_views), key=_candidate_sort_key):
            candidate_id = str(raw_view["candidateId"])
            decisions: list[dict[str, Any]] = []
            matches: list[dict[str, Any]] = []
            for existing in sorted(universe, key=lambda item: _candidate_sort_key(item["view"])):
                # An exact retry can see its already-committed overlay row
                # before the receipt idempotency check.  It is not a relation
                # pair; persistence will prove the receipt is identical.
                if raw_view["candidateId"] == existing["view"]["candidateId"]:
                    continue
                if not _is_s27_relation_candidate(raw_view, existing["view"]):
                    continue
                decision = self._reconciler.reconcile_pair(
                    raw_view,
                    existing["view"],
                    pair_id=_pair_id(candidate_id, str(existing["view"]["candidateId"])),
                )
                decisions.append(decision)
                if decision["decisionStatus"] == "approved" and decision["mergeAllowed"]:
                    matches.append({"kind": "approved", "existing": existing, "decision": decision})
                elif decision["relation"] != "distinct":
                    # An approved relation without an approved canonical choice
                    # is still insufficient evidence for an event mutation.
                    matches.append({"kind": "ambiguous", "existing": existing, "decision": decision})

            ambiguous = [item for item in matches if item["kind"] == "ambiguous"]
            approved = [item for item in matches if item["kind"] == "approved"]
            if ambiguous:
                disposition = "requires_review"
                target_event = None
                reason = "ambiguous_s27_relation"
            elif approved:
                baseline = [item for item in approved if item["existing"].get("origin") == "baseline"]
                disposition = "baseline_match_evidence" if baseline else "requires_review"
                target_event = str(baseline[0]["existing"]["calendarEventId"]) if baseline else None
                reason = "baseline_match_revision_deferred" if baseline else "overlay_revision_deferred"
            else:
                disposition = "created_new_event"
                target_event = None
                reason = "unambiguous_no_match"

            outcome = {
                "schemaVersion": OUTCOME_SCHEMA_VERSION,
                "candidateId": candidate_id,
                "disposition": disposition,
                "baselineCalendarEventId": target_event,
                "reason": reason,
                "reconciliationEvidence": {
                    "schemaVersion": "noticepilot.generalNoticeS2ReconciliationEvidence.v0.1",
                    "candidateId": candidate_id,
                    "decisions": decisions,
                    "searchUniverse": {
                        "baselineCount": len(baseline_views),
                        "overlayCount": len(overlay_views),
                    },
                },
            }
            outcomes.append(outcome)
            # A no-match created in this same transaction is not immediately
            # eligible for another mutation in v0.1.  Later candidates seeing it
            # are conservatively review-only rather than merged automatically.
            if disposition == "created_new_event":
                universe.append({"origin": "incoming", "calendarEventId": None, "view": raw_view})
        return sorted(outcomes, key=lambda item: item["candidateId"].encode("utf-8"))
