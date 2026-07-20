# Task Packet: DATA-008

## 1. Summary

```text
Task: 분기 상가정보·인허가·상권영역 bulk importer와 품질 검사
Backlog ID: DATA-008
Parent Epic: EPIC-02
Type: data
Owner: N187_정현우
Status: in_progress
```

## 2. Goal

20행 API sample을 공식 bulk snapshot으로 교체하고, 개별 점포 위치와 상권별 분기 집계를
재현 가능한 provenance와 품질 결과를 가진 canonical 데이터로 만든다.

## 3. Scope

포함:

```text
소상공인시장진흥공단 서울 상가정보 CSV
서울시 상권분석서비스 점포-상권 2025 CSV
encoding·필수 field·business key·좌표·상권 code 검사
SHA-256 provenance와 idempotent upsert
영역-상권 geometry와 인허가 전체 pagination 후속 확장
```

제외:

```text
카카오·네이버 지도 및 장소 API
출입문·facade 위치 추정
점포-상권 공간 결합과 공식 집계 비교(DATA-009)
KOSIS 배경 통계(DATA-010)
자동 수집 주기 확정(DATA-007)
```

## 4. Related Documents

```text
docs/data/data-source-mapping.md
docs/development/tasks.md
docs/features/market-map-experience.md
.harness/runs/2026-07-15-DATA-008-bulk-import.md
```

## 5. Expected Changes

```text
api: bulk CSV importer
data: ignored raw snapshot과 processed canonical SQLite
docs: source inventory, 실제 row count, 품질 결과와 남은 경계
tests: encoding, 필수 field, 좌표, unknown market, idempotency
```

## 6. Acceptance Criteria

- [x] 서울 상가정보 537,489행을 `store_points`에 적재한다.
- [x] 서울시 점포-상권 304,775행을 `store_metrics`에 적재한다.
- [x] source SHA-256과 상대 raw path를 provenance로 보존한다.
- [x] 같은 두 source를 다시 적재해도 table count가 변하지 않는다.
- [x] 누락·중복·좌표 오류·미등록 상권 code를 보고한다.
- [x] 연남·홍대·합정 영역 geometry의 원본·변환 좌표계와 polygon을 canonical schema에 보존한다.
- [ ] 일반·휴게음식점 인허가 전체 pagination과 영업 상태를 보강한다.

## 7. Verification Plan

```powershell
uv run --directory product/apps/api python -m localtwin_api.bulk_import
uv run --directory product/apps/api python -m localtwin_api.canonical_db --stats
uv run --directory product/apps/api pytest
uv run --directory product/apps/api ruff check src tests
uv run --directory product/apps/api ruff format --check src tests
```

수동 확인:

```text
두 번째 full import 전후 table count가 같은지 확인
SQLite integrity_check와 foreign_key_check 확인
source snapshot의 URL·period·row count·SHA-256·raw path 확인
```

## 8. Documentation Updates

- [x] data mapping inventory와 canonical 적재 결과 갱신
- [x] backlog를 In Progress로 갱신
- [x] Run Report 작성
- [ ] 전체 인허가 확장 완료 후 최종 결과 갱신

## 9. Commit Plan

```text
feat(data): import official bulk store snapshots

why:
- replace sample store positions with verified official bulk data

verify:
- 47 API tests
- lint, format, docs and task packet checks
```

## 10. Self-check

- [x] 공식 공개 원본만 사용했는가?
- [x] secret과 로컬 절대 경로가 provenance에 남지 않는가?
- [x] raw 원본을 수정하지 않았는가?
- [x] 실패한 encoding 경계 case를 regression test로 남겼는가?
- [x] SQLite 적재와 실제 Supabase 반영을 구분했는가?
- [ ] 전체 인허가 후속 범위를 완료했는가?
