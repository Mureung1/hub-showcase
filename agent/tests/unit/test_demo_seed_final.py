"""최종 30건 데모 시드 CSV의 전환 수용 기준."""

from __future__ import annotations

import csv
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
                    else "약" if value <= 30
                    else "중" if value <= 69
                    else "강"
                )
                assert cell["level"] == expected, (job, cluster["cluster"], cell)


def test_small_cluster_statistics_are_marked_low_confidence() -> None:
    cluster_facts = [
        row for row in _rows("statistics_facts") if row["scope_level"] == "cluster"
    ]
    assert cluster_facts
    assert {row["sample_status"] for row in cluster_facts} == {"low_confidence"}
