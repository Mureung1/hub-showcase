from datetime import date

from app.features.mission_records.service import (
    kst_day_bounds_utc,
    parse_month,
)


def test_kst_day_bounds_are_returned_as_utc_half_open_interval() -> None:
    start, end = kst_day_bounds_utc(date(2026, 7, 24))

    assert start.isoformat() == "2026-07-23T15:00:00+00:00"
    assert end.isoformat() == "2026-07-24T15:00:00+00:00"


def test_parse_month_returns_year_and_month() -> None:
    assert parse_month("2026-07") == (2026, 7)
