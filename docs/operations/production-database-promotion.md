# Production Database Promotion

문서 상태: 운영 runbook

## 목적

LocalTwin의 development Supabase를 운영 DB로 승격하지 않는다. 별도 production Supabase
project를 만들고, development에서 검증한 migration과 공식 snapshot import 절차만 다시
실행한다. 이 분리는 개발 migration·재seed가 실제 사용자 데이터에 영향을 주는 것을 막는다.

## 사전 조건

1. 별도 production Supabase project와 DB password를 생성한다.
2. project ref를 Supabase Dashboard에서 확인한다.
3. connection string은 현재 PowerShell process의 `PRODUCTION_DATABASE_URL`에만 둔다.
4. production URL을 `product/.env`, command argument, 문서에 저장하지 않는다.
5. 아래 네 입력 snapshot을 확인한다.

```text
canonical SQLite
KOSIS population snapshot
KOSIS business census snapshot
Seoul market population snapshot
```

현재 승인한 입력은 다음과 같다. 새 원천을 받기 전에는 자동으로 더 최신 directory를 선택하지
않고 이 경로를 명시한다.

```text
product/data/processed/localtwin.db
product/data/raw/kosis-population/20260716T040045Z
product/data/raw/kosis-business-census/20260716T042316Z
product/data/raw/seoul-market/20260716T083510Z
```

## 연결 문자열 선택

Supabase Dashboard 상단 `Connect`에서 connection string을 복사하고 직접 조립하지 않는다.
비밀번호는 URI 구성요소로 안전하게 encoding된 값을 사용하며 끝에 `sslmode=require`를 둔다.

| 사용처 | 연결 방식 | Port | 이유 |
| --- | --- | --- | --- |
| 로컬 migration·import | Direct connection, IPv6를 사용할 수 없으면 Session pooler | `5432` | Alembic과 긴 import session에 적합 |
| Render FastAPI runtime | Shared pooler의 Session mode | `5432` | Render의 IPv4 network에서 동작하는 지속형 backend |

Render에는 Transaction pooler `6543`을 기본값으로 쓰지 않는다. 이 mode는 짧은 serverless
transaction을 위한 것이고 prepared statement를 지원하지 않는다. 공식 선택 기준은
[Supabase database connection 문서](https://supabase.com/docs/guides/database/connecting-to-postgres)를
따른다.

## 1. Dry-run

다음 명령은 target과 입력만 검증하며 DB에 연결하거나 변경하지 않는다.

```powershell
$env:PRODUCTION_DATABASE_URL = "<production Supabase direct 또는 session-pooler connection string + sslmode=require>"

uv run --directory product/apps/api python ../../scripts/promote_production_database.py `
  --project-ref <production-project-ref> `
  --confirm-project-ref <production-project-ref> `
  --canonical ../../data/processed/localtwin.db `
  --kosis-population ../../data/raw/kosis-population/20260716T040045Z `
  --kosis-business ../../data/raw/kosis-business-census/20260716T042316Z `
  --market-population ../../data/raw/seoul-market/20260716T083510Z
```

성공 출력에는 `target identity`, `input snapshots`, `dry-run`만 표시되고 URL·host·password는
표시되지 않는다.

## 2. Apply

dry-run과 같은 명령 마지막에 `--apply`를 추가한다.

```text
Alembic upgrade head
-> canonical 9 tables upsert
-> KOSIS population·crosswalk upsert
-> KOSIS business census upsert
-> Seoul market population upsert
-> row count report
```

모든 import는 stable primary key 기반 upsert다. 중간 실패 시 downgrade나 DB reset을 하지 않고
원인을 수정한 뒤 같은 명령을 다시 실행한다. 운영 데이터가 생긴 뒤에는 migration 전 backup과
forward-only rollback plan을 별도 release 기록에 남긴다.

## 3. Render 연결

promotion이 끝난 뒤에만 Render `localtwin-api`의 `DATABASE_URL`에 production Session pooler
connection string을 저장한다. Web의 `VITE_API_BASE_URL`에는 Render 공개 API URL만 두며 DB
secret을 넣지 않는다.

수동 배포 순서는 다음과 같다.

1. Render secret에 `DATABASE_URL`을 저장한다.
2. Render에서 `develop` 최신 commit을 수동 배포한다.
3. `/ready`와 API smoke가 통과하는지 확인한다.
4. 그 뒤 Vercel에서 같은 release의 Web을 수동 배포한다.

API와 Web의 response contract가 함께 바뀔 수 있으므로 Web을 먼저 배포하지 않는다.

수동 release 후 확인:

```text
GET /health -> 200
GET /api/v1/search?query=연남 -> 200
GET /api/v1/markets/3110562?category=카페 -> 200
GET /api/v1/stores/nearby?...&radius=300 -> 200
제품 Web origin CORS preflight -> 200
Scene API -> 404
```

검증이 끝나면 현재 PowerShell process의 `PRODUCTION_DATABASE_URL`을 제거한다.

```powershell
Remove-Item Env:PRODUCTION_DATABASE_URL
```

## 금지 사항

- development Supabase URL을 production secret으로 복사하지 않는다.
- production URL을 `DATABASE_URL=...` 형태로 commit하지 않는다.
- `--apply` 전에 dry-run을 생략하지 않는다.
- Dashboard SQL Editor에서 migration을 수동 재작성하지 않는다.
- 공개 장애 대응으로 destructive Alembic downgrade를 실행하지 않는다.
