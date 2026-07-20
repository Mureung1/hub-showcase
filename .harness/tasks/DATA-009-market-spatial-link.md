# Task Packet: DATA-009

## 1. Summary

```text
Task: 개별 점포-상권 공간 결합과 공식 밀집 집계 비교
Backlog ID: DATA-009
Parent Epic: EPIC-02
Type: data/quality
Owner: N187_정현우
Status: in_progress
```

## 2. Goal

공식 개별 점포 좌표와 서울시 상권 polygon을 같은 좌표계로 결합하고, 검색과 반경 분석이
사용할 수 있는 검증된 점포-상권 관계를 만든다.

## 3. Scope

- Phase A 완료: 연남·홍대·합정 polygon의 `EPSG:5181 → EPSG:4326` 변환
- Phase A 완료: `point_in_polygon` 기반 점포 연결과 경계·미매칭 검사
- Phase A 완료: canonical SQLite와 development Supabase에 동일 schema·row count 적용
- Phase B 남음: 서울시 공식 상권·업종별 점포 집계와 개별 점포 계산값 비교
- 서울 전체 검색과 가장 가까운 상권 강제 귀속은 제외

## 4. Related Documents

- `docs/data/database-structure.md`
- `docs/data/data-source-mapping.md`
- `docs/development/tasks.md`
- `docs/features/market-analysis.md`

## 5. Expected Changes

- canonical SQLite와 PostgreSQL에 additive 공간 table·migration을 추가한다.
- 공식 Shapefile importer, CRS 변환과 공간 결합 regression test를 추가한다.
- secret, 로컬 절대 경로와 raw 원본은 commit 대상에 넣지 않는다.

## 6. Acceptance Criteria

- [x] 3개 상권 polygon과 CRS provenance가 보존된다.
- [x] 연결된 점포가 안정적인 `store_id`와 `market_code`를 가진다.
- [x] polygon 밖 bbox 점포와 경계점이 구분되어 test된다.
- [x] SQLite와 development Supabase 공간 table row count가 일치한다.
- [ ] 업종 mapping과 공식 집계 차이·기간 차이를 품질 보고서에 기록한다.
- [ ] 비교 결과를 승인한 뒤 반경 분석 입력으로 인계한다.

### Current Result

```text
market_geometries: 3
store_market_links: 4,548
연남 330 / 홍대 3,111 / 합정 1,107
bbox 후보 9,035 / polygon 미포함 4,487 / 경계점 0
foreign key orphan: 0
```

## 7. Verification Plan

```powershell
uv run --directory product/apps/api python -m localtwin_api.spatial_import
uv run --directory product/apps/api pytest -q
uv run --directory product/apps/api ruff check src tests
```

실제 source snapshot과 target count는
`.harness/runs/2026-07-15-SEARCH-001-market-store-search.md`에 기록한다.

## 8. Documentation Updates

- [x] DB ERD와 source mapping에 공간 table·row count를 반영한다.
- [x] backlog에 DATA-009 A단계 완료와 B단계 잔여 범위를 반영한다.
- [x] Run Report에 실제 SQLite·Supabase 검증 결과를 기록한다.

## 9. Commit Plan

```text
feat(data): link selected market polygons and store points
```

## 10. Self-check

- [x] 가장 가까운 상권으로 점포를 강제 귀속하지 않았다.
- [x] 서울 전체 검색이나 전체 polygon 확장으로 범위를 넓히지 않았다.
- [x] 원본·변환 CRS와 source snapshot을 보존했다.
- [ ] 공식 업종별 점포 집계와 개별 점포 계산값 차이를 보고한다.
