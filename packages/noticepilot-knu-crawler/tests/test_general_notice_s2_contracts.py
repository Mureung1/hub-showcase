from __future__ import annotations

import json
from pathlib import Path
import tempfile
import unittest

from noticepilot_general_notice_incremental_reconciler import GeneralNoticeIncrementalReconciler
from noticepilot_general_notice_postgres_outcomes import build_consumer_receipt
from noticepilot_general_notice_reconciliation_input import (
    GeneralNoticeReconciliationInputError,
    build_publishable_s27_views,
    canonical_sha256,
    validate_reconciliation_input,
)
from noticepilot_general_notice_s2_consumer import (
    GeneralNoticeS2ConsumerError,
    validate_selected_s1_batch,
)

ROOT = Path(__file__).resolve().parents[1]
POLICY = json.loads((ROOT / "configs/noticepilot_cross_notice_reconciliation_policy.v0.3.json").read_text(encoding="utf-8"))
BOARD_REGISTRY = json.loads((ROOT / "configs/knu_board_registry.v0.2.json").read_text(encoding="utf-8"))


def normalized_notice(*, notice_id="knu-504-990001", content_hash="a" * 64):
    board = next(row for row in BOARD_REGISTRY if row["boardId"] == "504")
    return {
        "schemaVersion": "noticepilot.normalizedNotice.v0.3",
        "noticeId": notice_id,
        "institution": "kangwon.ac.kr",
        "sourceSystem": "kangwon.ac.kr public bbs",
        "board": {
            "boardId": board["boardId"], "name": board["name"], "category": board["category"],
            "priority": board["priority"], "aliasBoardIds": board["aliasBoardIds"],
        },
        "sourceUrl": f"https://www.kangwon.ac.kr/ko/bbs/504/detail.do?pstSn={notice_id.rsplit('-', 1)[1]}",
        "pstSn": notice_id.rsplit("-", 1)[1],
        "title": "2031학년도 신청 안내",
        "publishedAt": "2026-07-01",
        "timezone": "Asia/Seoul",
        "campusScope": {
            "sourceLabel": "전체", "campuses": ["all"], "scopeType": "all_campuses",
            "confidence": "high", "source": "title_or_body", "labels": {"all": "전체"},
        },
        "listMetadata": {
            "row_index": 1, "board_id": board["boardId"], "pst_sn": notice_id.rsplit("-", 1)[1],
            "url": f"https://www.kangwon.ac.kr/ko/bbs/{board['boardId']}/detail.do?pstSn={notice_id.rsplit('-', 1)[1]}",
            "title": "2031학년도 신청 안내", "notice_no": "S2-FIXTURE", "campus": "전체",
            "author": "Fixture Office", "published_at": "2026-07-01", "views": "1",
            "is_pinned": False, "parse_source": "table_row",
        },
        "rawHtml": {"path": "raw/details/example.html", "sha256": "b" * 64},
        "extractedText": "학생 신청 마감: 2031. 12. 31.까지",
        "extractedTextChars": len("학생 신청 마감: 2031. 12. 31.까지"),
        "textExtractionStatus": "body_html_extracted",
        "attachments": [], "attachmentCount": 0, "attachmentRequiredForFullExtraction": False,
        "contentHash": content_hash,
        "crawler": {"version": "0.4.4", "userAgent": "fixture", "crawledAt": "2026-07-01T00:00:00Z"},
    }


def raw_candidate(notice, *, candidate_id="cand-knu-504-990001-a", status="auto_confirmed", include=True):
    return {
        "id": candidate_id,
        "uidHint": f"noticepilot-{candidate_id[5:]}@noticepilot.local",
        "sourceNoticeId": notice["noticeId"], "sourceTitle": notice["title"], "sourceUrl": notice["sourceUrl"],
        "noticeType": notice["board"]["category"], "campusScope": notice["campusScope"],
        "eventType": "application_deadline", "targetActor": "student", "title": "신청 마감",
        "dateText": "2026. 8. 3.", "normalizedStart": "2026-08-03", "normalizedEnd": None,
        "isAllDay": True, "evidence": "학생 신청 마감: 2026. 8. 3.까지", "evidenceLineIndex": 0,
        "confidence": "high", "uncertaintyReasons": [], "status": status,
        "includeInCalendarFeed": include, "createdBy": "rule", "reviewedByUser": False,
    }


