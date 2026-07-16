# Task Packet: DATA-010 KOSIS 행정동 배경 통계

## 1. Summary

```text
Task: KOSIS 행정동 인구·사업체 종사자 배경 통계 보강
Backlog ID: DATA-010
Parent Epic: EPIC-02
Type: data
Owner: N187_정현우
Status: done
Depends on: DATA-008
GitHub Issue: https://github.com/HyunKN/hub/issues/37
Jira: pending
```

## 2. Goal

연남·홍대·합정 시연 상권의 배후수요를 설명할 수 있도록 연남동·서교동·합정동의
공식 행정동 인구와 사업체 종사자 통계를 provenance와 함께 적재한다. 이 값은 점포 위치나
상권 polygon을 대체하지 않고 `행정동 배경 통계`로만 사용한다.

## 3. Scope

포함:

- KOSIS `DT_1B04005N` 2025.12 월간 JSON snapshot 1회 수집
- 연남동·서교동·합정동의 총·남·여 인구와 5세 구간
- raw response·sanitized manifest·SHA-256 보존
- canonical PostgreSQL schema와 idempotent import
- 상권과 행정동의 비가중 crosswalk
- 전국사업체조사 2024 읍면동·산업대분류 XLSX snapshot/import
- API key·개인 절대경로·DB secret 비노출 검사

제외:

- KOSIS 자동 cron·정기 갱신
- 행정동 인구를 상권 polygon 면적 비율로 배분
- KOSIS 값을 개별 점포 점수로 직접 사용
- 읍면동 산업중·소·세분류 추정
- 서울 전체 행정동 수집

### 확정 KOSIS Contract

| 구분 | 값 |
| --- | --- |
| 기관 | `101` 행정안전부 |
| 통계표 | `DT_1B04005N` |
| 기간 | `202512`, 월간 `M` |
| 행정동 | 서교동 `1144066000`, 합정동 `1144068000`, 연남동 `1144071000` |
| 항목 | 총인구 `T2`, 남자 `T3`, 여자 `T4` |
| 5세 구간 | 계 `0`, `5`~`105` |
| 예상 raw row | `3 areas × 22 age groups × 3 items = 198` |

공식 metadata와 API 결과를 기준으로 위 값을 고정한다. 응답의 period, area, age, item 집합이
달라지거나 198행이 아니면 snapshot/import를 중단한다.

### Canonical Schema

`admin_area_population`은 `(admin_area_code, period, age_group_code)`를 PK로 사용하고
`total_population`, `male_population`, `female_population`을 한 행에 저장한다.

`market_admin_area_crosswalk`은 다음 의미만 가진다.

```text
3110562 -> 1144071000 연남동
3120103 -> 1144066000 서교동
3120101 -> 1144068000 합정동
```

이는 `상권이 행정동 전체와 같다`는 뜻이 아니라 분석 UI에서 어떤 배경 통계를 참고할지
나타내는 관계다. 가중치와 인구 배분은 두지 않는다.

### 구현 데이터 흐름

```text
KOSIS parameter API
  -> validate_response_contract(198 raw rows)
  -> response.json + manifest.json (server-only snapshot)
  -> load_snapshot() + verify_snapshot_hash()
  -> transform_population_rows(198 provider rows -> 66 canonical rows)
  -> one DB transaction
       1. data_sources upsert
       2. admin_area_population upsert
       3. market_admin_area_crosswalk upsert
  -> count/value/FK/idempotency verification
```

수집과 DB 적재는 하나의 명령으로 합치지 않는다. 외부 API 응답을 먼저 불변 snapshot으로
남긴 뒤 동일 파일을 반복 import해야 provider 장애와 DB 오류를 분리해 재현할 수 있다.

### Provider Field Mapping

| KOSIS field | 검증/변환 | canonical field |
| --- | --- | --- |
| `ORG_ID`, `TBL_ID` | 각각 `101`, `DT_1B04005N` 고정 | manifest provenance |
| `PRD_DE` | `202512` 고정 | `period` |
| `C1`, `C1_NM` | 허용된 행정동 코드·이름인지 확인 | `admin_area_code`, `admin_area_name` |
| `C2`, `C2_NM` | `0`, `5`~`105` 집합인지 확인 | `age_group_code`, `age_group_name` |
| `ITM_ID` | `T2`, `T3`, `T4`만 허용 | total/male/female column 선택 |
| `DT` | 쉼표 제거 후 0 이상의 정수 | population value |

