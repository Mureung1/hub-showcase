# Task Packet: EVAL-001

## 1. Summary

```text
Task: canonical market analysis evaluation
Backlog ID: EVAL-001
Parent Epic: EPIC-06
Type: evaluation
Owner: N187_정현우
Status: done
```

## 2. Goal

배포 snapshot과 API 계산 결과가 같고, 12개 상권·업종 응답이 재현성·범위·출처·근거 판정 gate를 통과하는지 한 명령으로 확인한다.

## 3. Scope

포함:

```text
3개 상권 x 4개 업종 12 case
deterministic response
deploy snapshot equality
score/confidence range
점포·6개 시간대·source metadata
업종별 상권 구분력
```

제외:

```text
점수 가중치가 실제 창업 성과를 예측한다는 검증
미래 기간 backtest
반경별 spatial query 평가
```

## 4. Related Documents

```text
docs/features/market-analysis.md
docs/features/market-score-methodology.md
docs/development/tasks.md
```

## 5. Expected Changes

```text
product/scripts/evaluate_market_analysis.py
.harness/evaluations/2026-07-11-market-analysis-v1.json
evaluation Run Report와 backlog status
```

## 6. Acceptance Criteria

- [x] 12개 case를 빠짐없이 평가한다.
- [x] 같은 입력의 응답이 deterministic하다.
- [x] deploy snapshot과 canonical response가 같다.
- [x] score/confidence가 0~100 범위다.
- [x] 점포·시간대·source metadata가 비어 있지 않다.
- [x] 실패 시 non-zero exit code를 반환한다.

## 7. Verification Plan

```powershell
uv run --directory product/apps/api python ../../product/scripts/evaluate_market_analysis.py
uv run --directory product/apps/api pytest
```

## 8. Documentation Updates

- [x] 평가 JSON을 repository에 저장했다.
- [x] Run Report에 결과와 해석 한계를 기록했다.
- [x] 백로그 EVAL-001을 갱신했다.

## 9. Commit Plan

```text
test(analysis): evaluate canonical market responses
```

## 10. Self-check

- [x] 스크립트 통과를 예측 정확도 검증이라고 부르지 않았는가?
- [x] 낮은 confidence와 insufficient evidence를 그대로 남겼는가?
- [x] 실패 목록을 숨기지 않았는가?
- [ ] 후속: 실제 창업 결과 label이 확보되면 backtest를 별도 설계한다.