def reconciliation_input(notice=None, candidate=None):
    notice = notice or normalized_notice()
    candidate = candidate or raw_candidate(notice)
    payload = {
        "schemaVersion": "noticepilot.calendarCandidates.v0.4", "sourceNoticeId": notice["noticeId"],
        "sourceContentHash": notice["contentHash"], "sourceTitle": notice["title"], "sourceUrl": notice["sourceUrl"],
        "timezone": "Asia/Seoul", "sourceCampusScope": notice["campusScope"],
        "extractor": {"version": "0.4.4", "createdAt": "2026-07-01T00:00:00Z", "mode": "rule_based_v1"},
        "candidates": [candidate],
        "summary": {"candidateCount": 1, "autoConfirmedCount": int(candidate["status"] == "auto_confirmed"), "needsReviewCount": int(candidate["status"] == "needs_review"), "calendarFeedIncludedCount": int(candidate["includeInCalendarFeed"])},
    }
    return {
        "schemaVersion": "noticepilot.generalNoticeReconciliationInput.v0.1",
        "normalizedNotice": notice, "candidatePayload": payload,
        "extractionResult": {
            "schemaContractVersion": "noticepilot.domain.v1", "status": "completed",
            "sourceContentHash": notice["contentHash"],
            "calendarEventCandidates": [{"sourceCandidateKey": candidate["id"], "reviewRequired": False}],
        },
        "candidateDispositions": [{"sourceCandidateId": candidate["id"], "disposition": "eligible_for_reconciliation"}],
    }


def view(candidate_id, *, title="신청 마감", marker=None, board="504", start="2026-08-03"):
    source_title = f"{title} {marker}" if marker else title
    return {
        "schemaVersion": "noticepilot.reconciliationCandidateView.v0.1", "candidateId": candidate_id,
        "sourceNoticeId": f"knu-{board}-{candidate_id[-1]}",
        "sourceIdentity": {
            "identityKey": f"kangwon|general_notice|{candidate_id[-1]}", "canonicalBoardCategory": "general_notice",
            "sourcePostId": candidate_id[-1], "observedBoardId": board, "canonicalBoardId": board,
            "boardCanonical": True, "canonicalSourceUrl": f"https://example.test/{board}/{candidate_id[-1]}",
            "observedSourceUrl": f"https://example.test/{board}/{candidate_id[-1]}",
        },
        "publishedAt": "2026-07-01", "sourceTitle": source_title,
        "titleAnalysis": {"relationBaseTitle": title, "decorativeMarkers": [marker] if marker else []},
        "eventProjection": {
            "title": title, "eventType": "deadline", "actionType": None, "temporalRole": "user_action_period",
            "targetActor": "student", "audienceRules": {}, "campusScope": {"campuses": ["chuncheon"]},
            "normalizedStart": start, "normalizedEnd": None, "endDateInclusive": False, "isAllDay": True,
            "timezone": "Asia/Seoul", "feedScopes": ["student_default"],
        },
    }


