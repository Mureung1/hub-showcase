"""Build the deployable market-analysis fallback from canonical SQLite."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API_SRC = ROOT / "apps" / "api" / "src"
sys.path.insert(0, str(API_SRC))

from localtwin_api.market_analysis import analyze_market  # noqa: E402
from localtwin_api.product_catalog import CATEGORY_CODES, SUPPORTED_MARKETS  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "apps" / "web" / "public" / "data" / "market-analysis.json",
    )
    args = parser.parse_args()
    analyses = {
        f"{market_key}:{category}": analyze_market(market_id, category).model_dump(
            mode="json"
        )
        for market in SUPPORTED_MARKETS
        for category in CATEGORY_CODES
        for market_key, market_id in ((market.key, market.market_id),)
    }
    payload = {
        "schema_version": "1.0.0",
        "generated_from": "data/processed/localtwin.db",
        "period": "20251",
        "analyses": analyses,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"wrote {len(analyses)} analyses to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
