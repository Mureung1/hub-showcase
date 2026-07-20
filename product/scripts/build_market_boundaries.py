"""Build the selected-market boundary snapshot from canonical SQLite."""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

PRODUCT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PRODUCT_ROOT / "apps" / "api" / "src"))

from localtwin_api.product_catalog import MARKET_BY_ID  # noqa: E402


def build_snapshot(database: Path) -> dict[str, object]:
    connection = sqlite3.connect(f"file:{database.as_posix()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    try:
        placeholders = ",".join("?" for _ in MARKET_BY_ID)
        rows = connection.execute(
            f"""
            SELECT mg.market_code, m.market_name, mg.geometry_geojson,
                   mg.source_snapshot_id
            FROM market_geometries AS mg
            JOIN markets AS m ON m.market_code = mg.market_code
            WHERE mg.market_code IN ({placeholders})
            ORDER BY mg.market_code
            """,
            tuple(MARKET_BY_ID),
        ).fetchall()
    finally:
        connection.close()

    if {str(row["market_code"]) for row in rows} != set(MARKET_BY_ID):
        raise ValueError("Canonical market boundary set is incomplete.")

    return {
        "type": "FeatureCollection",
        "name": "localtwin-selected-market-boundaries",
        "metadata": {
            "generated_from": "data/processed/localtwin.db",
            "coordinate_system": "EPSG:4326",
            "feature_count": len(rows),
        },
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "market_id": str(row["market_code"]),
                    "market_key": MARKET_BY_ID[str(row["market_code"])].key,
                    "market_name": str(row["market_name"]),
                    "source_snapshot_id": str(row["source_snapshot_id"]),
                },
                "geometry": json.loads(str(row["geometry_geojson"])),
            }
            for row in rows
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--database",
        type=Path,
        default=PRODUCT_ROOT / "data" / "processed" / "localtwin.db",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=PRODUCT_ROOT
        / "apps"
        / "web"
        / "public"
        / "data"
        / "market-boundaries.geojson",
    )
    arguments = parser.parse_args()
    snapshot = build_snapshot(arguments.database.resolve())
    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    arguments.output.write_text(
        json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {len(snapshot['features'])} market boundaries to {arguments.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
