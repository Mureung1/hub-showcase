"""Collect the fixed KOSIS population snapshot without touching the database."""

from __future__ import annotations

import argparse
from pathlib import Path

from localtwin_api.config import get_settings
from localtwin_api.kosis_population import fetch_population_rows, write_population_snapshot
from localtwin_api.seoul_open_data import repository_root


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=repository_root() / "data" / "raw" / "kosis-population",
    )
    arguments = parser.parse_args()
    secret = get_settings().kosis_api_key
    api_key = secret.get_secret_value().strip() if secret else ""
    rows = fetch_population_rows(api_key)
    snapshot_dir = write_population_snapshot(rows, arguments.output_dir)
    print(f"snapshot: {snapshot_dir.relative_to(repository_root()).as_posix()}")
    print(f"raw_rows: {len(rows)}")


if __name__ == "__main__":
    main()