같은 `(area, period, age)`에 세 item이 모두 없거나 중복되면 0으로 보정하지 않고 import를
실패시킨다. provider field가 추가되는 것은 허용하지만 위 필수 field의 누락과 값 변경은
허용하지 않는다.

## 4. Related Documents

- `docs/data/data-source-mapping.md`
- `docs/data/database-structure.md`
- `docs/development/environment.md`
- `docs/development/tasks.md`

## 5. Expected Changes

| 파일 | 책임 |
| --- | --- |
| `product/apps/api/src/localtwin_api/kosis_population.py` | request contract, response validation, snapshot·import |
| `product/apps/api/src/localtwin_api/db_models.py` | population과 crosswalk model |
| `product/apps/api/alembic/versions/20260716_0005_add_admin_area_population.py` | 재현 가능한 schema migration |
| `product/scripts/collect_kosis_population.py` | server-only 수동 snapshot CLI |
| `product/scripts/import_kosis_population.py` | development Supabase idempotent import CLI |
| `product/apps/api/tests/test_kosis_population.py` | 198행 contract, 오류, secret, idempotency fixture |
| `product/apps/api/src/localtwin_api/kosis_business_census.py` | 공식 XLSX contract, suppression, snapshot·import |
| `product/apps/api/alembic/versions/20260716_0006_add_admin_area_business_metrics.py` | 사업체·종사자 schema migration |
| `product/scripts/collect_kosis_business_census.py` | 공식 온라인간행물 XLSX collector |
| `product/scripts/import_kosis_business_census.py` | development Supabase idempotent importer |
| `product/apps/api/tests/test_kosis_business_census.py` | XLSX header·code·suppression·hash·idempotency fixture |

### 5.1 Module Contract

`kosis_population.py`는 HTTP, snapshot, 변환, DB 적재 경계를 다음 함수로 분리한다.

```python
class KosisPopulationError(RuntimeError): ...

def build_request_params(api_key: str) -> dict[str, str]: ...
def fetch_population_rows(api_key: str, *, timeout_seconds: float = 30.0) -> list[dict[str, object]]: ...
def validate_population_rows(rows: list[dict[str, object]]) -> None: ...
def write_population_snapshot(rows: list[dict[str, object]], output_root: Path) -> Path: ...
def load_population_snapshot(snapshot_dir: Path) -> tuple[dict[str, object], list[dict[str, object]]]: ...
def transform_population_rows(rows: list[dict[str, object]]) -> list[dict[str, object]]: ...
def import_population_snapshot(snapshot_dir: Path, engine: Engine) -> ImportReport: ...
```

- request URL은 `urllib.parse.urlencode()`로 함수 내부에서만 만들고 출력·exception에 넣지 않는다.
- HTTP client는 표준 라이브러리를 사용해 이번 Task에서 dependency를 추가하지 않는다.
- `fetch_population_rows()`는 HTTP/JSON/provider error를 `KosisPopulationError`로 바꾸되 응답
  body 전체나 API key를 message에 포함하지 않는다.
- `write_population_snapshot()`은 `product/data/raw/kosis-population/<UTC timestamp>/` 아래에
  `response.json`, `manifest.json`을 atomic write한다.
- manifest에는 base endpoint, contract code, 수집시각, row count, response SHA-256만 기록하고
  API key와 query string은 기록하지 않는다.
- `load_population_snapshot()`은 import 전에 manifest의 row count와 SHA-256을 다시 계산한다.

### 5.2 SQLAlchemy Model과 Migration

`admin_area_population`:

| column | type/constraint |
| --- | --- |
| `admin_area_code` | `String`, PK |
| `period` | `String`, PK |
| `age_group_code` | `String`, PK |
| `admin_area_name` | `String`, not null |
| `age_group_name` | `String`, not null |
| `total_population` | `Integer`, not null |
| `male_population` | `Integer`, not null |
| `female_population` | `Integer`, not null |
| `source_snapshot_id` | FK `data_sources.snapshot_id`, not null |

`market_admin_area_crosswalk`:

