# Run Report: 2026-07-16-DATA-010

## 1. Task

```text
Task packet: .harness/tasks/DATA-010-kosis-background-statistics.md
GitHub Issue: https://github.com/HyunKN/hub/issues/37
Commit: e3b4682, 1d25780, final documentation follow-up
Branch: develop
Status: passed
```

## 2. Changed Files

```text
product/apps/api/src/localtwin_api/kosis_population.py
product/apps/api/src/localtwin_api/db_models.py
product/apps/api/alembic/versions/20260716_0005_add_admin_area_population.py
product/apps/api/tests/test_kosis_population.py
product/apps/api/src/localtwin_api/kosis_business_census.py
product/apps/api/alembic/versions/20260716_0006_add_admin_area_business_metrics.py
product/apps/api/tests/test_kosis_business_census.py
product/scripts/collect_kosis_population.py
product/scripts/import_kosis_population.py
product/scripts/collect_kosis_business_census.py
product/scripts/import_kosis_business_census.py
docs/data/data-source-mapping.md
docs/data/database-structure.md
docs/development/tasks.md
.harness/tasks/DATA-010-kosis-background-statistics.md
```

## 3. Summary

```text
KOSIS DT_1B04005N 2025.12 주민등록인구 198행을 검증된 raw snapshot으로 수집했다.
총·남·여 항목을 행정동·5세 구간별 66행으로 변환하고 development Supabase에 적재했다.
연남·홍대·합정과 행정동은 인구 배분이 아닌 reference-only crosswalk 3행으로 분리했다.
공식 전국사업체조사 2024 XLSX에서 세 행정동·22개 산업의 사업체·종사자 66행을 적재했다.
비공개 X 값은 NULL과 is_suppressed로 보존했다.
```

## 4. Verification

명령:

```powershell
uv run --directory product/apps/api pytest tests/test_kosis_population.py -q
uv run --directory product/apps/api ruff check src tests alembic
uv run --directory product/apps/api pytest -q
uv run --directory product/apps/api alembic upgrade head
uv run --directory product/apps/api python ../../scripts/collect_kosis_population.py
uv run --directory product/apps/api python ../../scripts/import_kosis_population.py --snapshot data/raw/kosis-population/20260716T040045Z
uv run --directory product/apps/api python ../../scripts/collect_kosis_business_census.py
uv run --directory product/apps/api python ../../scripts/import_kosis_business_census.py --snapshot data/raw/kosis-business-census/20260716T042316Z
```

결과:

```text
KOSIS population focused test: 11 passed
KOSIS business census focused test: 4 passed
API full regression: 79 passed
Ruff: passed
Alembic revision: 20260716_0005
raw/canonical/crosswalk: 198 / 66 / 3
second import counts: 66 / 3 (unchanged)
snapshot SHA-256: 769b0b99f096e1a48601ef1375b7ba5aff261e8ce743e9ec830833b66c8220dc
sex total mismatch: 0
source FK orphan: 0
market FK orphan: 0
absolute raw path: 0
query-bearing source URL: 0
API key in raw/manifest: 0
business workbook: 84,484 rows / 59 columns / data 84,480 rows
business metric rows: 66
industry codes: 22
suppressed rows: 6
business source FK orphan: 0
business sex total mismatch: 0
business snapshot SHA-256: c4e9d5ec7084477f7e2597c1242da41a34b518d09841484c5889eda0b7dba3b5
```

## 5. Self-check

| Criterion | Result | Note |
| --- | --- | --- |
| Scope | pass | 인구 A단계와 전국사업체조사 B단계를 각각 공식 원본으로 구현했다. |
| Correctness | pass | 인구·사업체 66행, 성별 합계와 비공개 값을 확인했다. |
| Verification | pass | 두 fixture, migration, 실제 Supabase, 각각 2회 import를 확인했다. |
| Documentation | pass | source mapping, ERD와 Task Packet을 갱신했다. |
| Data discipline | pass | raw hash, provenance, FK와 idempotency를 확인했다. |
| Safety | pass | key, query URL과 절대경로를 저장하지 않았다. |
| Git hygiene | pass | schema, importer와 문서를 범위별 commit으로 분리해 develop에 push한다. |

## 6. Known Limitations

```text
행정동 인구는 상주인구이며 상권 polygon의 인구나 유동인구로 해석하면 안 된다.
산업대분류 사업체·종사자는 개별 점포 업종 소분류와 자동 결합하지 않는다.
자동 수집 주기와 raw 보존 정책은 DATA-007 결정 전까지 추가하지 않는다.
```

## 7. Next Action

```text
GitHub Issue와 Jira에 commit·Run Report를 연결한 뒤 SCORE-002 점수 공식 보완으로 이동한다.
```
