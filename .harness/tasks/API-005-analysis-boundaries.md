# Task Packet: API-005

## 1. Summary

```text
Task: 분석 조회·계산·response 조립 책임 분리
Backlog ID: API-005
Parent Epic: EPIC-08 / GitHub #63
Type: refactor
Owner: HyunKN
Status: done
```

## 2. Goal

시장·행정동 분석에서 DB row 조회, 순수 계산, provenance와 response 조립을 분리해 DB 없이 계산을 검증할 수 있게 한다.

## 3. Scope

포함: market analysis, admin-area analysis, search의 query·mapping·ranking 경계.

제외: 점수 공식 결과 변경, API URL·response schema 변경, 신규 지표 추가.

## 4. Related Documents

```text
docs/development/refactoring-standards.md
docs/features/market-score-methodology.md
GitHub #68
```

## 5. Expected Changes

```text
api: market_analysis.py, admin_area_analysis.py, market_search.py
tests: DB-independent calculation and response characterization
```

## 6. Acceptance Criteria

- [x] repository가 query 실행과 row 수집만 담당한다.
- [x] ranking·response 조립은 DB 없이 unit test 가능하다.
- [x] 기존 분석 fixture의 response 의미와 오류 contract가 유지된다.
- [x] API test, Ruff lint, structure check가 통과한다.

## 7. Verification Plan

```powershell
uv run --project product/apps/api pytest product/apps/api/tests
uv run --project product/apps/api ruff check product/apps/api/src product/apps/api/tests
python scripts/check_code_structure.py
```

## 8. Documentation Updates

- [x] Task Packet 생성
- [x] 각 단계의 검증과 Issue 진행 상태를 기록한다.

## 9. Commit Plan

```text
refactor(api): split search query mapping and ranking
refactor(api): isolate analysis response assembly
test(api): characterize analysis calculations
```

## 10. Self-check

- [x] 기능·점수 공식·API response를 바꾸지 않는다.
- [x] API characterization/unit test를 보강하고 전체 regression을 실행한다.
- [ ] TEST-001에서 새 환경의 API contract와 FE smoke를 반복 검증한다.

## Result

```text
- search: query, row mapping, ranking 분리
- admin-area: DB 조회, 순위·출처 계산, response 조립 분리
- market analysis: peer enrichment, ScoreMetric 생성, evidence·raw response 조립 분리
- DB 없이 peer 계산을 검증하는 unit test 추가
- API test 116개, Ruff, structure, Task Packet 검사 통과
```
