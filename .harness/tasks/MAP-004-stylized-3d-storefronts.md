# Task Packet: MAP-004

## 1. Summary

```text
Task: 핵심 점포 방향 독립형 3D store marker와 업종 asset system
Backlog ID: MAP-004
Parent Epic: EPIC-04
Type: feature
Owner: N187_정현우
Status: in_progress
```

## 2. Goal

검색·선택된 핵심 점포만 실제 지도 좌표의 방향 독립형 low-poly 3D store marker로 표시하고, 검증된 업종을 기본 prefab·material·UV decal·전방위 attachment 조합으로 확장한다.

## 3. Scope

포함:

```text
공식 업종 근거가 확인된 꽃집 1개 vertical slice
카페·음식점·베이커리·편의점 초기 asset set
canonical category → archetype/decal/attachment registry
canonical 업종·명시적 원천 tag·generic fallback의 근거 우선순위
MapLibre custom layer와 Three.js GLB rendering
실제 점포 좌표·선택적 building 연결·방향 독립 배치
옥상 장식·둘레 category band·halo·label
복수 점포 건물의 대표 marker·점포 수·목록 연결
selected/candidate/context 핵심 점포 선별
desktop/mobile LOD와 HTML marker fallback
keyboard 목록·inspector·3D 선택 state 동기화
asset license·출처·용량·성능 기록
```

제외:

```text
모든 서울 건물의 창문·facade 자동 생성
도로·출입구·facade 방향 추정
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
web: StoreMarkerLayer, asset registry, placement, selection, fallback
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

완료한 canonical vertical slice(2026-07-16):

```text
이름: 플로리스트오재윤
canonical store ID: MA010120220805312100
canonical 업종: G21901 / 꽃집
좌표: 126.923054545317, 37.5653774848447
공간 검증: canonical market polygon 3110562 연남 내부
제품 연결: FastAPI 검색 → React 선택 → MapLibre custom Three.js layer

추가 검증 업종:
- I21201 / 카페 / 17도씨
- I20101 / 백반·한정식 / 더빌리랩스
- I21001 / 빵·도넛 / 레이어드연남
- G20405 / 편의점 / GS25연남공원점
```

동시에 적용한 표시 규칙:

```text
선택 핵심 점포만 상세 3D marker로 표시
일반 점포는 소형 POI marker로 유지하고 desktop 12개, mobile 6개로 결정적으로 선별
서로 가까운 marker는 거리 기준으로 제거해 3D marker와 HTML marker의 겹침 방지
선택 변경은 기존 custom layer의 model만 교체하고 unmount 시 Three.js resource 정리
지원 지역에서는 base extrusion과 LocalTwin extrusion을 동시에 표시하지 않음
```

기존 `Florte Flower Cafe`의 cafe→꽃집 강제 매핑은 제거했다. `CS300028`은 공식 상권 지표의
화초 alias로만 지원하고, 실제 선택 점포의 전용 장식 판정에는 검색 응답의 canonical
`G21901`을 사용한다. 첫 5개 업종은 직접 만든 procedural attachment로 구분한다.
공통 사방형 점포 body는 26,148B GLB, category decal은 1,263B SVG atlas로 분리해
한 번만 load하고 선택 변경 때 geometry와 image source를 공유한다. 복수 점포 건물 묶음은 후속 범위다.

## 6. Acceptance Criteria

- [x] canonical 업종 또는 명시적 원천 tag가 꽃집으로 확인된 점포 1개가 실제 좌표에서 GLB body, flower decal band와 rooftop flower attachment로 표시된다.
- [x] 카페·음식점·베이커리·편의점이 같은 prefab system에서 서로 다른 대표 장식으로 표시된다. decal은 후속 GLB/texture 범위다.
- [x] 점포명은 업종 판정에 사용하지 않고, 원천 분류가 카페이면 이름에 `Flower`가 있어도 꽃집 장식을 적용하지 않는다.
- [x] 현재 `Florte Flower Cafe`의 `sourceCategory="cafe"`와 꽃집 `visualCategoryCode` 강제 매핑이 제거되거나 `generic`으로 교체된다.
- [x] category source와 visual mapping이 추적 가능하며 값이 없거나 충돌하면 `generic` 또는 HTML marker로 fallback한다.
- [x] desktop 최대 12개, mobile 최대 6개 marker 선별이 같은 입력에서 항상 같은 결과를 낸다.
- [x] 선택 점포는 검색 결과, 3D layer와 inspector에서 같은 storeId를 가진다.
- [ ] 90도 단위 map rotate와 임의 bearing에서 업종 표식과 선택 상태가 최소 한 면 또는 옥상에서 읽힌다.
- [x] 도로·출입구·facade 방향을 추정하지 않으며 실제 앞면인 것처럼 표현하지 않는다.
- [ ] 같은 건물의 복수 점포는 대표 marker와 점포 수로 표시되고 선택 시 실제 목록으로 연결된다.
- [x] GLB·texture는 공유되고 선택 변경마다 다시 download·parse되지 않는다.
- [x] map 교체·unmount 시 instance material·texture와 renderer가 정리되고 cached GLB geometry는 유지된다.
- [x] WebGL 초기화 실패 시 HTML marker로 fallback하고 mobile에서도 검색·선택 기능이 유지된다. reduced motion 별도 검증은 남았다.
- [x] 기존 map/category/radius test, typecheck, lint와 production build가 통과한다.
- [x] desktop/mobile 지도 frame과 표시 개수를 Run Report에 기록한다. GLB asset 용량은 후속 범위다.

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
category 충돌·building/GLB/WebGL 실패 fallback
sourceCategory와 visualCategoryCode 충돌 시 전용 asset 적용 거부
90도 단위 회전과 임의 bearing 방향 독립 가독성
복수 점포 건물의 대표 marker·수·목록 동기화
unmount resource disposal
```

수동 확인:

```text
1440×980 연남·홍대·합정 pan/zoom/rotate/선택
390×844 mobile LOD·선택·inspector·overflow
근거가 확인된 꽃집과 지원 4개 업종의 시각 구분
점포명과 원천 업종이 다를 때 원천 업종을 따르는지 확인
전후좌우 회전에서 rooftop·둘레 표식이 유지되는지 확인
선택 상태의 outline·scale·label 비색상 구분
reduced-motion과 3D off fallback
변경 전후 같은 상권·점포 수 browser performance trace
```

## 8. Documentation Updates

- [x] `docs/features/market-map-experience.md` 실제 구현 상태 갱신
- [x] `docs/design/design-system.md` 최종 asset 규칙 갱신
- [x] `docs/development/tasks.md` MAP-004 상태 갱신
- [x] asset reference·license와 직접 제작 범위를 Run Report에 기록
- [x] bundle·frame·fallback 결과를 `.harness/runs/`에 기록

공통 asset 재생성:

```powershell
node product/scripts/generate_storefront_body.mjs
```

## 9. Commit Plan

```text
feat(map): render core stores as direction-neutral 3d markers

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