| column | type/constraint |
| --- | --- |
| `market_code` | FK `markets.market_code`, PK |
| `admin_area_code` | `String`, PK |
| `admin_area_name` | `String`, not null |
| `mapping_method` | `String`, fixed `reference-only` |
| `mapping_version` | `String`, fixed `v1` |
| `boundary_note` | `Text`, not null |

Migration `20260716_0005`는 `0004`를 `down_revision`으로 사용하고 두 table, FK, PK를 만든다.
`downgrade()`는 crosswalk를 먼저, population을 다음으로 삭제한다.

배경 통계 세 모델은 `KOSIS_BACKGROUND_MODELS`에 둔다. 기존 `CANONICAL_MODELS`는 SQLite에서 복제하는
9개 table 목록으로 유지한다. 이를 통해 `postgres_seed.py`가 KOSIS table을 canonical SQLite에
요구하여 기존 DB-001 seed를 깨뜨리는 일을 막는다.

### 5.3 Import Transaction과 Upsert

`import_population_snapshot()`은 `engine.begin()` 한 번 안에서 다음 순서로 실행한다.

1. manifest와 raw hash를 확인한다.
2. query 없는 공식 base URL과 저장소 상대 `raw_path`로 `DataSource`를 upsert한다.
3. 66개 population row를 composite PK 기준 upsert한다.
4. 대상 market `3110562`, `3120103`, `3120101`이 존재하는지 확인한다.
5. 세 crosswalk row를 composite PK 기준 upsert한다.
6. population 66행, crosswalk 3행과 source FK를 검사한다.

어느 단계든 실패하면 transaction 전체를 rollback한다. 두 번째 실행에서는 새 row를 추가하지
않고 같은 PK의 provenance와 값만 동일하게 유지해야 한다.

### 5.4 CLI Contract

```powershell
# 외부 API -> 불변 snapshot만 생성
uv run --directory product/apps/api python ../../scripts/collect_kosis_population.py

# 지정 snapshot -> development PostgreSQL 적재
uv run --directory product/apps/api python ../../scripts/import_kosis_population.py `
  --snapshot data/raw/kosis-population/<timestamp>
