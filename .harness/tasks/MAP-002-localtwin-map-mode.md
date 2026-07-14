# Task Packet: MAP-002

## 1. Summary

```text
Task: LocalTwin 전용 2.5D 지도 mode
Backlog ID: MAP-002
Parent Epic: EPIC-04
Type: feature
Owner: N187_정현우
Status: done
```

## 2. Goal

실제 도로·지명·건물 footprint를 유지하면서 LocalTwin다운 아기자기한 2.5D 지도를 제공하고, 원본 지도와 기존 prefab을 버튼으로 다시 볼 수 있게 한다.

## 3. Scope

포함:

```text
OpenFreeMap building source 기반 fill-extrusion
LocalTwin 전용 배경·공원·물·도로 색상
LocalTwin / 실제 지도 mode 전환
건물 Layer와 후보 점포 prefab 독립 전환
desktop/mobile mode control
```

제외:

```text
지도 렌더링 엔진 자체 개발
건물별 정교한 지붕·창문 자동 생성
Google Earth 수준 photorealistic 표현
새 지도 데이터 공급자 운영
```

## 4. Related Documents

```text
docs/features/market-map-experience.md
docs/design/design-system.md
```

## 5. Expected Changes

```text
web: map style mode, custom building Layer, mode controls
test: mode와 방어형 fallback 상태 전환
docs: LocalTwin 지도 정의와 현재 구현 상태
```

## 6. Acceptance Criteria

- [x] 초기 화면은 LocalTwin mode다.
- [x] 실제 OSM 건물 footprint가 LocalTwin 색상의 2.5D 건물로 표시된다.
- [x] 실제 지도 mode에서 원본 색상과 중립적인 실제 footprint 건물을 복원한다.
- [x] 건물 Layer를 독립적으로 켜고 끌 수 있다.
- [x] 기존 후보 점포 prefab을 독립적으로 켜고 끌 수 있다.
- [x] 지도 이동·확대·축소와 실제 지명 표시는 유지된다.
- [x] mobile에서 mode control이 화면 밖으로 넘치지 않는다.

## 7. Verification Plan

```powershell
pnpm --dir product/apps/web test
pnpm --dir product/apps/web typecheck
pnpm --dir product/apps/web lint
pnpm --dir product/apps/web build
```

수동 확인:

```text
LocalTwin mode에서 custom fill-extrusion 렌더링 확인
실제 지도 왕복 후 원본 색상·건물 복원 확인
건물과 3D prefab button의 독립 동작 확인
desktop/mobile canvas nonblank와 control 겹침 확인
```

## 8. Documentation Updates

- [x] LocalTwin 지도의 기술적 경계 명시
- [x] 현재 프로토타입 기능 목록 갱신
- [x] Run Report 작성

## 9. Commit Plan

```text
feat(map): add the LocalTwin 2.5D map mode

why:
- present actual map geometry with a distinct LocalTwin visual language

verify:
- pnpm --dir product/apps/web test
- pnpm --dir product/apps/web build
```

## 10. Self-check

- [x] 원본 지도 mode를 방어형 fallback으로 유지했는가?
- [x] 실제 지명과 도로 정보가 사라지지 않았는가?
- [x] 건물과 점포 prefab을 같은 toggle로 묶지 않았는가?
- [x] 지도 수치나 geometry를 실제 이상으로 주장하지 않았는가?
- [ ] 후속: MapLibre bundle code splitting은 측정 후 별도 Task로 진행한다.
