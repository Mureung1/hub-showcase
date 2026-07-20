# Task Packet: WEB-018

## 1. Summary

```text
Task: App orchestration·state·URL·map 책임 분리
Backlog ID: WEB-018
Parent Epic: EPIC-08 / GitHub #63
Type: refactor
Owner: HyunKN
Status: in_progress
```

## 2. Goal

`ProductWorkspace`를 page 조립자로 축소하고 dialog/panel, 분석 선택, URL 동기화, 점포 선택과 지도
viewport 상태를 독립 hook/component에서 관리한다.

## 3. Scope

포함:

```text
기존 App characterization test 유지·보강
dialog와 좌우 panel focus/state hook
분석 조건과 URL sync hook
점포·검색 선택 hook
지도 viewport와 분석 중심 이동 hook
MarketMap 렌더링 component
```

제외:

```text
화면 디자인과 사용자 기능 변경
MarketFilters·MarketInspector 내부 section 분리
API contract와 분석 공식 변경
```

## 4. Related Documents

```text
docs/development/refactoring-standards.md
docs/development/tasks.md
.harness/tasks/REFACTOR-001-full-code-boundaries.md
GitHub #65
```

## 5. Expected Changes

예상 변경 영역:

```text
web: App 조립, feature hooks, map component
tests: hook unit와 App characterization
docs: backlog와 run report
api/data/scripts: 없음
```

## 6. Acceptance Criteria

- [ ] App에 business dataset과 API 변환 로직이 없다.
- [ ] URL·지도·검색·panel 상태를 각각 독립 테스트할 수 있다.
- [ ] neutral initial URL과 선택 흐름이 유지된다.
- [ ] stale 점포와 지원 밖 분석 중심이 남지 않는다.
- [ ] `ProductWorkspace` 임시 budget이 제거된다.

## 7. Verification Plan

실행할 검증 명령:

```powershell
pnpm --dir product/apps/web test
pnpm --dir product/apps/web run typecheck
pnpm --dir product/apps/web run lint
pnpm --dir product/apps/web run build
powershell -ExecutionPolicy Bypass -File scripts/check.ps1
```

수동 확인:

```text
초기 URL, 상권·업종·반경 선택, 검색 결과, 지도 중심 이동, panel/dialog focus 복원을 확인한다.
```

현재 진행:

```text
dialog·좌우 panel open state와 focus 복원을 useWorkspacePanels로 분리
독립 hook test와 기존 App keyboard/focus characterization test 통과
URL 초기 중립 상태, 사용자 선택 이후 query 동기화와 API 기본 기간 보정을 useAnalysisUrlSync로 분리
URL sync hook test, App characterization test, typecheck와 lint 통과
점포 목록·검색 결과 선택과 범위 변경 시 stale 선택 제거를 useStoreSelection으로 분리
확정·이동 중·현재 보이는 지도 중심과 3D 표시 설정을 useMapViewport로 분리
상권·업종·반경·분석 주제·기간 선택 규칙을 useAnalysisSelection으로 분리
```

## 8. Documentation Updates

- [x] 코드/스크립트 변경 시 관련 문서 또는 `.harness` 기록을 같은 커밋에 포함
- [x] README 링크 필요 여부 확인
- [ ] 기능 spec 갱신
- [ ] data mapping 갱신
- [ ] checklist 갱신
- [ ] decision/failure log 필요 여부 확인

## 9. Commit Plan

예상 커밋 메시지:

```text
refactor(web): extract workspace state boundaries
refactor(map): extract map viewport and canvas
test(web): verify independent workspace transitions
docs(web): record WEB-018 completion
```

## 10. Self-check

- [x] 한 기능/한 버그/한 문서 단위인가?
- [x] 관련 없는 파일을 변경하지 않았는가?
- [ ] 검증 결과를 기록했는가?
- [ ] 문서와 체크리스트가 실제 변경과 일치하는가?
- [x] known limitation이 있으면 적었는가?

지도 toolbar·legend·control을 MarketMapPanel로 분리하고 기존 map canvas는 props로 유지
MapLibre layer·marker·지원 범위 안내·분석 위치 control을 MarketMapCanvas로 분리
