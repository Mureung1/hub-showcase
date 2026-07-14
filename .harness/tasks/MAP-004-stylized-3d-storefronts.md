# Task Packet: MAP-004

## 1. Summary

```text
Task: 핵심 점포 stylized 3D storefront와 업종 asset system
Backlog ID: MAP-004
Parent Epic: EPIC-04
Type: feature
Owner: N187_정현우
Status: backlog
```

## 2. Goal

검색·선택된 핵심 점포만 실제 지도 좌표의 low-poly 3D storefront로 표시하고, 많은 업종을 기본 prefab·material·UV decal·대표 attachment 조합으로 확장한다.

## 3. Scope

포함:

```text
꽃집 1개 vertical slice
카페·음식점·베이커리·편의점 초기 asset set
canonical category → archetype/decal/attachment registry
MapLibre custom layer와 Three.js GLB rendering
점포 좌표·building footprint·facade 방향 배치
selected/candidate/context 핵심 점포 선별
desktop/mobile LOD와 HTML marker fallback
keyboard 목록·inspector·3D 선택 state 동기화
asset license·출처·용량·성능 기록
```

제외:

```text
모든 서울 건물의 창문·facade 자동 생성
실제 상표·점포 외관 복제
실내 3D와 Gaussian Splatting 대체
photorealistic texture·real-time shadow
검색 contract가 없는 hard-coded 점포 확대
```

## 4. Related Documents

- `docs/features/market-map-experience.md`
- `docs/design/design-system.md`
- `docs/features/market-analysis.md`
- `docs/development/tasks.md`
- `.harness/tasks/SEARCH-001-market-store-search.md`

## 5. Expected Changes

```text
api: 검색 결과의 storeId, categoryCode, 좌표와 building 연결 필드 확인
web: StorefrontLayer, asset registry, placement, selection, fallback
assets: GLB prefab, category texture atlas, attachment와 manifest
data: canonical category → visual archetype mapping
tests: manifest, mapping, selection 상한, fallback, state 동기화
docs: 지도 기능 스펙, 디자인 규칙, Run Report
```

의존성:

```text
ARCH-002 → 최종 제품 asset 경로
DB-001 → 전체 canonical 업종 보존
SEARCH-001 → 실제 점포 ID·업종·좌표
WEB-003 → 실제 점포 marker와 지도 state
```

## 6. Acceptance Criteria

- [ ] 꽃집 1개가 실제 좌표에서 GLB body, material, pixel flower decal과 flower attachment로 표시된다.
- [ ] 카페·음식점·베이커리·편의점이 같은 prefab system에서 서로 다른 decal·대표 장식으로 표시된다.
- [ ] canonical category mapping이 없으면 `generic` storefront 또는 HTML marker로 fallback한다.
- [ ] desktop 최대 12개, mobile 최대 6개 핵심 storefront 선별이 같은 입력에서 항상 같은 결과를 낸다.
- [ ] 선택 점포는 목록, 3D layer와 inspector에서 같은 storeId를 가진다.
- [ ] building 연결·facade 방향이 없으면 실제 facade인 것처럼 임의 배치하지 않고 marker로 fallback한다.
- [ ] GLB·texture는 공유되고 선택 변경마다 다시 download·parse되지 않는다.
- [ ] map 교체·unmount 시 geometry, material, texture와 listener가 정리된다.
- [ ] WebGL/asset 실패, reduced motion과 mobile에서도 검색·선택 기능이 유지된다.
- [ ] 기존 map/category/radius test, typecheck, lint와 production build가 통과한다.
- [ ] 변경 전후 동일 조건의 지도 frame·load evidence와 asset 용량을 Run Report에 기록한다.

## 7. Verification Plan

자동 검증:

```powershell
pnpm --dir product/apps/web typecheck
pnpm --dir product/apps/web lint
pnpm --dir product/apps/web test -- --run
pnpm --dir product/apps/web build
python scripts/check_docs_html.py
python scripts/check_task_packet.py --root . --require
git diff --check
```

추가 test case:

```text
manifest asset 경로와 category fallback
핵심 점포 우선순위와 desktop/mobile 상한
동일 asset cache 재사용
selected storeId 양방향 동기화
building/facade/GLB/WebGL 실패 fallback
unmount resource disposal
```

수동 확인:

```text
1440×980 연남·홍대·합정 pan/zoom/rotate/선택
390×844 mobile LOD·선택·inspector·overflow
꽃집과 지원 4개 업종의 시각 구분
선택 상태의 outline·scale·label 비색상 구분
reduced-motion과 3D off fallback
변경 전후 같은 상권·점포 수 browser performance trace
```

## 8. Documentation Updates

- [ ] `docs/features/market-map-experience.md` 실제 구현 상태 갱신
- [ ] `docs/design/design-system.md` 최종 asset 규칙 갱신
- [ ] `docs/development/tasks.md` MAP-004 상태 갱신
- [ ] asset reference·license와 직접 제작 범위를 Run Report에 기록
- [ ] bundle·frame·fallback 결과를 `.harness/runs/`에 기록

## 9. Commit Plan

```text
feat(map): render core stores as stylized 3d storefronts

why:
- distinguish actual search candidates without turning every building into heavy 3D

verify:
- web typecheck, lint, tests, build and desktop/mobile map QA
```

구현은 한 commit으로 강제하지 않는다. `asset contract → 꽃집 vertical slice → category 확대 → QA`를 검증 가능한 작은 commit으로 나눈다.

## 10. Self-check

- [ ] 3D가 상권 분석보다 중요한 기능처럼 보이지 않는가?
- [ ] 실제 외관·상표·저작물을 복제하지 않았는가?
- [ ] hard-coded 점포를 제품 데이터처럼 확대하지 않았는가?
- [ ] 미분류·실패 fallback과 keyboard 경로가 남아 있는가?
- [ ] baseline 없는 성능 향상을 주장하지 않았는가?
- [ ] 관련 없는 지도·Scene 코드를 함께 refactor하지 않았는가?
