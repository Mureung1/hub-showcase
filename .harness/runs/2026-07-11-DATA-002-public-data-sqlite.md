# Run Report: DATA-002 public data and SQLite

## Summary

```text
Task: DATA-002
Status: passed
Date: 2026-07-11
```

## Actual Public API Result

| Source | Saved | Provider total | Truncated |
| --- | ---: | ---: | --- |
| Store radius | 20 | 1,965 | yes |
| General restaurants in Mapo-gu | 20 | 19,895 | yes |
| Rest cafes in Mapo-gu | 20 | 5,664 | yes |

```text
PUBLIC_DATA_SERVICE_KEY configured: true
secret value in snapshot: false
serviceKey field in snapshot: false
```

## Canonical SQLite Result

| Table | Rows |
| --- | ---: |
| data_sources | 7 |
| markets | 1,650 |
| store_metrics | 76,383 |
| sales_metrics | 21,427 |
| flow_metrics | 1,650 |
| store_points | 20 |
| permit_businesses | 40 |

Database size: 16,691,200 bytes.

## Verification

```powershell
uv run --directory apps/api ruff check .
uv run --directory apps/api pytest
uv run --directory apps/api python -m localtwin_api.public_data --rows 20
uv run --directory apps/api python -m localtwin_api.canonical_db
uv run --directory apps/api python -m localtwin_api.canonical_db
```

Result:

```text
API tests: 18 passed.
Ruff passed.
Official three-source collection passed.
Two SQLite imports returned identical counts.
```

## Notes

```text
Raw and processed data remain ignored and are not pushed to Git.
서울 매출과 유동인구는 official_estimate provenance를 유지한다.
인허가 X/Y는 EPSG:5174로 보존하며 WGS84로 가장하지 않는다.
```

## Follow-up

```text
API-002에서 SQLite repository query와 /api/v1/markets response를 연결한다.
실제 운영 갱신 주기와 raw snapshot 보존 기간은 별도 결정한다.
```
