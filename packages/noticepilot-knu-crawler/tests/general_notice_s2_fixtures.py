from __future__ import annotations

import json
from pathlib import Path

from noticepilot_general_notice_reconciliation_input import canonical_sha256

ROOT = Path(__file__).resolve().parents[1]
BOARD_REGISTRY = json.loads((ROOT / "configs/knu_board_registry.v0.2.json").read_text(encoding="utf-8"))


def normalized_notice(*, notice_id="knu-504-990001", content_hash="a" * 64):
    board = next(row for row in BOARD_REGISTRY if row["boardId"] == "504")
    return {
        "schemaVersion": "noticepilot.normalizedNotice.v0.3",
        "noticeId": notice_id,
        "institution": "kangwon.ac.kr",
        "sourceSystem": "kangwon.ac.kr public bbs",
        "board": {"boardId": board["boardId"], "name": board["name"], "category": board["category"], "priority": board["priority"], "aliasBoardIds": board["aliasBoardIds"]},
        "sourceUrl": f"https://www.kangwon.ac.kr/ko/bbs/504/detail.do?pstSn={notice_id.rsplit('-', 1)[1]}",
        "pstSn": notice_id.rsplit("-", 1)[1], "title": "2031학년도 신청 안내", "publishedAt": "2026-07-01", "timezone": "Asia/Seoul",
        "campusScope": {"sourceLabel": "전체", "campuses": ["all"], "scopeType": "all_campuses", "confidence": "high", "source": "title_or_body", "labels": {"all": "전체"}},
        "listMetadata": {"row_index": 1, "board_id": board["boardId"], "pst_sn": notice_id.rsplit("-", 1)[1], "url": f"https://www.kangwon.ac.kr/ko/bbs/{board['boardId']}/detail.do?pstSn={notice_id.rsplit('-', 1)[1]}", "title": "2031학년도 신청 안내", "notice_no": "S2-FIXTURE", "campus": "전체", "author": "Fixture Office", "published_at": "2026-07-01", "views": "1", "is_pinned": False, "parse_source": "table_row"},
        "rawHtml": {"path": "raw/details/example.html", "sha256": "b" * 64},
        "extractedText": "학생 신청 마감: 2031. 12. 31.까지", "extractedTextChars": len("학생 신청 마감: 2031. 12. 31.까지"),
        "textExtractionStatus": "body_html_extracted", "attachments": [], "attachmentCount": 0, "attachmentRequiredForFullExtraction": False,
        "contentHash": content_hash, "crawler": {"version": "0.4.4", "userAgent": "fixture", "crawledAt": "2026-07-01T00:00:00Z"},
    }


def raw_candidate(notice, *, candidate_id="cand-knu-504-990001-a", status="auto_confirmed", include=True):
    return {"id": candidate_id, "uidHint": f"noticepilot-{candidate_id[5:]}@noticepilot.local", "sourceNoticeId": notice["noticeId"], "sourceTitle": notice["title"], "sourceUrl": notice["sourceUrl"], "noticeType": notice["board"]["category"], "campusScope": notice["campusScope"], "eventType": "application_deadline", "targetActor": "student", "title": "신청 마감", "dateText": "2026. 8. 3.", "normalizedStart": "2026-08-03", "normalizedEnd": None, "isAllDay": True, "evidence": "학생 신청 마감: 2026. 8. 3.까지", "evidenceLineIndex": 0, "confidence": "high", "uncertaintyReasons": [], "status": status, "includeInCalendarFeed": include, "createdBy": "rule", "reviewedByUser": False}


def reconciliation_input(notice=None, candidate=None):
    notice = notice or normalized_notice()
    candidate = candidate or raw_candidate(notice)
    payload = {"schemaVersion": "noticepilot.calendarCandidates.v0.4", "sourceNoticeId": notice["noticeId"], "sourceContentHash": notice["contentHash"], "sourceTitle": notice["title"], "sourceUrl": notice["sourceUrl"], "timezone": "Asia/Seoul", "sourceCampusScope": notice["campusScope"], "extractor": {"version": "0.4.4", "createdAt": "2026-07-01T00:00:00Z", "mode": "rule_based_v1"}, "candidates": [candidate], "summary": {"candidateCount": 1, "autoConfirmedCount": int(candidate["status"] == "auto_confirmed"), "needsReviewCount": int(candidate["status"] == "needs_review"), "calendarFeedIncludedCount": int(candidate["includeInCalendarFeed"])}}
    return {"schemaVersion": "noticepilot.generalNoticeReconciliationInput.v0.1", "normalizedNotice": notice, "candidatePayload": payload, "extractionResult": {"schemaContractVersion": "noticepilot.domain.v1", "status": "completed", "sourceContentHash": notice["contentHash"], "calendarEventCandidates": [{"sourceCandidateKey": candidate["id"], "reviewRequired": False}]}, "candidateDispositions": [{"sourceCandidateId": candidate["id"], "disposition": "eligible_for_reconciliation"}]}


def write_s1a_batch(root: Path, *, status="clean") -> str:
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
    manifest = {"schemaVersion": "noticepilot.routeS.batchManifest.v1", "batchId": batch_id, "status": status, "institutionId": "kangwon", "boardId": "504", "startedAt": "2026-07-01T00:00:00Z", "finishedAt": "2026-07-01T00:00:00Z", "attemptedNoticeCount": 1, "successfulNoticeCount": 1, "failedNoticeCount": 0, "changedNoticeCount": 1, "unchangedNoticeCount": 0, "normalizedPaths": [f"normalized/notices/{notice['noticeId']}.json"], "failureReasonCodes": [], "integrity": {"algorithm": "sha256", "listHtmlSha256": "e" * 64, "normalizedContentHashes": {notice["pstSn"]: notice["contentHash"]}}, "eligibleForDownstream": status == "clean"}
    manifest_path = batch / "manifest.json"
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
    manifest_path.chmod(0o600)
    checkpoint = {"schemaVersion": "noticepilot.routeS.checkpoint.v1", "institutionId": "kangwon", "boardId": "504", "sourceNoticeContentHashes": {notice["pstSn"]: notice["contentHash"]}, "lastCleanBatchId": batch_id, "updatedAt": "2026-07-01T00:00:00Z"}
    checkpoint_path = root / "checkpoint.json"
    checkpoint_path.write_text(json.dumps(checkpoint), encoding="utf-8")
    checkpoint_path.chmod(0o600)
    return batch_id
