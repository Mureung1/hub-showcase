"""Collect allowlisted public-data APIs into provenance-preserving raw snapshots."""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from localtwin_api.config import get_settings
from localtwin_api.seoul_open_data import repository_root


class PublicDataError(RuntimeError):
    """Raised when an allowlisted public API returns an unusable response."""


@dataclass(frozen=True)
class PublicDataSource:
    slug: str
    title: str
    endpoint: str
    dataset_url: str
    source_type: str
    page_size_limit: int


SOURCES: dict[str, PublicDataSource] = {
    "stores": PublicDataSource(
        slug="stores",
        title="소상공인시장진흥공단 상가(상권)정보 반경 조회",
        endpoint="https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInRadius",
        dataset_url="https://www.data.go.kr/data/15012005/openapi.do",
        source_type="official",
        page_size_limit=1000,
    ),
    "restaurants": PublicDataSource(
        slug="restaurants",
        title="행정안전부 식품 일반음식점 조회",
        endpoint="https://apis.data.go.kr/1741000/general_restaurants/info",
        dataset_url="https://www.data.go.kr/data/15154916/openapi.do",
        source_type="official",
        page_size_limit=100,
    ),
    "cafes": PublicDataSource(
        slug="cafes",
        title="행정안전부 식품 휴게음식점 조회",
        endpoint="https://apis.data.go.kr/1741000/rest_cafes/info",
        dataset_url="https://www.data.go.kr/data/15154921/openapi.do",
        source_type="official",
        page_size_limit=100,
    ),
}


def build_request_url(source: PublicDataSource, key: str, params: dict[str, Any]) -> str:
    encoded_key = key if "%" in key else quote(key, safe="")
    return f"{source.endpoint}?serviceKey={encoded_key}&{urlencode(params)}"


def request_params(
    source: PublicDataSource,
    page: int,
    rows: int,
    longitude: float,
    latitude: float,
    radius: int,
    address: str,
) -> dict[str, Any]:
    if rows < 1 or rows > source.page_size_limit:
        raise ValueError(f"{source.slug} rows must be between 1 and {source.page_size_limit}.")
    if source.slug == "stores":
        return {
            "pageNo": page,
            "numOfRows": rows,
            "type": "json",
            "cx": longitude,
            "cy": latitude,
            "radius": radius,
        }
    return {
        "pageNo": page,
        "numOfRows": rows,
        "returnType": "json",
        "cond[ROAD_NM_ADDR::LIKE]": address,
    }


def fetch_json(url: str) -> dict[str, Any]:
    request = Request(url, headers={"User-Agent": "LocalTwin/0.1"})
    try:
        with urlopen(request, timeout=40) as response:  # noqa: S310 - endpoints are allowlisted
            payload = json.load(response)
    except HTTPError as error:
        raise PublicDataError(f"Public Data HTTP error: {error.code}") from error
    except (URLError, TimeoutError) as error:
        raise PublicDataError("Public Data network request failed.") from error
    except json.JSONDecodeError as error:
        raise PublicDataError("Public Data did not return JSON.") from error
    if not isinstance(payload, dict):
        raise PublicDataError("Public Data returned a non-object JSON payload.")
    return payload


def extract_rows(payload: dict[str, Any]) -> tuple[int, list[dict[str, Any]]]:
    response = payload.get("response", payload)
    if not isinstance(response, dict):
        raise PublicDataError("Public Data response wrapper is invalid.")
    header = response.get("header", payload.get("header", {}))
    if isinstance(header, dict):
        result_code = str(header.get("resultCode", header.get("resultCd", "00")))
        if result_code not in {"00", "0", "INFO-000"}:
            message = header.get("resultMsg", header.get("description", "unknown error"))
            raise PublicDataError(f"Public Data rejected the request: {result_code} - {message}")
    body = response.get("body", payload.get("body", {}))
    if not isinstance(body, dict):
        raise PublicDataError("Public Data body is invalid.")
    items = body.get("items", [])
    if isinstance(items, dict):
        items = items.get("item", [])
    if isinstance(items, dict):
        items = [items]
    if not isinstance(items, list) or not all(isinstance(item, dict) for item in items):
        raise PublicDataError("Public Data items are invalid.")
    total = body.get("totalCount", len(items))
    try:
        return int(total), items
    except (TypeError, ValueError) as error:
        raise PublicDataError("Public Data totalCount is invalid.") from error


def write_source_snapshot(
    run_dir: Path,
    source: PublicDataSource,
    collected_at: str,
    params: dict[str, Any],
    total: int,
    rows: list[dict[str, Any]],
) -> dict[str, Any]:
    safe_params = {key: value for key, value in params.items() if key != "serviceKey"}
    payload = {
        "source_name": source.title,
        "source_type": source.source_type,
        "source_url": source.dataset_url,
        "endpoint": source.endpoint,
        "collected_at": collected_at,
        "request_parameters": safe_params,
        "list_total_count": total,
        "saved_row_count": len(rows),
        "truncated": len(rows) < total,
        "rows": rows,
    }
    serialized = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    path = run_dir / f"{source.slug}.json"
    path.write_text(serialized, encoding="utf-8")
    return {
        "source": source.slug,
        "source_type": source.source_type,
        "source_url": source.dataset_url,
        "path": path.name,
        "saved_row_count": len(rows),
        "list_total_count": total,
        "truncated": len(rows) < total,
        "sha256": hashlib.sha256(serialized.encode()).hexdigest(),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Collect allowlisted public market APIs.")
    parser.add_argument("--sources", default="stores,restaurants,cafes")
    parser.add_argument("--longitude", type=float, default=126.9257)
    parser.add_argument("--latitude", type=float, default=37.5661)
    parser.add_argument("--radius", type=int, default=500)
    parser.add_argument("--address", default="마포구")
    parser.add_argument("--rows", type=int, default=100)
    parser.add_argument("--page", type=int, default=1)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=repository_root() / "data" / "raw" / "public-data",
    )
    args = parser.parse_args()
    slugs = [item.strip() for item in args.sources.split(",") if item.strip()]
    unknown = sorted(set(slugs) - SOURCES.keys())
    if unknown:
        parser.error(f"Unknown source name(s): {', '.join(unknown)}")
    if args.page < 1 or args.radius < 1:
        parser.error("--page and --radius must be positive.")

    secret = get_settings().public_data_service_key
    key = secret.get_secret_value().strip() if secret else ""
    if not key:
        parser.error("PUBLIC_DATA_SERVICE_KEY is missing from product/.env.")

    collected_at = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    run_dir = args.output_dir / datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    run_dir.mkdir(parents=True, exist_ok=False)
    manifest_sources: list[dict[str, Any]] = []
    try:
        for slug in slugs:
            source = SOURCES[slug]
            rows = min(args.rows, source.page_size_limit)
            params = request_params(
                source,
                args.page,
                rows,
                args.longitude,
                args.latitude,
                args.radius,
                args.address,
            )
            print(f"Fetching {source.slug} from allowlisted official API...")
            total, items = extract_rows(fetch_json(build_request_url(source, key, params)))
            manifest_sources.append(
                write_source_snapshot(run_dir, source, collected_at, params, total, items)
            )
    except (PublicDataError, ValueError) as error:
        parser.exit(1, f"Data collection failed: {error}\n")

    manifest = {
        "source_name": "공공데이터포털 LocalTwin 공식 API sample",
        "collected_at": collected_at,
        "sources": manifest_sources,
    }
    (run_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Saved {len(manifest_sources)} source snapshot(s) to {run_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