```

- collector는 `KOSIS_API_KEY`만 요구하고 DB에 접속하지 않는다.
- importer는 `DATABASE_URL`만 요구하고 KOSIS API를 호출하지 않는다.
- 성공 출력에는 snapshot 상대경로, row count, SHA-256만 표시한다.
- API key, `DATABASE_URL`, full request URL은 성공·실패 출력 모두 금지한다.

### 5.5 전국사업체조사 경계

읍면동·산업대분류 자료는 KOSIS table API로 추정해 호출하지 않는다. 공식 온라인간행물에서
제공하는 `2024년기준자료.xlsx`를 내려받아 1개 sheet, 84,484행, 59열과 2행 header를 검증한다.
간행물의 구형 지역코드 `11140660/680/710`은 현재 KOSIS 행정동 코드로 명시적으로 변환한다.
`X`로 비공개 처리된 수치는 0으로 바꾸지 않고 nullable count와 `is_suppressed=true`로 보존한다.

`admin_area_business_metrics`의 grain은 `(admin_area_code, period, industry_code)`이며 세 행정동과
`TOTAL + A~U` 22개 산업대분류의 66행만 적재한다. 산업대분류는 현재 점포 소분류와 자동 결합하지
않고 행정동의 업무·종사 수요를 설명하는 배경 통계로만 사용한다.

## 6. Acceptance Criteria

- [x] 공식 metadata에서 확정한 세 행정동·세 항목·22개 연령구간만 요청한다.
- [x] 2025.12 raw JSON 198행과 sanitized manifest를 timestamp directory에 저장한다.
- [x] API 오류·빈 응답·40,000-cell 초과·코드/기간 변경을 명시적으로 거부한다.
- [x] API key가 URL 출력, raw JSON, manifest, Git과 FE bundle에 없다.
- [x] Alembic migration으로 population과 crosswalk table이 생성된다.
- [x] 198 raw row가 66 canonical population row로 변환된다.
- [x] 같은 snapshot을 두 번 import해도 row count와 값이 같다.
- [x] 세 market과 행정동 crosswalk가 비가중 참고 관계로 저장된다.
- [x] source path는 저장소 상대경로이며 개인 PC 절대경로가 아니다.
- [x] 전국사업체조사 최신 제공연도와 XLSX 입수·검증 상태가 기록된다.
- [x] 전국사업체조사 XLSX의 실제 header·지역·산업 code를 검증하고 종사자 통계를 적재한다.

## 7. Verification Plan

### 단계별 test-first 순서

1. 198행 synthetic fixture로 contract validator와 66행 변환 test를 먼저 작성한다.
2. migration upgrade/downgrade/re-upgrade로 schema와 FK를 확인한다.
3. 임시 SQLite target에 같은 snapshot을 두 번 import해 idempotency와 rollback을 검증한다.
4. mock HTTP로 timeout, non-JSON, provider error, empty, code/period drift를 검증한다.
5. 실제 KOSIS snapshot 1회를 수집하고 raw/manifest hash와 secret pattern을 검사한다.
6. development Supabase에 migration과 import를 적용한 뒤 count/value/FK query를 실행한다.
7. 전체 API 회귀 test로 DB-001, 검색, nearby 기능이 그대로 통과하는지 확인한다.

### Test Matrix

| case | 기대 결과 |
| --- | --- |
| 3 areas × 22 ages × 3 items | validator 통과, 66 canonical row |
| item 1개 누락/중복 | 명시적 실패, DB write 0 |
| 다른 area/period/table | 명시적 실패 |
| `DT` 음수/비정수 | 명시적 실패 |
| empty/provider error/non-JSON/timeout | sanitized `KosisPopulationError` |
| manifest hash 불일치 | import 중단, DB write 0 |
| 같은 snapshot 2회 import | count와 value 동일 |
| 존재하지 않는 market crosswalk | 전체 rollback |
| raw/manifest/stdout 검색 | API key·DB secret·개인 절대경로 0건 |
| 기존 canonical seed/API test | 회귀 없음 |

```powershell
uv run --directory product/apps/api pytest tests/test_kosis_population.py -q
uv run --directory product/apps/api pytest -q
uv run --directory product/apps/api ruff check src tests alembic
uv run --directory product/apps/api alembic upgrade head
uv run --directory product/apps/api python ../../scripts/collect_kosis_population.py
uv run --directory product/apps/api python ../../scripts/import_kosis_population.py --snapshot <relative-path>
python scripts/check_task_packet.py --root . --require
python scripts/check_docs_html.py
git diff --check
```

DB 검증:

```text
population row = 66
crosswalk row = 3
FK orphan = 0
두 번째 import 전후 count·value 동일
secret/absolute-path pattern = 0
```

## 8. Documentation Updates

- [x] 공식 API contract와 실제 수집 결과를 data source mapping에 기록한다.
- [x] ERD와 development/production 적용 경계를 database structure에 기록한다.
- [x] 전국사업체조사 최신 XLSX 제공 상태와 실제 적재 결과를 기록한다.
- [x] Run Report에 row count·hash·재실행·secret 검사 결과를 기록한다.

## 9. Commit Plan

```text
test(data): define KOSIS population contracts
feat(data): collect validated KOSIS population snapshots
feat(db): migrate and import admin-area background statistics
feat(data): import official KOSIS business census workbook
docs(data): record KOSIS population and business provenance
```

각 commit은 최대 10개 staged file과 저장소 hook의 source+Task Packet+Run Report 조건을
지킨다. 실제 development Supabase 적용 결과가 나오기 전에는 Acceptance를 완료로 바꾸지 않는다.

## 10. Self-check

- [x] 행정동과 상권 polygon을 같은 경계로 표현하지 않았는가?
- [x] secret을 request metadata나 오류에 넣지 않았는가?
- [x] 외부 응답 변경을 빈 값이나 0으로 숨기지 않았는가?
- [x] snapshot과 canonical import를 분리해 재현 가능하게 했는가?
- [x] 자동 갱신을 DATA-007 결정 전에 추가하지 않았는가?
- [x] 전국사업체조사 B단계도 같은 provenance·idempotency 기준을 적용했는가?
- [x] GitHub Issue #37에 Task·Run Report와 최종 검증 결과를 연결했는가?
- [ ] Jira에 최종 commit·검증 결과를 연결했는가?
