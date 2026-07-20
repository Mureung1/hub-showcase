"""Download and validate the fixed KOSIS 2024 business census workbook."""

from __future__ import annotations

import argparse
from pathlib import Path

from localtwin_api.kosis_business_census import collect_business_census_snapshot
from localtwin_api.seoul_open_data import repository_root


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=repository_root() / "data" / "raw" / "kosis-business-census",
    )
    arguments = parser.parse_args()
    snapshot_dir = collect_business_census_snapshot(arguments.output_dir)
    print(f"snapshot: {snapshot_dir.relative_to(repository_root()).as_posix()}")


if __name__ == "__main__":
    main()
