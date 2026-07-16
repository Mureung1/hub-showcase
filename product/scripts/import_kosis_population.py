"""Import one validated KOSIS population snapshot into the product database."""

from __future__ import annotations

import argparse
from pathlib import Path

from localtwin_api.config import get_settings
from localtwin_api.database import create_database_engine
from localtwin_api.kosis_population import import_population_snapshot
from localtwin_api.seoul_open_data import repository_root


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", type=Path, required=True)
    arguments = parser.parse_args()
    snapshot_dir = arguments.snapshot
    if not snapshot_dir.is_absolute():
        snapshot_dir = repository_root() / snapshot_dir
    engine = create_database_engine(get_settings().require_database_url())
    try:
        report = import_population_snapshot(snapshot_dir, engine)
    finally:
        engine.dispose()
    print(f"snapshot_id: {report.snapshot_id}")
    print(f"raw_rows: {report.raw_row_count}")
    print(f"population_rows: {report.population_row_count}")
    print(f"crosswalk_rows: {report.crosswalk_row_count}")
    print(f"sha256: {report.sha256}")


if __name__ == "__main__":
    main()
