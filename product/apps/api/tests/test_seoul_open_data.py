from pathlib import Path

import pytest

import localtwin_api.seoul_open_data as seoul_open_data
from localtwin_api.seoul_open_data import (
    SOURCES,
    SeoulOpenDataError,
    build_request_url,
    parse_response,
    write_snapshot,
)


def test_build_request_url_adds_the_period_only_when_provided() -> None:
    area_url = build_request_url("test key", SOURCES["areas"], 1, 5, "20251")
    store_url = build_request_url("test key", SOURCES["stores"], 1, 5, "20251")

    assert area_url.endswith("/TbgisTrdarRelm/1/5")
    assert store_url.endswith("/VwsmTrdarStorQq/1/5/20251")
    assert "test%20key" in store_url


def test_source_types_distinguish_direct_and_estimated_data() -> None:
    assert SOURCES["stores"].source_type == "official"
    assert SOURCES["sales"].source_type == "official_estimate"
    assert SOURCES["flow"].source_type == "official_estimate"
    assert SOURCES["areas"].accepts_period is False


def test_parse_response_reads_rows_and_total() -> None:
    total, rows = parse_response(
        {
            "VwsmTrdarStorQq": {
                "RESULT": {"CODE": "INFO-000", "MESSAGE": "success"},
                "list_total_count": 2,
                "row": [{"TRDAR_CD": "A"}],
            }
        },
        "VwsmTrdarStorQq",
    )

    assert total == 2
    assert rows == [{"TRDAR_CD": "A"}]


def test_parse_response_exposes_provider_error_without_a_key() -> None:
    with pytest.raises(SeoulOpenDataError, match="INFO-100"):
        parse_response(
            {"RESULT": {"CODE": "INFO-100", "MESSAGE": "invalid key"}},
            "TbgisTrdarRelm",
        )


def test_fetch_rows_paginates_when_all_rows_are_requested(monkeypatch: pytest.MonkeyPatch) -> None:
    payloads = [
        {"VwsmTrdarStorQq": {"list_total_count": 3, "row": [{"id": 1}, {"id": 2}]}},
        {"VwsmTrdarStorQq": {"list_total_count": 3, "row": [{"id": 3}]}},
    ]

    def fake_fetch_page(_: str) -> dict[str, object]:
        return payloads.pop(0)

    monkeypatch.setattr(seoul_open_data, "fetch_page", fake_fetch_page)
    total, rows, truncated = seoul_open_data.fetch_rows(
        "test key", SOURCES["stores"], "20251", page_size=2, max_rows=None
    )

    assert total == 3
    assert rows == [{"id": 1}, {"id": 2}, {"id": 3}]
    assert truncated is False


def test_write_snapshot_records_source_metadata(tmp_path: Path) -> None:
    result = write_snapshot(
        tmp_path,
        SOURCES["stores"],
        "20251",
        "2026-07-10T00:00:00Z",
        4,
        [{"TRDAR_CD": "A"}],
        True,
    )

    assert (tmp_path / "stores.json").exists()
    assert result["saved_row_count"] == 1
    assert result["source_type"] == "official"
    assert result["truncated"] is True
