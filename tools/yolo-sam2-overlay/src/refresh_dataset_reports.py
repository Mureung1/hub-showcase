from __future__ import annotations

import argparse
import json
from pathlib import Path

from .guide_comparison import compare_guides


TOOL_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = TOOL_ROOT.parents[1]
PHOTO_GUIDES_ROOT = REPO_ROOT / "assets" / "photo-guides"


def refresh_reports(root: Path = PHOTO_GUIDES_ROOT) -> list[dict]:
    manifest_path = root / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    rows: list[dict] = []
    for place in manifest["places"]:
        for frame in place["frames"]:
            reference = json.loads((root / frame["reference"]["layout"]).read_text(encoding="utf-8"))
            comparison = json.loads((root / frame["comparison"]["layout"]).read_text(encoding="utf-8"))
            report = compare_guides(reference, comparison)
            report["frameId"] = frame["frameId"]
            report["referencePhotoId"] = frame["reference"]["photoId"]
            report["comparisonPhotoId"] = frame["comparison"]["photoId"]
            report_path = root / frame["comparisonReport"]
            report_path.parent.mkdir(parents=True, exist_ok=True)
            report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
            rows.append({"frameId": frame["frameId"], "score": report["score"], "classification": report["classification"]})
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description="Refresh conservative composition test reports from migrated layout JSON files.")
    parser.add_argument("--root", type=Path, default=PHOTO_GUIDES_ROOT)
    args = parser.parse_args()
    rows = refresh_reports(args.root)
    print(json.dumps(rows, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
