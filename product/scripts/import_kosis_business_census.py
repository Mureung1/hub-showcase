"""Import one validated KOSIS business census workbook into the product database."""

from __future__ import annotations

import argparse
from pathlib import Path

from localtwin_api.config import get_settings
from localtwin_api.database import create_database_engine
from localtwin_api.kosis_business_census import import_business_census_snapshot
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
        report = import_business_census_snapshot(snapshot_dir, engine)
    finally:
        engine.dispose()
    print(f"snapshot_id: {report.snapshot_id}")
    print(f"workbook_data_rows: {report.workbook_data_rows}")
    print(f"imported_rows: {report.imported_rows}")
    print(f"suppressed_rows: {report.suppressed_rows}")
    print(f"sha256: {report.sha256}")


if __name__ == "__main__":
    main()
