"""Compare point-in-polygon store counts with official market aggregates."""

from __future__ import annotations

import argparse
import json
import sqlite3
from dataclasses import asdict, dataclass
from pathlib import Path

from localtwin_api.product_catalog import (
    CATEGORY_CODES,
    CATEGORY_NAME_TERMS,
    SUPPORTED_MARKET_CODES,
    Category,
)
from localtwin_api.seoul_open_data import repository_root

COMPARISON_LIMITATION = (
    "공식 집계와 개별 점포 원본의 기준일·업종 체계·polygon 포함 규칙이 달라 "
    "차이는 오류 판정이 아니라 비교 근거다."
)


@dataclass(frozen=True)
class SpatialOfficialComparison:
    market_code: str
    category: Category
    spatial_store_count: int
    official_store_count: int
    difference: int


@dataclass(frozen=True)
class SpatialComparisonReport:
    period: str
    linked_store_count: int
    rows: tuple[SpatialOfficialComparison, ...]
    limitation: str = COMPARISON_LIMITATION


def matches_category(values: tuple[str | None, ...], category: Category) -> bool:
    terms = CATEGORY_NAME_TERMS[category]
    return any(term in value.casefold() for value in values if value for term in terms)


def compare_spatial_to_official(
    database: Path,
    period: str,
    *,
    market_codes: tuple[str, ...] = SUPPORTED_MARKET_CODES,
) -> SpatialComparisonReport:
    if not period:
        raise ValueError("period is required.")
    if not market_codes or len(set(market_codes)) != len(market_codes):
        raise ValueError("market_codes must contain unique values.")

    placeholders = ",".join("?" * len(market_codes))
    spatial_counts = {
        (market_code, category): 0 for market_code in market_codes for category in CATEGORY_CODES
    }
    official_counts = dict(spatial_counts)
    with sqlite3.connect(database) as connection:
        linked_rows = connection.execute(
            f"""
            SELECT sml.market_code,
                   sp.category_large_name,
                   sp.category_middle_name,
                   sp.category_small_name
            FROM store_market_links AS sml
            JOIN store_points AS sp ON sp.store_id = sml.store_id
            WHERE sml.market_code IN ({placeholders})
            """,
            market_codes,
        ).fetchall()
        for market_code, large, middle, small in linked_rows:
            values = (large, middle, small)
            for category in CATEGORY_CODES:
                if matches_category(values, category):
                    spatial_counts[(market_code, category)] += 1

        official_rows = connection.execute(
            f"""
            SELECT market_code, category_code, store_count
            FROM store_metrics
            WHERE period = ? AND market_code IN ({placeholders})
            """,
            (period, *market_codes),
        ).fetchall()
        code_to_category = {
            code: category for category, codes in CATEGORY_CODES.items() for code in codes
        }
        for market_code, category_code, store_count in official_rows:
            category = code_to_category.get(category_code)
            if category is not None:
                official_counts[(market_code, category)] += int(store_count or 0)

    rows = tuple(
        SpatialOfficialComparison(
            market_code=market_code,
            category=category,
            spatial_store_count=spatial_counts[(market_code, category)],
            official_store_count=official_counts[(market_code, category)],
            difference=spatial_counts[(market_code, category)]
            - official_counts[(market_code, category)],
        )
        for market_code in market_codes
        for category in CATEGORY_CODES
    )
    return SpatialComparisonReport(period=period, linked_store_count=len(linked_rows), rows=rows)


def format_markdown_report(report: SpatialComparisonReport) -> str:
    lines = [
        f"Comparison period: {report.period}",
        f"Linked point-in-polygon stores: {report.linked_store_count}",
        "",
        "| Market | Category | Spatial stores | Official stores | Difference |",
        "| --- | --- | ---: | ---: | ---: |",
    ]
    lines.extend(
        "| "
        f"{row.market_code} | {row.category} | {row.spatial_store_count:,} | "
        f"{row.official_store_count:,} | {row.difference:+,} |"
        for row in report.rows
    )
    lines.extend(("", f"Limitation: {report.limitation}"))
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--database",
        type=Path,
        default=repository_root() / "data/processed/localtwin.db",
    )
    parser.add_argument("--period", default="20254")
    parser.add_argument("--report-format", choices=("json", "markdown"), default="markdown")
    arguments = parser.parse_args()
    report = compare_spatial_to_official(arguments.database, arguments.period)
    if arguments.report_format == "json":
        print(json.dumps(asdict(report), ensure_ascii=False, indent=2))
    else:
        print(format_markdown_report(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
