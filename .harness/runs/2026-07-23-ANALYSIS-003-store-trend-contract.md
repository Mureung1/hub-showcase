# ANALYSIS-003 Run Report — quarterly store trend contract

## Implemented slice

`/api/v1/markets/{market_id}/store-trend` returns only actual `store_metrics` periods for the requested market and category. Each point includes official source metadata, quarterly unit, and the declared aggregation method.

## Important missing-data rule

The response keeps operating duration explicitly `unavailable`. The current canonical dataset does not yet connect a complete permit-business start/closure history to a market polygon, so calculating a duration would be invented data. `0`, missing and insufficient source coverage remain separate states.

## Verification

```text
pytest tests/test_market_analysis.py
8 passed
```

The test inserts three actual quarterly store-metric rows and verifies that only `20251`, `20252`, `20253` are returned, with no invented monthly points.
