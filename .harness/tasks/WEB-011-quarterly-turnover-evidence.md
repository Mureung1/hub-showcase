# Task Packet: WEB-011

## 1. Summary

```text
Task: 고정 개폐업 그래프 제거와 실제 분기 집계 표시
Backlog ID: WEB-011
Type: bugfix
Status: done
Parent issue: GitHub #42
Issue: GitHub #44
```

## 2. Goal

실제 기간별 자료처럼 보이던 고정 12개 막대를 제거하고, API가 제공하는 선택 분기의 개업·폐업
건수와 기간만 표시해 사용자가 데이터 범위를 오해하지 않게 한다.

## 3. Scope

포함:

- `analysis.period`의 연도·분기 표시
- `opening_count`, `closure_count` 실제 값 비교
- 분기 순증 계산
- 월별 추이가 아니라 분기 합계임을 명시
- API 분석이 없을 때 집계 unavailable 상태 표시

제외:

- 월별·분기별 time-series API
- 기간 선택 UI
- ANALYSIS-003 기간별 변화 계산
- 운영 DB 연결과 공개 재배포

## 4. Related Documents

- `docs/development/tasks.md`
- `.harness/runs/2026-07-16-WEB-011-quarterly-turnover-evidence.md`
- GitHub #42 `0716 이슈 모음`
- GitHub #44 `[WEB-011] 고정 개폐업 그래프 제거와 실제 분기 집계 표시`
- `ANALYSIS-003` 개업·폐업·영업기간 변화 계산

## 5. Expected Changes

```text
inspector: fake monthly-looking bars -> real quarterly totals
styles: two labeled horizontal comparison bars
tests: period, counts, net count, note, fake trend absence
```

## 6. Acceptance Criteria

- [x] 고정 12개 막대가 제거된다.
- [x] API의 개업·폐업 건수만 표시한다.
- [x] `20251`을 `2025년 1분기`로 읽을 수 있게 표시한다.
- [x] 두 값의 기준이 선택 분기 합계임을 설명한다.
- [x] 순증 값은 실제 개업 수와 폐업 수의 차이로 계산한다.
- [x] 분석 응답이 없을 때 예시 수치로 대체하지 않는다.
- [x] FE test·typecheck·lint·build가 통과한다.

## 7. Verification Plan

```powershell
pnpm --dir product --filter @localtwin/web test
pnpm --dir product --filter @localtwin/web typecheck
pnpm --dir product --filter @localtwin/web lint
pnpm --dir product --filter @localtwin/web build
python scripts/check_task_packet.py --root . --require
git diff --check
```

## 8. Documentation Updates

- [x] WEB-011 결과를 백로그에 기록
- [x] 실제 브라우저 검증 결과 기록
- [x] 월별 추이는 ANALYSIS-003 후속 범위로 유지

## 9. Commit Plan

```text
fix(web): replace fake turnover trend with quarterly evidence
docs(web): record quarterly turnover evidence scope
```

## 10. Self-check

- [x] 막대 높이나 순서로 존재하지 않는 시계열을 암시하지 않는가?
- [x] source period와 실제 API count를 사용했는가?
- [x] 0건과 데이터 미수집을 구분하는가?
- [x] 사용자 소유 파일과 secret을 건드리지 않았는가?
- [ ] production DB 연결 뒤 공개 Vercel에서 같은 카드를 재검증했는가?
