# Task Packet: WEB-008

## 1. Summary

```text
Task: FE 파일 구조 분리와 state 경계 정리
Backlog ID: WEB-008
Parent Epic: EPIC-04
Type: feature/security
Owner: N187_정현우
Status: done
```

## 2. Goal

거대한 화면 파일을 기능별 component, hook, service로 나누면서 기존 사용자 동작을 보존한다.

## 3. Scope

- search/map/analysis/scene 기능 경계 정의
- App.tsx의 기능별 분리
- 서버 state와 UI state 책임 구분
- 기존 test와 접근성 상태 유지

## 4. Related Documents

- `docs/development/tasks.md`
- `docs/development/architecture.md`
- `docs/development/validation.md`
- `docs/issues/security-hardening-review.md`

## 5. Expected Changes

- 요청 범위의 code/config/test/document만 수정한다.
- 실제 secret, 사용자 촬영 원본과 로컬 절대 경로는 기록하지 않는다.

## 6. Acceptance Criteria

- [x] 검색·지도·분석 화면의 기존 동작이 유지된다.
- [x] 기능별 파일이 한 책임을 갖고 순환 import가 없다.
- [x] loading·empty·error state가 보존된다.
- [x] typecheck, lint, unit test와 build가 통과한다.

## 7. Verification Plan

```powershell
pnpm --dir product/apps/web typecheck
pnpm --dir product/apps/web lint
pnpm --dir product/apps/web test
pnpm --dir product/apps/web build
```

명령 성공과 완료 조건 충족을 구분해 Run Report에 기록한다.

## 8. Documentation Updates

- [x] `docs/development/tasks.md` 상태를 실제 결과로 갱신한다.
- [x] directory structure와 Run Report를 갱신한다.

## 9. Commit Plan

```text
refactor(web): split feature and state boundaries
```

## 10. Self-check

- [x] 범위 밖의 refactor나 dependency를 추가하지 않았다.
- [x] 사용자 변경과 secret을 덮어쓰거나 노출하지 않았다.
- [x] 최소 의미 검증과 남은 한계를 기록했다.
- [ ] ARCH-002 물리 폴더 이동 후 feature/service import 경계를 다시 검증한다.
