from __future__ import annotations

import argparse
import json
import statistics
import time
from pathlib import Path
from typing import Any

from .server import analyze_image, get_models


TOOL_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = TOOL_ROOT.parents[1]
PHOTO_GUIDES_ROOT = REPO_ROOT / "assets" / "photo-guides"


def summarize(values: list[float]) -> dict[str, float]:
    return {"averageMs": round(statistics.mean(values), 2), "maxMs": round(max(values), 2), "minMs": round(min(values), 2)}


def measure(root: Path = PHOTO_GUIDES_ROOT, analysis_mode: str = "accurate") -> dict[str, Any]:
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    get_models(analysis_mode)
    records: list[dict[str, Any]] = []
    for place in manifest["places"]:
        for frame in place["frames"]:
            expected_people = 1 if frame["mode"] == "solo" else 2
            for variant in ("reference", "comparison"):
                item = frame[variant]
                started = time.perf_counter()
                result = analyze_image(root / item["photo"], expected_people, analysis_mode)
                wall_ms = round((time.perf_counter() - started) * 1000, 2)
                if result.get("status") != "ok":
                    raise RuntimeError(f"{item['photoId']} analysis failed: {result.get('status')}")
                records.append({
                    "photoId": item["photoId"],
                    "mode": analysis_mode,
                    "wallMs": wall_ms,
                    "timingsMs": result["timings_ms"],
                })
    totals = [record["timingsMs"]["total"] for record in records]
    output = {
        "version": 1,
        "analysisMode": analysis_mode,
        "sampleCount": len(records),
        "summary": {
            "total": summarize(totals),
            "wall": summarize([record["wallMs"] for record in records]),
            "yolo": summarize([record["timingsMs"]["yolo_inference"] for record in records]),
            "sam2": summarize([record["timingsMs"]["sam2_inference"] for record in records]),
        },
        "records": records,
    }
    output_path = root / f"performance-{analysis_mode}.json"
    output_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description="Measure warmed Vision analysis timings across all migrated dataset photos.")
    parser.add_argument("--root", type=Path, default=PHOTO_GUIDES_ROOT)
    parser.add_argument("--analysis-mode", choices=["fast", "accurate"], default="accurate")
    args = parser.parse_args()
    result = measure(args.root, args.analysis_mode)
    print(json.dumps(result["summary"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
