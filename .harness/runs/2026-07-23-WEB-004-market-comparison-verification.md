# WEB-004 Run Report — market comparison verification

## Existing product behavior verified

The comparison dialog requests all supported markets through `loadMarketComparison`. The caller passes the selected category and period once, and each market request receives those same values. The dialog displays score, quarterly flow aggregate and net opening count, then selecting a row changes the active market.

## Regression coverage

The service test verifies that the three market requests contain the same encoded category and `period=20251`. This checks the comparison criterion, not a static mock-only score.

## Boundary

The comparison surface is existing Korean product functionality. No `/en` page markup or behavior was changed in this verification.
