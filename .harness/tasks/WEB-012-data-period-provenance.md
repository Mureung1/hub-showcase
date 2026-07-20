# Task Packet: WEB-012

## 1. Summary

```text
Task: 데이터별 기준 시점과 출처를 함께 표시
Backlog ID: WEB-012
Type: feature
Status: done
Parent issue: GitHub #42
Issue: GitHub #45
```

## 2. Goal

상권 분석, 행정동 배후통계와 개별 점포 snapshot의 기준 시점이 서로 다름을 API와 화면에서
분리해 표시하고, 사용자가 모든 숫자를 같은 날짜의 자료로 오해하지 않게 한다.

## 3. Scope

포함:

- 반경 점포 응답의 source snapshot·provider·dataset·period·수집 시점
- 상권·행정동·개별 점포별 source, period, geography 요약
- 원천마다 갱신 주기가 다름을 설명하는 안내
- 현재 기간 선택 기능이 없음을 명시

제외:

- 서로 다른 원천을 임의의 공통 날짜로 보간
- 과거 기간 선택과 시계열 조회 API
- production Supabase 생성과 공개 재배포

## 4. Related Documents

- `docs/development/tasks.md`
- `.harness/runs/2026-07-16-WEB-012-data-period-provenance.md`
- GitHub #42 `0716 이슈 모음`
- GitHub #45 `[WEB-012] 데이터별 기준 시점과 출처를 함께 표시`

## 5. Expected Changes

```text
nearby API: source snapshot provenance를 응답 contract에 포함
evidence modal: source별 period와 geography를 하나의 목록으로 표시
tests: API evidence, period format, source deduplication과 안내 문구 검증
```

## 6. Acceptance Criteria

- [x] 반경 점포 API가 실제 적재 snapshot의 period를 반환한다.
- [x] 상권 분석·행정동 통계·개별 점포의 source와 period를 구분한다.
- [x] 상권·행정동·개별 점포의 공간 단위를 함께 표시한다.
- [x] 자료를 같은 날짜로 강제하지 않았음을 설명한다.
- [x] 기간 선택 기능은 아직 지원하지 않음을 명시한다.
- [x] DB 경로나 credential은 evidence 응답에 포함하지 않는다.
- [x] API/Web test·typecheck·lint·build가 통과한다.

## 7. Verification Plan

```powershell
product/apps/api/.venv/Scripts/python.exe -m pytest product/apps/api/tests
product/apps/api/.venv/Scripts/python.exe -m ruff check product/apps/api/src product/apps/api/tests
pnpm --dir product --filter @localtwin/web test
pnpm --dir product --filter @localtwin/web typecheck
pnpm --dir product --filter @localtwin/web lint
pnpm --dir product --filter @localtwin/web build
python scripts/check_task_packet.py --root . --require
git diff --check
```

## 8. Documentation Updates

- [x] WEB-012 결과를 백로그에 기록
- [x] API와 실제 브라우저 검증 결과 기록
- [x] 기간 선택은 후속 범위로 유지

## 9. Commit Plan

```text
feat(api): expose nearby store source provenance
feat(web): show source-specific data periods
docs(web): record data period provenance result
```

## 10. Self-check

- [x] 서로 다른 원천의 기간을 하나의 기준일로 보이게 만들지 않았는가?
- [x] source period와 geography를 실제 API 응답에서 사용했는가?
- [x] raw file path와 secret을 응답에 포함하지 않았는가?
- [x] 사용자 소유 파일과 production 설정을 건드리지 않았는가?
- [ ] production DB 연결 뒤 공개 Vercel에서 같은 목록을 재검증했는가?
