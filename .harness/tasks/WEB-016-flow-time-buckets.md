# Task Packet: WEB-016

## 1. Summary

```text
Task: 시간대 활동성 그래프의 실제 구간 정합성
Backlog ID: WEB-016
Type: bugfix
Status: in_progress
Parent issue: GitHub #42
Issue: GitHub #52
```

## 2. Goal

길단위인구 원천의 6개 시간 구간을 API contract에 이름과 함께 제공하고, 화면이 임의로 14개
시간값을 만들거나 24시를 넘는 label을 표시하지 않게 한다.

## 3. Scope

포함:

- `00:00-06:00`부터 `21:00-24:00`까지 실제 6개 구간 contract
- 구간 label과 nullable value 응답
- UI 막대·label·tooltip·접근 가능한 설명 정합성
- 구간 수와 마지막 label 회귀 test

제외:

- 시간별 원자료가 없는 구간의 보간
- 기간 선택
- 실시간 유동인구

## 4. Related Documents

- `docs/development/tasks.md`
- `.harness/runs/2026-07-19-WEB-016-flow-time-buckets.md`
- GitHub #42, #52

## 5. Expected Changes

```text
API: flow_time_buckets label/value contract
Web: 6개 실제 구간을 그대로 시각화
Tests: 구간 수, label, nullable value와 24시 초과 방지
```

## 6. Acceptance Criteria

- [x] API가 실제 6개 시간 구간 label과 값을 반환한다.
- [x] 누락 구간을 contract에서 nullable로 구분한다.
- [x] Web 막대 수·label·값이 API 구간과 일치한다.
- [x] 24시간을 넘는 label이 표시되지 않는다.
- [x] API·FE test와 build가 통과한다.

## 7. Verification Plan

```powershell
product/apps/api/.venv/Scripts/python.exe -m pytest product/apps/api/tests
product/apps/api/.venv/Scripts/python.exe -m ruff check product/apps/api/src product/apps/api/tests
pnpm --dir product --filter @localtwin/web test
pnpm --dir product --filter @localtwin/web typecheck
pnpm --dir product --filter @localtwin/web lint
pnpm --dir product --filter @localtwin/web build
python scripts/check_task_packet.py --root . --require
```

## 8. Documentation Updates

- [x] WEB-016 Task Packet 작성
- [x] WEB-016 Run Report 작성
- [ ] 공개 브라우저 검증 결과 기록
- [ ] GitHub #52 상태 동기화

## 9. Commit Plan

```text
feat(api): expose actual flow time buckets
fix(web): render actual flow time buckets
docs(web): record WEB-016 verification
```

## 10. Self-check

- [x] 원천에 없는 2시간 값을 새로 만들지 않는가?
- [x] 누락 값을 0으로 단정하지 않는가?
- [x] label과 값의 순서가 API contract와 같은가?
- [x] 사용자 소유 파일과 secret을 건드리지 않았는가?
