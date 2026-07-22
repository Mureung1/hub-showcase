#!/usr/bin/env python3
"""Versioned S2 boundary from a verified S1 notice to existing S27 views.

The module owns only provenance binding and disposition.  Calendar candidate
generation, candidate-to-ExtractionResult mapping, promotion, and S27 view
construction remain owned by their existing modules.
"""
from __future__ import annotations

from copy import deepcopy
import hashlib
import json
import re
from typing import Any, Mapping, Sequence

from noticepilot_reconciliation_candidate_view import (
    ReconciliationViewError,
    build_reconciliation_candidate_view,
)

SCHEMA_VERSION = "noticepilot.generalNoticeReconciliationInput.v0.1"
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


class GeneralNoticeReconciliationInputError(ValueError):
    pass


def canonical_json_bytes(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def canonical_sha256(value: Any) -> str:
    return hashlib.sha256(canonical_json_bytes(value)).hexdigest()


def _require_hash(value: Any, field: str) -> str:
    if not isinstance(value, str) or SHA256_RE.fullmatch(value) is None:
        raise GeneralNoticeReconciliationInputError(f"{field} must be lowercase SHA-256")
    return value


def _require_mapping(value: Any, field: str) -> dict[str, Any]:
    if not isinstance(value, Mapping):
        raise GeneralNoticeReconciliationInputError(f"{field} must be an object")
    return deepcopy(dict(value))


def validate_normalized_notice(notice: Mapping[str, Any]) -> dict[str, Any]:
    value = _require_mapping(notice, "normalizedNotice")
    required = {
        "schemaVersion", "noticeId", "institution", "sourceSystem", "board", "sourceUrl",
        "pstSn", "title", "publishedAt", "timezone", "campusScope", "listMetadata",
        "rawHtml", "extractedText", "extractedTextChars", "textExtractionStatus", "attachments",
        "attachmentCount", "attachmentRequiredForFullExtraction", "contentHash", "crawler",
    }
    if set(value) != required or value.get("schemaVersion") != "noticepilot.normalizedNotice.v0.3":
        raise GeneralNoticeReconciliationInputError("normalized notice schema mismatch")
    if not isinstance(value["noticeId"], str) or not value["noticeId"]:
        raise GeneralNoticeReconciliationInputError("normalized noticeId is required")
    if not isinstance(value["board"], Mapping) or not str(value["board"].get("boardId") or ""):
        raise GeneralNoticeReconciliationInputError("normalized notice board is required")
    if not isinstance(value["pstSn"], str) or not value["pstSn"].isdigit():
        raise GeneralNoticeReconciliationInputError("normalized pstSn is invalid")
    _require_hash(value["contentHash"], "normalized contentHash")
    if not isinstance(value["extractedText"], str) or value["extractedTextChars"] != len(value["extractedText"]):
        raise GeneralNoticeReconciliationInputError("normalized extracted text invariant failed")
    return value


def validate_candidate_payload(payload: Mapping[str, Any], notice: Mapping[str, Any]) -> dict[str, Any]:
    value = _require_mapping(payload, "candidatePayload")
    required = {
        "schemaVersion", "sourceNoticeId", "sourceContentHash", "sourceTitle", "sourceUrl",
        "timezone", "sourceCampusScope", "extractor", "candidates", "summary",
    }
    if set(value) != required or value.get("schemaVersion") != "noticepilot.calendarCandidates.v0.4":
        raise GeneralNoticeReconciliationInputError("candidate payload schema mismatch")
    if value["sourceNoticeId"] != notice["noticeId"] or value["sourceContentHash"] != notice["contentHash"]:
        raise GeneralNoticeReconciliationInputError("candidate payload notice provenance mismatch")
    _require_hash(value["sourceContentHash"], "candidate payload sourceContentHash")
    if not isinstance(value["candidates"], list):
        raise GeneralNoticeReconciliationInputError("candidate payload candidates must be an array")
    candidate_ids: set[str] = set()
    for candidate in value["candidates"]:
        if not isinstance(candidate, Mapping):
            raise GeneralNoticeReconciliationInputError("candidate must be an object")
        candidate_id = candidate.get("id")
        if not isinstance(candidate_id, str) or not candidate_id or candidate_id in candidate_ids:
            raise GeneralNoticeReconciliationInputError("candidate identity must be unique")
        candidate_ids.add(candidate_id)
        if candidate.get("sourceNoticeId") != notice["noticeId"]:
            raise GeneralNoticeReconciliationInputError("candidate source notice mismatch")
        if candidate.get("status") not in {"auto_confirmed", "needs_review"}:
            raise GeneralNoticeReconciliationInputError("candidate promotion status is invalid")
        if not isinstance(candidate.get("includeInCalendarFeed"), bool):
            raise GeneralNoticeReconciliationInputError("candidate feed inclusion must be boolean")
    return value


def validate_reconciliation_input(value: Mapping[str, Any]) -> dict[str, Any]:
    result = _require_mapping(value, "generalNoticeReconciliationInput")
    required = {
        "schemaVersion", "normalizedNotice", "candidatePayload", "extractionResult", "candidateDispositions",
    }
    if set(result) != required or result.get("schemaVersion") != SCHEMA_VERSION:
        raise GeneralNoticeReconciliationInputError("general notice reconciliation input schema mismatch")
    notice = validate_normalized_notice(result["normalizedNotice"])
    payload = validate_candidate_payload(result["candidatePayload"], notice)
    extraction = _require_mapping(result["extractionResult"], "extractionResult")
    if extraction.get("schemaContractVersion") != "noticepilot.domain.v1" or extraction.get("status") != "completed":
        raise GeneralNoticeReconciliationInputError("ExtractionResult contract mismatch")
    if extraction.get("sourceContentHash") != notice["contentHash"]:
        raise GeneralNoticeReconciliationInputError("ExtractionResult content hash mismatch")
    extraction_candidates = extraction.get("calendarEventCandidates")
    if not isinstance(extraction_candidates, list):
        raise GeneralNoticeReconciliationInputError("ExtractionResult candidates must be an array")
    extracted_by_key = {candidate.get("sourceCandidateKey"): candidate for candidate in extraction_candidates if isinstance(candidate, Mapping)}
    if len(extracted_by_key) != len(extraction_candidates):
        raise GeneralNoticeReconciliationInputError("ExtractionResult source candidate identity must be unique")
    dispositions = result["candidateDispositions"]
    if not isinstance(dispositions, list) or len(dispositions) != len(payload["candidates"]):
        raise GeneralNoticeReconciliationInputError("candidate dispositions must cover every candidate")
    disposition_by_id: dict[str, str] = {}
    for disposition in dispositions:
        if not isinstance(disposition, Mapping):
            raise GeneralNoticeReconciliationInputError("candidate disposition must be object")
        candidate_id = disposition.get("sourceCandidateId")
        state = disposition.get("disposition")
        if candidate_id in disposition_by_id or state not in {"eligible_for_reconciliation", "requires_review"}:
            raise GeneralNoticeReconciliationInputError("candidate disposition is invalid")
        disposition_by_id[candidate_id] = state
    units: list[dict[str, Any]] = []
    for raw in payload["candidates"]:
        candidate_id = raw["id"]
        extracted = extracted_by_key.get(candidate_id)
        if extracted is None:
            raise GeneralNoticeReconciliationInputError("ExtractionResult candidate mapping missing")
        expected_eligible = (
            raw["status"] == "auto_confirmed"
            and raw["includeInCalendarFeed"] is True
            and extracted.get("reviewRequired") is False
        )
        actual = disposition_by_id.get(candidate_id)
        if actual != ("eligible_for_reconciliation" if expected_eligible else "requires_review"):
            raise GeneralNoticeReconciliationInputError("candidate disposition does not match existing policy")
        units.append({
            "sourceCandidateId": candidate_id,
            "disposition": actual,
            "rawCandidate": deepcopy(dict(raw)),
            "extractionCandidate": deepcopy(dict(extracted)),
        })
    units.sort(key=lambda item: item["sourceCandidateId"].encode("utf-8"))
    return {
        "schemaVersion": SCHEMA_VERSION,
        "normalizedNotice": notice,
        "candidatePayload": payload,
        "extractionResult": extraction,
        "candidateUnits": units,
    }


def build_publishable_s27_views(
    reconciliation_input: Mapping[str, Any],
    board_registry: Sequence[dict[str, Any]],
) -> list[dict[str, Any]]:
    parsed = validate_reconciliation_input(reconciliation_input)
    views: list[dict[str, Any]] = []
    # S27's legacy consumer-owned notice document names these two producer
    # fields differently.  This is a narrow field-name adapter, not a second
    # normalized-notice parser or a mutation of either source contract.
    s27_notice = {
        **parsed["normalizedNotice"],
        "sourceNoticeId": parsed["normalizedNotice"]["noticeId"],
        "sourceContentHash": parsed["normalizedNotice"]["contentHash"],
    }
    for unit in parsed["candidateUnits"]:
        if unit["disposition"] != "eligible_for_reconciliation":
            continue
        try:
            views.append(build_reconciliation_candidate_view(
                unit["rawCandidate"], s27_notice, list(board_registry)
            ))
        except ReconciliationViewError as exc:
            raise GeneralNoticeReconciliationInputError("candidate cannot enter S27") from exc
    return sorted(views, key=lambda view: (view["sourceNoticeId"].encode("utf-8"), view["candidateId"].encode("utf-8")))
