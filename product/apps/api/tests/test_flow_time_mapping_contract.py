import sqlite3

from localtwin_api.canonical_db import SCHEMA, persist_flow_metric_rows
from localtwin_api.market_analysis import FLOW_TIME_BUCKETS, analyze_market


def test_source_columns_keep_the_same_order_in_canonical_and_api(tmp_path) -> None:
    database = tmp_path / "flow-mapping.db"
    source_row = {
        "TRDAR_CD": "M1",
        "STDR_YYQU_CD": "20251",
        "TOT_FLPOP_CO": "2100",
        "TMZON_00_06_FLPOP_CO": "100",
        "TMZON_06_11_FLPOP_CO": "200",
        "TMZON_11_14_FLPOP_CO": "300",
        "TMZON_14_17_FLPOP_CO": "400",
        "TMZON_17_21_FLPOP_CO": "500",
        "TMZON_21_24_FLPOP_CO": "600",
    }

    with sqlite3.connect(database) as connection:
        connection.executescript(SCHEMA)
        connection.execute(
            "INSERT INTO data_sources VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "source",
                "서울 열린데이터광장",
                "서울시 상권분석서비스(길단위인구-상권)",
                "official_estimate",
                "https://data.seoul.go.kr/",
                "2026-07-28T00:00:00Z",
                "20251",
                1,
                "sha",
                "raw/flow.json",
            ),
        )
        connection.execute(
            "INSERT INTO markets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "M1",
                "테스트 상권",
                "A",
                "골목상권",
                "11440",
                "마포구",
                "A1",
                "연남동",
                0,
                0,
                "source",
                100_000,
                "source",
            ),
        )
        connection.execute(
            "INSERT INTO store_metrics VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ("M1", "20251", "CS100010", "카페", 1, 1, 0, 0, 0, 0, 0, "source"),
        )
        persist_flow_metric_rows(connection, [source_row], {"M1"}, "source")
        connection.commit()

    result = analyze_market("M1", "카페", database=database)

    assert [label for label, _ in FLOW_TIME_BUCKETS] == [
        "00:00-06:00",
        "06:00-11:00",
        "11:00-14:00",
        "14:00-17:00",
        "17:00-21:00",
        "21:00-24:00",
    ]
    assert [bucket.value for bucket in result.raw.flow_time_buckets] == [
        100,
        200,
        300,
        400,
        500,
        600,
    ]


def test_midnight_bucket_is_not_normalized_or_moved(tmp_path) -> None:
    database = tmp_path / "flow-midnight.db"

    with sqlite3.connect(database) as connection:
        connection.executescript(SCHEMA)
        connection.execute(
            "INSERT INTO data_sources VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "source",
                "서울 열린데이터광장",
                "서울시 상권분석서비스(길단위인구-상권)",
                "official_estimate",
                "https://data.seoul.go.kr/",
                "2026-07-28T00:00:00Z",
                "20251",
                1,
                "sha",
                "raw/flow.json",
            ),
        )
        connection.execute(
            "INSERT INTO markets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "M1",
                "테스트 상권",
                "A",
                "골목상권",
                "11440",
                "마포구",
                "A1",
                "연남동",
                0,
                0,
                "source",
                100_000,
                "source",
            ),
        )
        connection.execute(
            "INSERT INTO store_metrics VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ("M1", "20251", "CS100010", "카페", 1, 1, 0, 0, 0, 0, 0, "source"),
        )
        persist_flow_metric_rows(
            connection,
            [
                {
                    "TRDAR_CD": "M1",
                    "STDR_YYQU_CD": "20251",
                    "TOT_FLPOP_CO": "9999",
                    "TMZON_00_06_FLPOP_CO": "9999",
                    "TMZON_06_11_FLPOP_CO": "1",
                    "TMZON_11_14_FLPOP_CO": "2",
                    "TMZON_14_17_FLPOP_CO": "3",
                    "TMZON_17_21_FLPOP_CO": "4",
                    "TMZON_21_24_FLPOP_CO": "5",
                }
            ],
            {"M1"},
            "source",
        )
        connection.commit()

    result = analyze_market("M1", "카페", database=database)

    assert result.raw.flow_time_buckets[0].label == "00:00-06:00"
    assert result.raw.flow_time_buckets[0].value == 9999
    assert result.raw.flow_time_buckets[1].value == 1
