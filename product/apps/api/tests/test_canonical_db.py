import hashlib
import json
import sqlite3
from pathlib import Path

from localtwin_api.canonical_db import (
    SCHEMA,
    import_public,
    import_seoul,
    load_canonical_snapshot,
    table_counts,
)


def write_snapshot(path: Path, slug: str, rows: list[dict[str, object]]) -> dict[str, object]:
    payload = {"rows": rows}
    serialized = json.dumps(payload)
    (path / f"{slug}.json").write_text(serialized, encoding="utf-8")
    return {
        "source": slug,
        "source_type": "official_estimate" if slug in {"sales", "flow"} else "official",
        "source_url": f"https://example.test/{slug}",
        "path": f"{slug}.json",
        "saved_row_count": len(rows),
        "sha256": hashlib.sha256(serialized.encode()).hexdigest(),
    }


def make_seoul_snapshot(path: Path) -> None:
    sources = [
        write_snapshot(
            path,
            "areas",
            [
                {
                    "TRDAR_CD": "M1",
                    "TRDAR_CD_NM": "테스트 상권",
                    "TRDAR_SE_CD": "A",
                    "TRDAR_SE_CD_NM": "골목상권",
                    "SIGNGU_CD": "11440",
                    "SIGNGU_CD_NM": "마포구",
                    "ADSTRD_CD": "A1",
                    "ADSTRD_CD_NM": "연남동",
                    "XCNTS_VALUE": "190000",
                    "YDNTS_VALUE": "450000",
                    "RELM_AR": "1000",
                }
            ],
        ),
        write_snapshot(
            path,
            "stores",
            [
                {
                    "TRDAR_CD": "M1",
                    "STDR_YYQU_CD": "20251",
                    "SVC_INDUTY_CD": "CS100010",
                    "SVC_INDUTY_CD_NM": "카페",
                    "SIMILR_INDUTY_STOR_CO": "5",
                    "STOR_CO": "4",
                    "FRC_STOR_CO": "1",
                    "OPBIZ_RT": "2.5",
                    "OPBIZ_STOR_CO": "1",
                    "CLSBIZ_RT": "1.2",
                    "CLSBIZ_STOR_CO": "0",
                }
            ],
        ),
        write_snapshot(
            path,
            "sales",
            [
                {
                    "TRDAR_CD": "M1",
                    "STDR_YYQU_CD": "20251",
                    "SVC_INDUTY_CD": "CS100010",
                    "SVC_INDUTY_CD_NM": "카페",
                    "THSMON_SELNG_AMT": "1000",
                    "THSMON_SELNG_CO": "10",
                }
            ],
        ),
        write_snapshot(
            path,
            "flow",
            [{"TRDAR_CD": "M1", "STDR_YYQU_CD": "20251", "TOT_FLPOP_CO": "120"}],
        ),
    ]
    (path / "manifest.json").write_text(
        json.dumps(
            {
                "source_url": "https://data.seoul.go.kr",
                "collected_at": "2026-07-11T00:00:01Z",
                "period": "20251",
                "sources": sources,
            }
        ),
        encoding="utf-8",
    )


def test_seoul_import_is_idempotent_and_keeps_provenance(tmp_path: Path) -> None:
    make_seoul_snapshot(tmp_path)
    connection = sqlite3.connect(":memory:")
    connection.executescript(SCHEMA)

    first = import_seoul(connection, tmp_path)
    second = import_seoul(connection, tmp_path)

    assert first == second
    assert second["markets"] == 1
    assert second["store_metrics"] == 1
    assert second["sales_metrics"] == 1
    assert second["flow_metrics"] == 1
    assert second["data_sources"] == 4
    assert connection.execute(
        "SELECT source_type FROM data_sources WHERE dataset='sales'"
    ).fetchone() == ("official_estimate",)


def test_seoul_import_accepts_metric_only_snapshots_after_market_seed(tmp_path: Path) -> None:
    initial = tmp_path / "initial"
    initial.mkdir()
    make_seoul_snapshot(initial)
    partial = tmp_path / "partial"
    partial.mkdir()
    sources = [
        write_snapshot(
            partial,
            "sales",
            [
                {
                    "TRDAR_CD": "M1",
                    "STDR_YYQU_CD": "20252",
                    "SVC_INDUTY_CD": "CS100010",
                    "SVC_INDUTY_CD_NM": "카페",
                    "THSMON_SELNG_AMT": "2000",
                    "THSMON_SELNG_CO": "20",
                }
            ],
        ),
        write_snapshot(
            partial,
            "flow",
            [{"TRDAR_CD": "M1", "STDR_YYQU_CD": "20252", "TOT_FLPOP_CO": "240"}],
        ),
    ]
    (partial / "manifest.json").write_text(
        json.dumps(
            {
                "source_url": "https://data.seoul.go.kr",
                "collected_at": "2026-07-11T00:00:00Z",
                "period": "20252",
                "sources": sources,
            }
        ),
        encoding="utf-8",
    )
    connection = sqlite3.connect(":memory:")
    connection.executescript(SCHEMA)
    import_seoul(connection, initial)

    counts = import_seoul(connection, partial)

    assert counts["sales_metrics"] == 2
    assert counts["flow_metrics"] == 2


def test_public_import_links_store_and_permit_sources(tmp_path: Path) -> None:
    sources = [
        write_snapshot(
            tmp_path,
            "stores",
            [{"bizesId": "S1", "bizesNm": "가게", "lon": "126.9", "lat": "37.5"}],
        ),
        write_snapshot(tmp_path, "restaurants", [{"MNG_NO": "P1", "BPLC_NM": "식당"}]),
    ]
    (tmp_path / "manifest.json").write_text(
        json.dumps({"collected_at": "2026-07-11T00:00:00Z", "sources": sources}),
        encoding="utf-8",
    )
    connection = sqlite3.connect(":memory:")
    connection.executescript(SCHEMA)

    counts = import_public(connection, tmp_path)

    assert counts["store_points"] == 1
    assert counts["permit_businesses"] == 1
    assert table_counts(connection)["data_sources"] == 2


def test_canonical_snapshot_rejects_duplicate_source_before_database_access(tmp_path: Path) -> None:
    (tmp_path / "stores.json").write_text(json.dumps({"rows": []}), encoding="utf-8")
    (tmp_path / "manifest.json").write_text(
        json.dumps(
            {
                "sources": [
                    {"source": "stores", "path": "stores.json"},
                    {"source": "stores", "path": "stores.json"},
                ]
            }
        ),
        encoding="utf-8",
    )

    try:
        load_canonical_snapshot(tmp_path)
    except ValueError as error:
        assert str(error) == "Snapshot manifest contains duplicate source: stores"
    else:
        raise AssertionError("Expected duplicate source validation to fail.")
