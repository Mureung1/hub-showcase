"""최종 30건 데모 시드 CSV의 완전성과 콘텐츠 품질 기준."""

from __future__ import annotations

import csv
import importlib
import json
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

from scripts import build_demo_seed as build_seed


ROOT = Path(__file__).resolve().parents[2] / "data" / "demo_seed"


def _rows(table: str) -> list[dict[str, str]]:
    with (ROOT / f"{table}.csv").open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def test_final_seed_has_thirty_postings_per_job_and_expected_periods() -> None:
    postings = _rows("postings")
    versions = {row["posting_id"]: row for row in _rows("posting_versions")}
    by_job: dict[str, list[dict[str, str]]] = defaultdict(list)
    for posting in postings:
        by_job[posting["job_role_id"]].append(versions[posting["posting_id"]])

    assert set(by_job) == set(build_seed.JOB_PARTS)
    assert len(postings) == 270
    for job, rows in by_job.items():
        assert len(rows) == 30, job
        recent = [row for row in rows if datetime.fromisoformat(row["posted_at"]).year == 2026]
        previous = [row for row in rows if datetime.fromisoformat(row["posted_at"]).year < 2026]
        assert (len(recent), len(previous)) == (18, 12), job
        assert Counter(row["entry_label"] for row in recent) == {
            "entry_junior": 10,
            "experienced": 8,
        }
        assert Counter(row["entry_label"] for row in previous) == {
            "entry_junior": 6,
            "experienced": 6,
        }
        assert sum(row["closed_at"] == r"\N" for row in rows) == 6, job
        assert all(row["closed_at"] != r"\N" for row in previous), job


def test_final_outputs_have_112_rows_per_job_and_keep_statistics_sections() -> None:
    rows = _rows("analysis_outputs")
    required_sections = {
        "scope_expansion",
        "advanced",
        "combos",
        "reality",
        "cluster_axes",
        "items",
    }
    assert len(rows) == 1008
    for job in build_seed.JOB_PARTS:
        mine = [row for row in rows if row["job_role_id"] == job]
        assert len(mine) == 112, job
        assert Counter(row["output_type"] for row in mine) == {
            "statistics": 1,
            "interpretation": 37,
            "strategy": 37,
            "roadmap": 37,
        }
        statistics = json.loads(
            next(row["payload"] for row in mine if row["output_type"] == "statistics")
        )
        assert required_sections <= statistics.keys(), job
        assert statistics["meta"]["snapshots"]["recent"]["n"] == 18, job
        assert statistics["meta"]["snapshots"]["prev"]["n"] == 12, job
        cluster_rows = statistics["cluster_axes"]["rows"]
        assert [row["n"] for row in cluster_rows] == [5] * 6, job
        for cluster in cluster_rows:
            for cell in cluster["cells"]:
                value = cell["pct"]
                expected = (
                    "—" if value is None
                    else "약" if value <= 20
                    else "중" if value < 100
                    else "강"
                )
                assert cell["level"] == expected, (job, cluster["cluster"], cell)


def test_all_job_parts_use_the_same_heatmap_boundaries() -> None:
    for job in build_seed.JOB_PARTS:
        module = importlib.import_module(f"scripts.demo_seed.{job}")
        assert module.axis_level(None) == "—", job
        assert module.axis_level(20) == "약", job
        assert module.axis_level(21) == "중", job
        assert module.axis_level(99) == "중", job
        assert module.axis_level(100) == "강", job


def test_generated_user_copy_uses_poster_terms() -> None:
    exposed_tables = (
        "analysis_claims",
        "analysis_outputs",
        "checklist_items",
        "roadmap_items",
        "user_posting_analyses",
        "wiki_revisions",
    )
    forbidden = ("기준선", "베이스라인", "편차")
    for table in exposed_tables:
        for row in _rows(table):
            text = " ".join(row.values())
            for phrase in forbidden:
                assert phrase not in text, (table, phrase)
            assert "추가 요구 · 추가 요구" not in text, table


def test_small_cluster_statistics_are_marked_low_confidence() -> None:
    cluster_facts = [
        row for row in _rows("statistics_facts") if row["scope_level"] == "cluster"
    ]
    assert cluster_facts
    assert {row["sample_status"] for row in cluster_facts} == {"low_confidence"}


def test_all_postings_have_summary_and_three_interpretation_types() -> None:
    """270개 공고 모두 요약과 직무 공통 기대치·숨은 의미·회사 특징을 제공한다."""
    posting_outputs = [
        row
        for row in _rows("analysis_outputs")
        if row["output_type"] == "interpretation" and row["scope_level"] == "posting"
    ]
    assert len(posting_outputs) == 270

    summaries_by_job: dict[str, list[str]] = defaultdict(list)
    for row in posting_outputs:
        posting = json.loads(row["payload"])["posting"]
        summary = posting["summary"]
        assert summary["title"].strip(), row["output_id"]
        assert summary["body"].strip(), row["output_id"]
        for field in ("baseline_notes", "interpretations", "signal_notes"):
            assert posting[field], (row["output_id"], field)

        lines = [
            line
            for section in posting["raw_sections"]
            for line in section["lines"]
        ]
        for line in lines:
            markers = [
                key
                for key in ("base_n", "note_n", "mark_n")
                if line.get(key) is not None
            ]
            assert len(markers) <= 1, (row["output_id"], line["text"], markers)

        expected_markers = {
            "base_n": {item["n"] for item in posting["baseline_notes"]},
            "note_n": {item["n"] for item in posting["signal_notes"]},
            "mark_n": {item["n"] for item in posting["interpretations"]},
        }
        for marker, expected_numbers in expected_markers.items():
            actual_number_list = [
                line[marker]
                for line in lines
                if line.get(marker) is not None
            ]
            actual_numbers = set(actual_number_list)
            assert len(actual_number_list) == len(actual_numbers), (
                row["output_id"], marker, actual_number_list
            )
            assert actual_numbers == expected_numbers, (
                row["output_id"], marker, actual_numbers, expected_numbers
            )
        if summary.get("confidence") == "high":
            assert all(
                posting[field]
                for field in ("baseline_notes", "interpretations", "signal_notes")
            )
        summaries_by_job[row["job_role_id"]].append(summary["body"].strip())

    for job, summaries in summaries_by_job.items():
        assert len(summaries) == 30, job
        assert len(set(summaries)) == 30, job


def test_final_content_passes_language_action_and_roadmap_checks() -> None:
    """조사, 행동 기준, 면접 꼬리질문, 채워짐 연결을 최종 CSV에서도 고정한다."""
    outputs = _rows("analysis_outputs")
    for job in build_seed.JOB_PARTS:
        tables = {
            "analysis_outputs": [
                {
                    "output_id": row["output_id"],
                    "output_type": row["output_type"],
                    "scope_level": row["scope_level"],
                    "payload": json.loads(row["payload"]),
                }
                for row in outputs
                if row["job_role_id"] == job
            ]
        }
        assert build_seed.check_content_quality(job, tables) == []
