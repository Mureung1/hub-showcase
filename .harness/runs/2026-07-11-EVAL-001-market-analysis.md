# Run Report: EVAL-001 market analysis

## Summary

```text
Task: EVAL-001
Status: passed
Date: 2026-07-11
```

## Verification

```powershell
uv run --directory apps/api python ../../scripts/evaluate_market_analysis.py --output ../../.harness/evaluations/2026-07-11-market-analysis-v1.json
```

```text
12/12 cases evaluated
0 failures
score range 28.3..51.5
confidence range 49.6..49.6
cluster: ordinary 7, specialized_watch 4, saturated_cluster 1
decision: insufficient_evidence 12
```

## Interpretation

```text
재현성, snapshot 일치와 데이터 계약은 통과했다.
이 평가는 실제 창업 성공 예측 정확도를 검증하지 않는다.
모든 case의 근거 신뢰도가 낮으므로 화면에서 점수보다 누락 지표와 원자료를 먼저 보게 한다.
```

## Next Action

```text
반경 query와 추가 지표를 연결한 뒤 confidence 분포를 다시 평가한다.
실제 outcome label을 확보하기 전에는 predictive accuracy를 주장하지 않는다.
```
