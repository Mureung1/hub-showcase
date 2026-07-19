# Task Packet: DATA-011

## 1. Summary

```text
Task: 완결 분석 분기 조회와 기간 선택
Backlog ID: DATA-011
Type: API and web data policy
Status: complete
Parent issue: GitHub #42
Issue: GitHub #50
```

## 2. Goal

점포·매출·유동인구가 함께 적재된 완결 분기만 선택 가능하게 하고, 최신 완결 분기를 기본값으로 사용한다.

## 3. Scope

포함: 기간 목록 API, URL period, 단일 기간 disabled selector, 기간별 재조회.

제외: 원천별 날짜를 강제로 동일하게 만들기, 미완결 분기 추정, 자동 수집 schedule.

## 4. Related Documents

- `docs/development/tasks.md`
- `.harness/runs/2026-07-19-DATA-011-analysis-period-policy.md`
- GitHub #50

## 5. Expected Changes

```text
api: complete analysis periods contract
web: selected period in request and URL
ui: period selector and source-specific evidence dates
```

## 6. Acceptance Criteria

- [x] API가 세 핵심 dataset이 함께 있는 분기만 반환한다.
- [x] 최신 완결 분기가 default로 지정된다.
- [x] Web 선택과 URL이 같은 period를 사용한다.
- [x] 기간이 하나면 selector가 비활성화된다.
- [x] test, lint, typecheck, build가 통과한다.

## 7. Verification Plan

```powershell
uv run --project product/apps/api pytest product/apps/api/tests/test_market_analysis.py -q
uv run --project product/apps/api ruff check product/apps/api/src product/apps/api/tests
pnpm --dir product --filter @localtwin/web test
```

## 8. Documentation Updates

- [x] DATA-011 Task Packet 작성
- [x] DATA-011 Run Report 작성
- [ ] GitHub #50 상태 동기화

## 9. Commit Plan

```text
feat(api): expose complete analysis periods
feat(web): select complete analysis periods
```

## 10. Self-check

- [x] 데이터가 없는 분기를 0으로 표시하지 않는가?
- [x] source별 기준일을 evidence에서 유지하는가?
- [x] secret이나 사용자 파일을 건드리지 않았는가?
