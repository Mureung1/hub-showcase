"""Validate or apply the LocalTwin production database promotion plan."""

from __future__ import annotations

import argparse
import os
from pathlib import Path

from localtwin_api.production_promotion import (
    ProductionPromotionInputs,
    promote_production_database,
    validate_production_target,
    validate_promotion_inputs,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-ref", required=True)
    parser.add_argument("--confirm-project-ref", required=True)
    parser.add_argument("--canonical", type=Path, required=True)
    parser.add_argument("--kosis-population", type=Path, required=True)
    parser.add_argument("--kosis-business", type=Path, required=True)
    parser.add_argument("--market-population", type=Path, required=True)
    parser.add_argument("--period", default="20251")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply migrations and idempotent imports. Without this flag only validation runs.",
    )
    return parser


def main() -> None:
    arguments = build_parser().parse_args()
    database_url = os.environ.get("PRODUCTION_DATABASE_URL", "").strip()
    if not database_url:
        raise SystemExit("PRODUCTION_DATABASE_URL is required and is never read from product/.env.")
    inputs = ProductionPromotionInputs(
        canonical_database=arguments.canonical,
        kosis_population_snapshot=arguments.kosis_population,
        kosis_business_snapshot=arguments.kosis_business,
        market_population_snapshot=arguments.market_population,
        period=arguments.period,
    )
    validate_production_target(
        database_url, arguments.project_ref, arguments.confirm_project_ref
    )
    validate_promotion_inputs(inputs)
    if not arguments.apply:
        print("Production target identity: verified")
        print("Promotion input snapshots: verified")
        print("Mode: dry-run; no database changes were made")
        return

    report = promote_production_database(
        database_url,
        arguments.project_ref,
        arguments.confirm_project_ref,
        inputs,
    )
    print("Production migration: head")
    for table, count in report.canonical_table_counts.items():
        print(f"{table}: {count}")
    print(f"admin_area_population: {report.population_rows}")
    print(f"market_admin_area_crosswalk: {report.population_crosswalk_rows}")
    print(f"admin_area_business_metrics: {report.business_rows}")
    print(f"admin_area_business_metrics.suppressed: {report.suppressed_business_rows}")
    print(f"market_population_metrics: {report.market_population_rows}")


if __name__ == "__main__":
    main()