class GeneralNoticeS2ContractTests(unittest.TestCase):
    def test_reconciliation_input_uses_existing_publishability_and_s27_view(self):
        value = reconciliation_input()
        parsed = validate_reconciliation_input(value)
        self.assertEqual(parsed["candidateUnits"][0]["disposition"], "eligible_for_reconciliation")
        views = build_publishable_s27_views(value, BOARD_REGISTRY)
        self.assertEqual(len(views), 1)
        self.assertEqual(views[0]["candidateState"]["includeInCalendarFeed"], True)

    def test_pending_or_review_mapping_cannot_be_promoted_by_the_new_boundary(self):
        value = reconciliation_input()
        value["candidateDispositions"][0]["disposition"] = "requires_review"
        with self.assertRaises(GeneralNoticeReconciliationInputError):
            validate_reconciliation_input(value)

    def test_provenance_or_duplicate_candidate_identity_rejects_the_whole_unit(self):
        value = reconciliation_input()
        value["candidatePayload"]["candidates"][0]["sourceNoticeId"] = "knu-504-other"
        with self.assertRaises(GeneralNoticeReconciliationInputError):
            validate_reconciliation_input(value)

        duplicate = reconciliation_input()
        duplicate["candidatePayload"]["candidates"].append(
            dict(duplicate["candidatePayload"]["candidates"][0])
        )
        with self.assertRaises(GeneralNoticeReconciliationInputError):
            validate_reconciliation_input(duplicate)

    def test_receipt_is_deterministic_and_confines_idempotency_to_contract_inputs(self):
        notice = normalized_notice()
        kwargs = dict(
            producer_batch_id="batch-" + "c" * 64,
            producer_manifest_digest="d" * 64,
            producer_receipt_digest=None,
            normalized_notices=[notice], extraction_version="0.4.4",
            adapter_version="noticepilot.generalNoticeReconciliationInput.v0.1",
            promotion_policy_version="noticepilot.calendarCandidates.v0.4",
            reconciliation_contract_version="noticepilot.generalNoticeIncrementalReconciliation.v0.1",
            ordered_dispositions=[{"candidateId": "cand-x", "disposition": "requires_review", "reason": "fixture"}],
            created_at="2026-07-01T00:00:00Z",
        )
        first = build_consumer_receipt(**kwargs)
        second = build_consumer_receipt(**kwargs)
        self.assertEqual(first["idempotencyKey"], second["idempotencyKey"])
        self.assertEqual(first["receiptId"], second["receiptId"])
        self.assertEqual(first["normalizedNoticeIds"], [notice["noticeId"]])
        self.assertEqual(first["normalizedNoticeContentHashes"], [notice["contentHash"]])

    def test_incremental_reconciler_limits_baseline_match_to_evidence(self):
        reconciler = GeneralNoticeIncrementalReconciler(POLICY)
        incoming = view("cand-new-1")
        baseline = {"origin": "baseline", "calendarEventId": "evt_" + "a" * 32, "view": view("cand-old-1", board="715")}
        result = reconciler.classify([incoming], baseline_views=[baseline], overlay_views=[])
        self.assertEqual(result[0]["disposition"], "baseline_match_evidence")
        self.assertEqual(result[0]["baselineCalendarEventId"], "evt_" + "a" * 32)

    def test_ambiguous_relation_is_review_only_and_no_match_is_creatable(self):
        reconciler = GeneralNoticeIncrementalReconciler(POLICY)
        ambiguous = reconciler.classify(
            [view("cand-new-2", marker="수정")],
            baseline_views=[{"origin": "baseline", "calendarEventId": "evt_" + "b" * 32, "view": view("cand-old-2")}], overlay_views=[],
        )
        self.assertEqual(ambiguous[0]["disposition"], "requires_review")
        no_match = reconciler.classify([view("cand-new-3")], baseline_views=[], overlay_views=[])
        self.assertEqual(no_match[0]["disposition"], "created_new_event")

        unrelated = reconciler.classify(
            [view("cand-new-4", title="신청 마감")],
            baseline_views=[{"origin": "baseline", "calendarEventId": "evt_" + "c" * 32, "view": view("cand-old-z", title="완전히 다른 일정")}],
            overlay_views=[],
        )
        self.assertEqual(unrelated[0]["disposition"], "created_new_event")
        self.assertEqual(unrelated[0]["reconciliationEvidence"]["decisions"], [])

    def _write_s1a_batch(self, root: Path, *, status="clean") -> str:
        root.chmod(0o700)
        batches = root / "batches"
        batches.mkdir(mode=0o700)
        notice = normalized_notice()
        semantic = [{"pstSn": notice["pstSn"], "contentHash": notice["contentHash"]}]
        batch_id = "batch-" + canonical_sha256(semantic)
        batch = batches / batch_id
        (batch / "normalized/notices").mkdir(parents=True, mode=0o700)
        batch.chmod(0o700)
        normalized_path = batch / f"normalized/notices/{notice['noticeId']}.json"
        normalized_path.write_text(json.dumps(notice), encoding="utf-8")
        normalized_path.chmod(0o600)
        manifest = {
            "schemaVersion": "noticepilot.routeS.batchManifest.v1", "batchId": batch_id, "status": status,
            "institutionId": "kangwon", "boardId": "504", "startedAt": "2026-07-01T00:00:00Z", "finishedAt": "2026-07-01T00:00:00Z",
            "attemptedNoticeCount": 1, "successfulNoticeCount": 1, "failedNoticeCount": 0,
            "changedNoticeCount": 1, "unchangedNoticeCount": 0,
            "normalizedPaths": [f"normalized/notices/{notice['noticeId']}.json"], "failureReasonCodes": [],
            "integrity": {"algorithm": "sha256", "listHtmlSha256": "e" * 64, "normalizedContentHashes": {notice["pstSn"]: notice["contentHash"]}},
            "eligibleForDownstream": status == "clean",
        }
        manifest_path = batch / "manifest.json"
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        manifest_path.chmod(0o600)
        checkpoint = {
            "schemaVersion": "noticepilot.routeS.checkpoint.v1", "institutionId": "kangwon", "boardId": "504",
            "sourceNoticeContentHashes": {notice["pstSn"]: notice["contentHash"]}, "lastCleanBatchId": batch_id, "updatedAt": "2026-07-01T00:00:00Z",
        }
        checkpoint_path = root / "checkpoint.json"
        checkpoint_path.write_text(json.dumps(checkpoint), encoding="utf-8")
        checkpoint_path.chmod(0o600)
        return batch_id

    def test_explicit_clean_private_batch_is_accepted_and_partial_or_symlink_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            batch_id = self._write_s1a_batch(root)
            selected = validate_selected_s1_batch(state_root=str(root), batch_id=batch_id)
            self.assertEqual(selected.kind, "s1a")
            self.assertEqual(len(selected.notices), 1)
            normalized_path = root / "batches" / batch_id / "normalized/notices/knu-504-990001.json"
            normalized_path.unlink()
            normalized_path.symlink_to("/tmp/nope")
            with self.assertRaisesRegex(GeneralNoticeS2ConsumerError, "symlinked_input"):
                validate_selected_s1_batch(state_root=str(root), batch_id=batch_id)

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            batch_id = self._write_s1a_batch(root, status="partial")
            with self.assertRaises(GeneralNoticeS2ConsumerError):
                validate_selected_s1_batch(state_root=str(root), batch_id=batch_id)

    def test_aggregate_clean_s1b_is_forward_processable_but_partial_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            root.chmod(0o700)
            batches = root / "batches"
            batches.mkdir(mode=0o700)
            notice = normalized_notice()
            receipt = [{
                "sourceId": "kangwon:504", "boardId": "504", "result": "clean",
                "selectedPstSns": [notice["pstSn"]], "listedPstSns": [notice["pstSn"]],
                "normalizedNoticeContentHashes": [{"pstSn": notice["pstSn"], "contentHash": notice["contentHash"]}],
            }]
            batch_id = "batch-" + canonical_sha256(receipt)
            batch = batches / batch_id
            (batch / "normalized/notices").mkdir(parents=True, mode=0o700)
            batch.chmod(0o700)
            notice_path = batch / f"normalized/notices/{notice['noticeId']}.json"
            notice_path.write_text(json.dumps(notice), encoding="utf-8")
            notice_path.chmod(0o600)
            manifest = {
                "schemaVersion": "noticepilot.routeS.repeatableBatchManifest.v1",
                "batchId": batch_id, "status": "clean", "institutionId": "kangwon.ac.kr",
                "sourceCount": 1, "noticeCount": 1, "changedNoticeCount": 1,
                "eligibleForDownstream": False, "observationOnly": True, "receipt": receipt,
                "sources": [{
                    "sourceId": "kangwon:504", "boardId": "504", "result": "clean",
                    "normalizedPaths": [f"normalized/notices/{notice['noticeId']}.json"],
                }],
            }
            manifest_path = batch / "manifest.json"
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
            manifest_path.chmod(0o600)
            checkpoint = {
                "schemaVersion": "noticepilot.routeS.repeatableCheckpoint.v1",
                "institutionId": "kangwon.ac.kr",
                "sourceStates": {"kangwon:504": {"lastCleanBatchId": batch_id}},
            }
            checkpoint_path = root / "checkpoint.json"
            checkpoint_path.write_text(json.dumps(checkpoint), encoding="utf-8")
            checkpoint_path.chmod(0o600)
            selected = validate_selected_s1_batch(state_root=str(root), batch_id=batch_id)
            self.assertEqual(selected.kind, "s1b")
            self.assertEqual(selected.producer_receipt_digest, canonical_sha256(receipt))

            manifest["sources"][0]["result"] = "partial"
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
            manifest_path.chmod(0o600)
            with self.assertRaisesRegex(GeneralNoticeS2ConsumerError, "partial"):
                validate_selected_s1_batch(state_root=str(root), batch_id=batch_id)


if __name__ == "__main__":
    unittest.main()
