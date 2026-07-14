# Task Packet: MAP-001

## 1. Summary

```text
Task: 홍대·합정·연남 상권 비교군 고정
Backlog ID: MAP-001
Parent Epic: EPIC-04
Type: feature
Owner: N187_정현우
Status: done
```

## 2. Goal

상권 분석 화면과 비교 기능에서 서로 가까운 홍대·합정·연남만 제공하고, 3D 촬영 장소인 관평동은 상권 비교 목록과 분리한다.

## 3. Scope

포함:

```text
성수·신촌 상권 제거
합정 실제 OSM POI snapshot 추가
기본 상권을 연남으로 변경
상권 선택과 비교 테스트 갱신
기능 스펙의 지역 범위 갱신
```

제외:

```text
LocalTwin 전용 지도 스타일
Gaussian Splatting viewer 구현
실제 상권분석 API 연결
```

## 4. Related Documents

```text
docs/features/market-map-experience.md
docs/features/3d-congestion-explorer.md
docs/development/tasks.md
```

## 5. Expected Changes

```text
web: 상권 catalog와 component test
docs: 상권 비교군 명시
```

## 6. Acceptance Criteria

- [x] 상권 선택에는 연남·홍대·합정만 표시된다.
- [x] 성수와 신촌이 UI와 비교표에서 제거된다.
- [x] 합정의 실제 POI 이름과 좌표가 표시된다.
- [x] 초기 화면은 연남 상권을 보여준다.
- [x] 관평동은 상권 비교 목록에 포함되지 않는다.

## 7. Verification Plan

```powershell
pnpm --dir product/apps/web test
pnpm --dir product/apps/web typecheck
pnpm --dir product/apps/web build
python scripts/check_docs_html.py
```

수동 확인:

```text
상권 selector 3개 항목 확인
비교 dialog 3개 행 확인
합정 전환과 map 이동 확인
```

## 8. Documentation Updates

- [x] 기능 스펙의 시연 상권 목록 갱신
- [x] 실제 OSM snapshot 기준일과 한계 유지
- [x] Run Report 작성

## 9. Commit Plan

```text
feat(map): focus analysis on the Mapo market cluster

why:
- compare nearby markets while keeping the 3D capture site separate

verify:
- pnpm --dir product/apps/web test
- pnpm --dir product/apps/web build
```

## 10. Self-check

- [x] 상권 분석과 3D 장소의 역할을 섞지 않았는가?
- [x] 실제로 확인한 POI만 사용했는가?
- [x] 기존 category/radius/layer 동작을 보존했는가?
- [x] 관련 없는 디자인을 변경하지 않았는가?
- [ ] 후속: 실제 API adapter 연결 후 demo fixture 수치를 공식 데이터로 교체한다.
