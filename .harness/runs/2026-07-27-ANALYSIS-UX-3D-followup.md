# Run Report: decision summary, quarterly trend, and storefront building linkage

## Scope

- 비용·수익성 계산기는 이번 범위에서 제외했다.
- 점수 API의 상세 근거를 먼저 읽을 수 있는 decision summary를 한국어 inspector에 연결했다.
- 실제 분기 개·폐업 endpoint를 화면에서 선택·합산할 수 있게 연결했다.
- 현재 지도에 표시되는 선택 업종 후보 중, 지원 Overlay 안에서 점포 좌표가 하나의 건물로 확인될 때만 기존 건물을 숨기고 업종 3D 오브젝트로 대체한다.
- 2025년 2~4분기 서울시 공식 추정매출·길단위인구 raw snapshot을 전량 수집하고, canonical SQLite와 development Supabase에 반영했다.

## Safety rules

- `insufficient_evidence` 상태는 점수가 높아도 `근거 부족`으로 표시한다.
- 매출·유동인구·점수는 상권 단위 값이며, 선택 점포 반경의 점포 수와 혼동하지 않는다.
- 한 건물에 알려진 점포가 두 개 이상이면 건물 전체를 특정 업종으로 바꾸지 않는다.
- Three.js custom layer가 준비되기 전에는 원래 Overlay 건물을 유지한다.
- 비용·임대료·원가를 근거 없이 계산하거나 수익성 점수로 표시하지 않는다.
- 용어 도움말은 화면 안쪽 좌표로 배치해 패널 가장자리와 모바일에서 잘리지 않게 한다.

## Validation

```powershell
uv run --directory product/apps/api pytest tests/test_market_score.py -q
pnpm --dir product/apps/web test -- MarketInspector.test.tsx storefrontBuildingPlacement.test.ts
pnpm --dir product/apps/web typecheck
pnpm --dir product/apps/web lint
pnpm --dir product/apps/web build
```

## Manual map checks

- [ ] 지원 Overlay 안의 연남 한 점포를 선택해 새 정사각형 부지·bounding-box 변환 결과를 확인
- [ ] 동일 건물에 여러 점포가 있는 fixture에서 기본 건물이 유지되는지 확인
- [ ] 지원 지역 밖에서는 기본 지도 건물만 보이는지 확인

## Result

- Web: 33 test files / 110 tests, typecheck, lint, production build passed after the final 3D placement and tooltip changes.
- API focused tests: 21 tests and Ruff passed for market analysis, canonical import, and seed behavior.
- 2025년 2~4분기 raw snapshot: sales 64,305 rows, flow 4,945 rows. Canonical totals are sales 85,732 rows and flow 6,595 rows.
- development Supabase selected-table seed: `data_sources` 22, `sales_metrics` 85,732, `flow_metrics` 6,595.
- 빠른 요약 지표는 분석 요청 중에는 `불러오는 중`, 요청이 끝났지만 값이 없을 때만 `자료 없음`을 표시한다.
