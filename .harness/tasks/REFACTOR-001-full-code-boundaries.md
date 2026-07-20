# Task Packet: REFACTOR-001

## 1. Summary

```text
Task: 전체 코드 책임 경계 리팩터링 및 자동 품질 규칙
Backlog ID: REFACTOR-001
Parent Epic: EPIC-08 / GitHub #63
Type: refactor
Owner: HyunKN
Status: in_progress
```

## 2. Goal

전체 제품 코드의 현재 contract와 사용자 동작을 보존하면서 Web, API, Data와 Scene의 책임을 분리하고,
새 코드가 같은 구조 문제를 만들지 못하도록 local/CI 검사를 강제한다.

## 3. Scope

포함:

```text
ARCH-003, ARCH-004
WEB-018, WEB-019
API-004, API-005
DATA-013, SCENE-008
TEST-001
```

제외:

```text
새 사용자 기능
점수 공식 변경
서울 전체 검색 확대
외부 dependency와 생성 artifact 수정
```

## 4. Related Documents

```text
docs/development/refactoring-standards.md
docs/development/architecture.md
docs/development/tasks.md
docs/development/validation.md
GitHub #63, #62, #64~#71
```

## 5. Expected Changes

예상 변경 영역:

```text
api: app factory, routers, services, repositories, importer, scene pipeline
web: App orchestration, hooks, services, map, filters, inspector, scene UI
data: catalog, period, manifest와 importer 단계
docs: architecture, standards, backlog와 Run Reports
tests: characterization, unit, integration, architecture boundary와 smoke
scripts: structure ratchet와 full check 연결
```

## 6. Acceptance Criteria

- [ ] GitHub #63의 모든 하위 Issue가 검증 증거와 함께 종료된다.
- [ ] runtime hardcoding과 production fixture fallback이 제거된다.
- [ ] Web/API/Data/Scene의 책임 경계가 표준 문서와 일치한다.
- [ ] 전체 자동 검사와 공개 핵심 흐름 smoke가 통과한다.
- [ ] 새 구조 위반이 local check에서 실패한다.

## 7. Verification Plan

실행할 검증 명령:

```powershell
pnpm --dir product check
powershell -ExecutionPolicy Bypass -File scripts/check.ps1
git diff --check
```

수동 확인:

```text
neutral entry -> search -> select -> map -> analysis -> evidence
mobile panels and keyboard dialogs
Vercel Web -> Render API -> production Supabase
product Scene route 404
```

## 8. Documentation Updates

- [x] 코드/스크립트 변경 시 관련 문서 또는 `.harness` 기록을 같은 커밋에 포함
- [x] README 링크 필요 여부 확인
- [x] 기능 spec 갱신 범위 확인
- [x] data mapping 갱신 범위 확인
- [x] checklist 갱신
- [x] decision/failure log 필요 여부 확인

## 9. Commit Plan

예상 커밋 메시지:

```text
chore(arch): enforce refactoring structure budgets
refactor(web): remove runtime fixtures and split app orchestration
refactor(api): split routers and analysis services
refactor(data): split import and spatial pipelines
refactor(scene): split scene UI and job pipeline
test(release): verify full refactoring regression
```

## 10. Self-check

- [x] 한 기능/한 버그/한 문서 단위인가?
- [x] 관련 없는 파일을 변경하지 않았는가?
- [ ] 검증 결과를 기록했는가?
- [ ] 문서와 체크리스트가 실제 변경과 일치하는가?
- [x] known limitation이 있으면 적었는가?
