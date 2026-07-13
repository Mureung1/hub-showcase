"""Evaluate LocalTwin canonical market responses against reproducible product gates."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "api" / "src"))

from localtwin_api.market_analysis import CATEGORY_CODES, analyze_market  # noqa: E402

MARKETS = {"연남": "3110562", "홍대": "3120103", "합정": "3120101"}


def evaluate(snapshot_path: Path) -> dict[str, Any]:
    snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
    failures: list[str] = []
    rows: list[dict[str, Any]] = []
    for market_key, market_id in MARKETS.items():
        for category in CATEGORY_CODES:
            key = f"{market_key}:{category}"
            first = analyze_market(market_id, category).model_dump(mode="json")
            second = analyze_market(market_id, category).model_dump(mode="json")
            if first != second:
                failures.append(f"{key}: response is not deterministic")
            if snapshot.get("analyses", {}).get(key) != first:
                failures.append(f"{key}: deploy snapshot differs from canonical response")
            score = first["score"]
            raw = first["raw"]
            if not 0 <= score["score"] <= 100:
                failures.append(f"{key}: score is outside 0..100")
            if not 0 <= score["confidence"] <= 100:
                failures.append(f"{key}: confidence is outside 0..100")
            if raw["category_store_count"] <= 0 or raw["total_store_count"] <= 0:
                failures.append(f"{key}: store evidence is empty")
            if len(raw["flow_by_time"]) != 6 or not any(raw["flow_by_time"]):
                failures.append(f"{key}: six time-bucket flow evidence is missing")
            evidence = first["evidence"]
            if len(evidence) != 3 or any(not item["source_url"] for item in evidence):
                failures.append(f"{key}: source metadata is incomplete")
            if score["formula_version"] != "1.0.0":
                failures.append(f"{key}: unexpected formula version")
            rows.append(
                {
                    "key": key,
                    "score": score["score"],
                    "confidence": score["confidence"],
                    "decision": score["decision_status"],
                    "cluster": score["cluster"]["classification"],
                    "stores": raw["category_store_count"],
                }
            )

    for category in CATEGORY_CODES:
        category_scores = {row["score"] for row in rows if row["key"].endswith(f":{category}")}
        if len(category_scores) < 2:
            failures.append(f"{category}: peer scores do not distinguish markets")

    return {
        "evaluation": "market-analysis-v1",
        "evaluated_at": datetime.now(UTC).replace(microsecond=0).isoformat(),
        "status": "passed" if not failures else "failed",
        "gates": {
            "expected_cases": 12,
            "evaluated_cases": len(rows),
            "failure_count": len(failures),
        },
        "summary": {
            "score_min": min(row["score"] for row in rows),
            "score_max": max(row["score"] for row in rows),
            "confidence_min": min(row["confidence"] for row in rows),
            "confidence_max": max(row["confidence"] for row in rows),
            "decisions": dict(Counter(row["decision"] for row in rows)),
            "clusters": dict(Counter(row["cluster"] for row in rows)),
        },
        "failures": failures,
        "cases": rows,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--snapshot",
        type=Path,
        default=ROOT / "apps" / "web" / "public" / "data" / "market-analysis.json",
    )
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = evaluate(args.snapshot)
    rendered = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    print(rendered, end="")
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
