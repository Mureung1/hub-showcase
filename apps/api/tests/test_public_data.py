import json

import pytest

from localtwin_api.public_data import (
    SOURCES,
    PublicDataError,
    build_request_url,
    extract_rows,
    request_params,
)


def test_build_request_url_keeps_secret_out_of_params() -> None:
    params = request_params(SOURCES["stores"], 1, 20, 126.9, 37.5, 300, "마포구")
    url = build_request_url(SOURCES["stores"], "abc%2B123", params)

    assert "serviceKey=abc%2B123" in url
    assert "cx=126.9" in url
    assert "serviceKey" not in params


def test_food_source_enforces_provider_page_limit() -> None:
    with pytest.raises(ValueError, match="between 1 and 100"):
        request_params(SOURCES["restaurants"], 1, 101, 126.9, 37.5, 300, "마포구")


def test_extract_rows_supports_food_response() -> None:
    payload = {
        "response": {
            "header": {"resultCode": "00", "resultMsg": "NORMAL"},
            "body": {"totalCount": 1, "items": {"item": [{"MNG_NO": "A1"}]}},
        }
    }

    assert extract_rows(payload) == (1, [{"MNG_NO": "A1"}])


def test_extract_rows_rejects_provider_error() -> None:
    payload = {"response": {"header": {"resultCode": "-4", "resultMsg": "bad key"}}}
    with pytest.raises(PublicDataError, match="-4 - bad key"):
        extract_rows(payload)


def test_snapshot_shape_does_not_require_raw_response() -> None:
    serialized = json.dumps({"rows": [{"bizesId": "S1"}]})
    assert "serviceKey" not in serialized
