# Task Packet: DESIGN-001

## 1. Summary

```text
Task: 업종별 low-poly 점포 prefab 고도화
Backlog ID: DESIGN-001
Parent Epic: EPIC-04
Type: feature
Owner: N187_정현우
Status: done
```

## 2. Goal

실제 점포 좌표 위 후보 marker를 참고 이미지처럼 아기자기한 low-poly 건물로 표현하되, 지도 정보와 조작 성능을 해치지 않는다.

## 3. Scope

포함:

```text
지붕, facade, 측면, 창문, 출입문, 돌출 간판, 차양과 화분
카페·음식점·베이커리·편의점 업종별 palette
선택 상태 elevation과 focus-visible
desktop/mobile visual check
```

제외:

```text
모든 OSM 건물의 수작업 mesh
실내 공간
실제 건물 외관과 동일하다는 주장
무거운 3D asset download
```

## 4. Related Documents

```text
docs/design/design-system.md
docs/features/market-map-experience.md
docs/development/tasks.md
```

## 5. Expected Changes

```text
web: prefab semantic parts와 category style
tests: 지도 mode와 prefab toggle 회귀 확인
docs: 배경 건물과 후보 점포 prefab의 역할 구분
```

## 6. Acceptance Criteria

- [x] 각 prefab에 지붕·창문·문·간판·차양·화분이 보인다.
- [x] 4개 업종이 색상과 간판 symbol로 구분된다.
- [x] 선택·hover·keyboard focus가 레이아웃을 밀지 않는다.
- [x] prefab과 기본 건물 layer를 독립적으로 끌 수 있다.
- [x] desktop과 mobile에서 주요 control을 가리지 않는다.

## 7. Verification Plan

```powershell
pnpm --dir product/apps/web test
pnpm --dir product/apps/web lint
pnpm --dir product/apps/web build
```

수동 확인:

```text
1440×980에서 4개 업종 prefab과 선택 상태 확인
390×844에서 map controls와 선택 card 가림 확인
3D toggle off/on 후 marker 복원 확인
```

## 8. Documentation Updates

- [x] prefab 구성과 지도 계층 역할 기록
- [x] 백로그 상태 갱신
- [x] Run Report 작성

## 9. Commit Plan

```text
feat(design): detail the market storefront prefabs
```

## 10. Self-check

- [x] 실제 점포 좌표와 시각적 외관 추정을 구분했는가?
- [x] 작은 화면에서 text/card/control을 가리지 않는가?
- [x] 배경 건물 성능을 유지했는가?
- [ ] 후속: 실제 촬영 texture 연결은 별도 Task로 둔다.
