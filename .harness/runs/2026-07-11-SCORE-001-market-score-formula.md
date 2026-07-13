# Run Report: SCORE-001 market score formula

## Summary

```text
Task: SCORE-001
Status: passed
Date: 2026-07-11
```

## Scope

```text
동종 상권 peer percentile을 사용하는 5개 component 점수를 구현했다.
점수와 별개로 coverage, 출처 신뢰도, 최신성, 표본을 반영한 confidence를 계산한다.
동일 업종 밀집을 생산적 집적, 관찰 필요, 과포화로 구분하고 최대 ±8점만 보정한다.
공식 version, 근거, 한계가 포함된 평가 API를 추가했다.
```

## Changed Artifacts

```text
apps/api/src/localtwin_api/market_score.py
apps/api/src/localtwin_api/main.py
apps/api/tests/test_market_score.py
docs/features/market-score-methodology.md
docs/features/market-analysis.md
.harness/tasks/SCORE-001-market-score-formula.md
```

## Verification

```powershell
uv run --directory apps/api ruff check .
uv run --directory apps/api ruff format --check .
uv run --directory apps/api pytest
python scripts/check_docs_html.py
python scripts/check_task_packet.py --root .
```

Result:

```text
Ruff passed.
API tests: 11 passed.
Docs HTML and local link check passed.
Task packet check passed.
```

## Notes

```text
이 점수는 성공 확률이 아니라 비교 집단 안에서의 근거 기반 상태 점수다.
실제 서비스에서는 fixture 대신 같은 분기·업종·상권유형·반경의 DB 분포를 연결해야 한다.
```

## Follow-up

```text
DATA-002에서 실제 source provenance와 peer distribution을 저장한다.
Front에서는 총점보다 component, 근거, confidence를 함께 보여준다.
```
