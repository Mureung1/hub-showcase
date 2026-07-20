# Task Packet: WEB-010

## 1. Summary

```text
Task: 첫 진입 neutral state와 stale 점포 선택 해제
Backlog ID: WEB-010
Type: bugfix
Status: done
Parent issue: GitHub #42
Issue: GitHub #43
```

## 2. Goal

사용자가 점포를 고르기 전에 임의의 첫 점포를 분석 대상으로 표시하지 않고, 반경·분석 기준·중심이
바뀌면 이전 조건의 점포 정보가 새 결과처럼 남지 않게 한다.

## 3. Scope

포함:

- query string 없는 첫 진입의 점포 미선택 상태
- 실제 사용자 조작 뒤에만 URL filter state 기록
- 반경·분석 기준·중심·업종·상권 변경 시 점포 선택 해제
- radius API loading·empty·error에서 정적 점포 fallback 제거
- radius API 응답이 없을 때 동일 업종 수를 0으로 명시

제외:

- production DB 연결
- 상권·행정동 분석 기준 재설계
- 데이터 기간 선택 UI
- 사용자 안내 문구와 지표 추천 순서 개편

## 4. Related Documents

- `docs/development/tasks.md`
- `.harness/runs/2026-07-16-WEB-010-neutral-store-selection.md`
- GitHub #42 `0716 이슈 모음`
- GitHub #43 `[WEB-010] 첫 진입 neutral state와 stale 점포 선택 해제`

## 5. Expected Changes

```text
App state: selected store를 nullable explicit selection으로 변경
radius data: API 응답만 점포 목록과 집계에 사용
URL: 첫 진입에는 / 유지, 사용자 조작 뒤 state 동기화
inspector/map/filter: 점포 미선택 상태 지원
tests: initial neutral state와 radius change regression 추가
```

## 6. Acceptance Criteria

- [x] query string 없는 첫 진입에서 점포 marker·card가 자동 선택되지 않는다.
- [x] 첫 진입 URL은 `/`로 유지된다.
- [x] 사용자가 filter를 조작하면 URL state가 동기화된다.
- [x] 반경·분석 기준·중심 변경 시 이전 점포 선택이 해제된다.
- [x] radius API 오류를 정적 점포와 상권 집계로 숨기지 않는다.
- [x] 점포가 없어도 상권 단위 inspector는 유지된다.
- [x] FE 전체 test·typecheck·lint·build가 통과한다.

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

- [x] WEB-010 backlog 결과 기록
- [x] Run Report 작성
- [x] GitHub #42의 세부 버그를 독립 Issue로 추적

## 9. Commit Plan

```text
fix(web): clear stale store selection across analysis changes
docs(web): record neutral selection regression result
```

## 10. Self-check

- [x] 선택 해제가 API 결과를 임의의 mock으로 대체하지 않는가?
- [x] 직접 선택한 점포는 정상적으로 marker와 inspector에 표시되는가?
- [x] 기존 URL deep link는 계속 읽을 수 있는가?
- [x] 사용자 소유 파일과 배포 secret을 건드리지 않았는가?
- [ ] production DB 연결 뒤 공개 Vercel에서 같은 시나리오를 재검증했는가?
