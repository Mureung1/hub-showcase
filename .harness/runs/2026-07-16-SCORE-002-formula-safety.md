# Run Report: SCORE-002 formula safety

## Summary

```text
Task: SCORE-002
Status: passed
Date: 2026-07-16
Formula: 1.0.0 -> 1.1.0
```

## Scope

```text
누락 metric을 component coverage만큼 50점 중립값으로 수축했다.
fixture를 score, coverage, confidence와 metric reason에서 제외하고 hard blocker로 처리했다.
known, unknown, administrative_population 표본 의미와 metric별 freshness policy를 분리했다.
coverage, confidence, 필수 지표, peer 표본과 cluster 근거 blocker를 추가했다.
집적효과 raw adjustment에 실제 근거 confidence를 적용하고 최종 ±8 범위를 유지했다.
API additive field를 React type과 근거 dialog에 연결했다.
```

## Changed Artifacts

```text
product/apps/api/src/localtwin_api/market_score.py
product/apps/api/src/localtwin_api/market_analysis.py
product/apps/api/tests/test_market_score.py
product/apps/api/tests/test_market_analysis.py
product/apps/web/src/services/marketAnalysis.ts
product/apps/web/src/services/marketAnalysis.test.ts
product/apps/web/src/App.tsx
product/apps/web/public/data/market-analysis.json
product/scripts/evaluate_market_analysis.py
docs/features/market-score-methodology.md
docs/development/tasks.md
.harness/tasks/SCORE-002-formula-safety.md
```

## Canonical Evaluation

```text
evaluated cases: 12
failures: 0
score: 37.6~53.1
confidence: 52.0
coverage: 55.0
decision: insufficient_evidence 12
blockers: coverage_below_60 12, confidence_below_60 12
clusters: ordinary 7, specialized_watch 4, saturated_cluster 1
fixture blocker: 0
peer sample blocker: 0
```

## 1.0.0 Comparison

```text
1.0.0 score range: 28.3~51.5
1.1.0 score range: 37.6~53.1
case delta range: -0.2~+10.9
```

낮은 일부 관측값만 전체 component를 대표하던 case가 50점 방향으로 수축하면서 주로 상승했다.
이는 성능 개선이 아니라 누락 근거의 과대대표를 막기 위한 안전성 변화다. 12개 case 모두 coverage와
confidence 기준을 넘지 못하므로 최종 판정은 계속 `insufficient_evidence`다.

## Verification

```text
API Ruff check: passed
SCORE-002 changed-file Ruff format check: passed
API tests: 89 passed
FE typecheck: passed
FE lint: passed
FE tests: 28 passed
FE production build: passed
Canonical evaluation: 12/12 passed
Task Packet check: passed
Docs HTML/link check: passed
git diff --check: passed
```

Repo 전체 `ruff format --check .`는 SCORE-002 범위 밖의 기존 7개 파일을 reformat 대상으로
보고한다. 이번 작업에서는 관련 없는 사용자 변경을 보존하기 위해 해당 파일을 수정하지 않았다.

## Known Limitations

```text
현재 canonical score input은 configured metric 11개 중 5개만 제공해 coverage가 55%다.
따라서 화면에 점수는 표시하지만 근거가 충분한 비교 판단이라고 표시하지 않는다.
업종별 weight와 threshold calibration은 SCORE-003의 과거 결과 검증 전에는 적용하지 않는다.
이 점수는 창업 성공 확률이나 투자 권고가 아니다.
```
