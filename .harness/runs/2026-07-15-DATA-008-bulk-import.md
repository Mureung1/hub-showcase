# Run Report: DATA-008 bulk import

## Summary

```text
Date: 2026-07-15
Task: DATA-008
Result: two CSV bulk sources imported; geometry and permit expansion remain
```

소상공인시장진흥공단 서울 상가정보와 서울시 상권분석서비스 점포-상권 2025 CSV를
canonical SQLite에 재실행 가능한 방식으로 적재했다. raw ZIP과 해제본은 변경하지 않았고,
원본 SHA-256과 상대 경로를 provenance로 보존했다.

## Sources

| Source | Format | Encoding | Data rows |
| --- | --- | --- | ---: |
| 소상공인시장진흥공단 상가(상권)정보 서울 202603 | CSV | UTF-8-SIG | 537,489 |
| 서울시 상권분석서비스 점포-상권 2025 | CSV | CP949 | 304,775 |

## Implemented

- CSV encoding 감지와 필수 column 검증
- SHA-256 기반 `data_sources` provenance upsert
- 대용량 batch import와 business key 기반 idempotent upsert
- 상가정보 식별자·상호·WGS84 좌표 검증
- 점포-상권 분기·상권 code 검증
- 기존 20행 점포 API sample을 공식 서울 전체 snapshot으로 교체
- 누락·중복·좌표 오류·미등록 상권 code 품질 집계

실행 명령:

```powershell
uv run --directory product/apps/api python -m localtwin_api.bulk_import
```

## Counts

| Table | Before | After |
| --- | ---: | ---: |
| `data_sources` | 7 | 9 |
| `markets` | 1,650 | 1,650 |
| `store_metrics` | 76,383 | 304,775 |
| `sales_metrics` | 21,427 | 21,427 |
| `flow_metrics` | 1,650 | 1,650 |
| `store_points` | 20 | 537,489 |
| `permit_businesses` | 40 | 40 |

## Quality and Idempotency

```text
SBDC stores
input=537489 accepted=537489 duplicate=0 missing_required=0 invalid_coordinates=0

Seoul store metrics
input=304775 accepted=304775 duplicate=0 missing_required=0 unknown_market_codes=0

SQLite integrity_check=ok
foreign_key_violations=0
second full import counts=unchanged
```

분기별 `store_metrics`는 `20251` 76,383행, `20252` 76,238행, `20253` 76,169행,
`20254` 75,985행이다. `store_points`는 대분류 10개, 중분류 75개, 소분류 247개를
포함한다.

## Failed Attempt and Correction

첫 실제 import는 UTF-8 sample byte가 multi-byte 문자 중간에서 끝날 때 encoding 감지가
실패해 transaction 시작 전에 중단됐다. incremental decoder로 sample 경계를 허용하고 같은
상황의 regression test를 추가한 뒤 전체 import를 다시 실행했다.

## Remaining

1. 영역-상권 Shapefile을 geometry schema로 적재하고 `EPSG:5181`에서 서비스 좌표계로 변환
2. 점포 point와 상권 polygon의 공간 결합, 미매칭·경계점 품질 보고 (`DATA-009`)
3. 휴게·일반음식점 인허가 API 전체 pagination과 영업 상태 보강
4. KOSIS 행정동 배경 통계는 `DATA-010`에서 별도 적재

이 bulk 결과의 실제 development Supabase migration과 2회 seed는 후속 `DB-001`에서
완료했다. DATA-008은 geometry와 인허가 확장이 남아 있으므로 계속 In Progress다.
