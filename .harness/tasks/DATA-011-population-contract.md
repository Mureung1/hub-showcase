# Task Packet: DATA-011 상권·행정동 인구 계약

## 1. Summary

```text
Task: 상권·행정동 주거·직장인구 API와 화면 연결
Status: done
GitHub Issue: #40
```

## 2. Goal

서울시 상권 인구와 KOSIS 행정동 배후통계를 공간 단위·기간·출처가 드러나는 계약으로 제공한다.

## 3. Scope

- 서울시 상권 상주·직장인구 2025년 1분기
- KOSIS 행정동 주민·사업체·종사자 과거 통계
- Alembic migration, development Supabase import, API와 FE

## 4. Related Documents

- `docs/development/tasks.md`
- `.harness/runs/2026-07-16-DATA-011-market-admin-population.md`

## 5. Expected Changes

- 출처 snapshot과 상권 인구 table
- 상권·행정동 배후통계 endpoint와 화면 근거

## 6. Acceptance Criteria

- [x] 지원 상권 3개의 상주·직장인구를 적재한다.
- [x] 상권과 행정동 값을 별도 공간 단위로 표시한다.
- [x] 과거 자료를 현재값처럼 표시하지 않는다.
- [x] provider 오류를 0으로 숨기지 않는다.

## 7. Verification Plan

- 합계 일치·idempotency·FK·source metadata test
- API·FE 전체 회귀와 실제 Supabase 조회

## 8. Documentation Updates

- [x] Run Report와 backlog 상태를 갱신한다.

## 9. Commit Plan

```text
feat(data): add market population evidence
```

## 10. Self-check

- [x] 공간 단위와 기간을 화면에서 구분했는가?
- [x] 비밀정보와 개인 절대경로를 저장하지 않았는가?
- [ ] 변경사항을 commit·push하고 GitHub Issue에 commit을 연결했는가?
