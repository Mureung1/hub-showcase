"""Collect official Seoul commercial-area data into local raw snapshots.

This module is intentionally a CLI, not a browser-facing route. The Seoul Open
Data key stays in ``.env`` and raw responses stay under the ignored ``data/raw``
directory. A later importer will normalize these snapshots into the API database.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from localtwin_api.config import get_settings

SEOUL_OPEN_DATA_BASE_URL = "http://openapi.seoul.go.kr:8088"
OFFICIAL_DATASET_URL = "https://data.seoul.go.kr"


class SeoulOpenDataError(RuntimeError):
    """Raised when the Seoul Open Data API cannot return a usable JSON page."""


@dataclass(frozen=True)
class SeoulOpenDataSource:
    slug: str
    service: str
    title: str
    dataset_url: str
    source_type: str
    accepts_period: bool


SOURCES: dict[str, SeoulOpenDataSource] = {
    "areas": SeoulOpenDataSource(
        slug="areas",
        service="TbgisTrdarRelm",
        title="서울시 상권분석서비스(영역-상권)",
        dataset_url="https://data.seoul.go.kr/dataList/OA-15560/A/1/datasetView.do",
        source_type="official",
        accepts_period=False,
    ),
    "stores": SeoulOpenDataSource(
        slug="stores",
        service="VwsmTrdarStorQq",
        title="서울시 상권분석서비스(점포-상권)",
        dataset_url="https://data.seoul.go.kr/dataList/OA-15577/A/1/datasetView.do",
        source_type="official",
        accepts_period=True,
    ),
    "sales": SeoulOpenDataSource(
        slug="sales",
        service="VwsmTrdarSelngQq",
        title="서울시 상권분석서비스(추정매출-상권)",
        dataset_url="https://data.seoul.go.kr/dataList/OA-15572/A/1/datasetView.do",
        source_type="official_estimate",
        accepts_period=True,
    ),
    "flow": SeoulOpenDataSource(
        slug="flow",
        service="VwsmTrdarFlpopQq",
        title="서울시 상권분석서비스(길단위인구-상권)",
        dataset_url="https://data.seoul.go.kr/dataList/OA-15568/A/1/datasetView.do",
        source_type="official_estimate",
        accepts_period=True,
    ),
    "resident": SeoulOpenDataSource(
        slug="resident",
        service="VwsmTrdarRepopQq",
        title="서울시 상권분석서비스(상주인구-상권)",
        dataset_url="https://data.seoul.go.kr/dataList/OA-15584/A/1/datasetView.do",
        source_type="official",
        accepts_period=True,
    ),
    "workers": SeoulOpenDataSource(
        slug="workers",
        service="VwsmTrdarWrcPopltnQq",
        title="서울시 상권분석서비스(직장인구-상권)",
        dataset_url="https://data.seoul.go.kr/dataList/OA-15569/A/1/datasetView.do",
        source_type="official",
        accepts_period=True,
    ),
}


def repository_root() -> Path:
    return Path(__file__).resolve().parents[4]


def build_request_url(
    key: str,
    source: SeoulOpenDataSource,
    start_index: int,
    end_index: int,
    period: str | None,
) -> str:
    parts = [
        SEOUL_OPEN_DATA_BASE_URL,
        quote(key, safe=""),
        "json",
        source.service,
        str(start_index),
        str(end_index),
    ]
    if period and source.accepts_period:
        parts.append(quote(period, safe=""))
    return "/".join(parts)


def parse_response(payload: dict[str, Any], service: str) -> tuple[int, list[dict[str, Any]]]:
    body = payload.get(service)
    if not isinstance(body, dict):
        result = payload.get("RESULT")
        if isinstance(result, dict):
            code = result.get("CODE", "unknown")
            message = result.get("MESSAGE", "unknown error")
            raise SeoulOpenDataError(f"Seoul Open Data rejected the request: {code} - {message}")
        raise SeoulOpenDataError(f"Seoul Open Data response did not contain service {service}.")

    result = body.get("RESULT")
    if isinstance(result, dict) and result.get("CODE") != "INFO-000":
        code = result.get("CODE", "unknown")
        message = result.get("MESSAGE", "unknown error")
        raise SeoulOpenDataError(f"Seoul Open Data rejected the request: {code} - {message}")

    rows = body.get("row", [])
    if not isinstance(rows, list) or not all(isinstance(row, dict) for row in rows):
        raise SeoulOpenDataError(
            f"Seoul Open Data service {service} returned an invalid row collection."
        )

    total = body.get("list_total_count", len(rows))
    try:
        return int(total), rows
    except (TypeError, ValueError) as error:
        raise SeoulOpenDataError(
            f"Seoul Open Data service {service} returned an invalid total count."
        ) from error


def fetch_page(url: str) -> dict[str, Any]:
    request = Request(url, headers={"User-Agent": "LocalTwin/0.1"})
    try:
        with urlopen(request, timeout=30) as response:  # noqa: S310 - official URL is fixed above
            raw_body = response.read()
    except HTTPError as error:
        raise SeoulOpenDataError(f"Seoul Open Data HTTP error: {error.code}") from error
    except URLError as error:
        raise SeoulOpenDataError("Seoul Open Data network request failed.") from error

    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError as error:
        raise SeoulOpenDataError(
            "Seoul Open Data did not return JSON. Check the API key and endpoint availability."
        ) from error

    if not isinstance(payload, dict):
        raise SeoulOpenDataError("Seoul Open Data returned a non-object JSON payload.")
    return payload


def fetch_rows(
    key: str,
    source: SeoulOpenDataSource,
    period: str | None,
    page_size: int,
    max_rows: int | None,
) -> tuple[int, list[dict[str, Any]], bool]:
    rows: list[dict[str, Any]] = []
    start_index = 1
    total = 0

    while max_rows is None or len(rows) < max_rows:
        end_index = start_index + page_size - 1
        if max_rows is not None:
            end_index = min(end_index, max_rows)
        url = build_request_url(key, source, start_index, end_index, period)
        page_total, page_rows = parse_response(fetch_page(url), source.service)
        total = page_total
        rows.extend(page_rows)

        if not page_rows or len(rows) >= total:
            break
        start_index += page_size

    saved_rows = rows if max_rows is None else rows[:max_rows]
    truncated = len(saved_rows) < total
    return total, saved_rows, truncated


def write_snapshot(
    output_dir: Path,
    source: SeoulOpenDataSource,
    period: str | None,
    collected_at: str,
    total: int,
    rows: list[dict[str, Any]],
    truncated: bool,
) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    payload = {
        "source_name": source.title,
        "source_type": source.source_type,
        "source_url": source.dataset_url,
        "service": source.service,
        "period": period,
        "collected_at": collected_at,
        "list_total_count": total,
        "saved_row_count": len(rows),
        "truncated": truncated,
        "rows": rows,
    }
    path = output_dir / f"{source.slug}.json"
    serialized = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    path.write_text(serialized, encoding="utf-8")
    return {
        "source": source.slug,
        "service": source.service,
        "source_type": source.source_type,
        "path": path.name,
        "saved_row_count": len(rows),
        "list_total_count": total,
        "truncated": truncated,
        "sha256": hashlib.sha256(serialized.encode("utf-8")).hexdigest(),
    }


def parse_sources(value: str) -> list[SeoulOpenDataSource]:
    slugs = [slug.strip() for slug in value.split(",") if slug.strip()]
    unknown = sorted(set(slugs) - SOURCES.keys())
    if unknown:
        raise argparse.ArgumentTypeError(f"Unknown source name(s): {', '.join(unknown)}")
    if not slugs:
        raise argparse.ArgumentTypeError("At least one source is required.")
    return [SOURCES[slug] for slug in slugs]


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Save Seoul commercial-area API snapshots locally."
    )
    parser.add_argument(
        "--sources",
        default="areas,stores,sales,flow",
        help="Comma-separated sources: " + ", ".join(SOURCES),
    )
    parser.add_argument(
        "--period",
        help="Optional official STDR_YYQU_CD filter, for example 20251.",
    )
    parser.add_argument(
        "--max-rows",
        default=1000,
        type=int,
        help="Maximum rows to save per source. The default is a truthful exploration snapshot.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Paginate through every provider row for each selected source.",
    )
    parser.add_argument(
        "--page-size",
        default=1000,
        type=int,
        help="Rows requested from the provider per HTTP page.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=repository_root() / "data" / "raw" / "seoul-market",
        help="Directory for ignored local raw snapshots.",
    )
    parser.add_argument(
        "--allow-official-http",
        action="store_true",
        help="Acknowledge the provider's documented HTTP endpoint before sending the API key.",
    )
    args = parser.parse_args()

    if args.max_rows < 1 or args.page_size < 1:
        parser.error("--max-rows and --page-size must both be positive.")

    sources = parse_sources(args.sources)

    key_setting = get_settings().seoul_open_data_key
    key = key_setting.get_secret_value().strip() if key_setting else ""
    if not key:
        parser.error("SEOUL_OPEN_DATA_KEY is missing. Add it to product/.env first.")
    if not args.allow_official_http:
        parser.error(
            "The official Seoul endpoint uses HTTP on port 8088. "
            "Review the data mapping note and pass --allow-official-http to continue."
        )

    collected_at = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    run_dir = args.output_dir / datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    max_rows: int | None = None if args.all else args.max_rows
    manifest_sources: list[dict[str, Any]] = []
    try:
        for source in sources:
            source_period = args.period if source.accepts_period else None
            print(f"Fetching {source.slug} from {source.service}...")
            total, rows, truncated = fetch_rows(
                key, source, source_period, args.page_size, max_rows
            )
            manifest_sources.append(
                write_snapshot(run_dir, source, source_period, collected_at, total, rows, truncated)
            )
    except SeoulOpenDataError as error:
        parser.exit(1, f"Data collection failed: {error}\n")

    manifest = {
        "source_name": "서울 열린데이터광장 상권분석 Open API",
        "source_url": OFFICIAL_DATASET_URL,
        "source_types": sorted({source["source_type"] for source in manifest_sources}),
        "collected_at": collected_at,
        "period": args.period,
        "max_rows_per_source": "all" if max_rows is None else max_rows,
        "sources": manifest_sources,
    }
    (run_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Saved {len(manifest_sources)} official source snapshot(s) to {run_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
