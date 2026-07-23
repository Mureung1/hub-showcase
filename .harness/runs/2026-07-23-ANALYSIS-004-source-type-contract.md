# ANALYSIS-004 Run Report — source type contract

## Implemented slice

The market analysis evidence contract now distinguishes:

- `official`: Seoul market store and opening/closure aggregate.
- `official_estimate`: Seoul estimated sales and street-level population aggregate.
- `derived`: calculations such as per-store sales, density and ratios.

The six existing time labels remain the provider's actual time buckets. This change does not create a synthetic 300m sales or foot-traffic value and does not change the `/en` page UI.

## Verification

```text
pytest tests/test_market_analysis.py
8 passed

pnpm --dir product/apps/web typecheck
pnpm --dir product/apps/web test -- --run src/features/analysis/DataPeriodSummary.test.tsx
1 test passed
```
