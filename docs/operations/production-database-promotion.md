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

## 1. Dry-run

다음 명령은 target과 입력만 검증하며 DB에 연결하거나 변경하지 않는다.

```powershell
$env:PRODUCTION_DATABASE_URL = "<production Supabase connection string>"

uv run --directory product/apps/api python ../../scripts/promote_production_database.py `
  --project-ref <production-project-ref> `
  --confirm-project-ref <production-project-ref> `
  --canonical ../../data/processed/localtwin.db `
  --kosis-population ../../data/raw/kosis-population/<snapshot> `
  --kosis-business ../../data/raw/kosis-business-census/<snapshot> `
  --market-population ../../data/raw/seoul-market/<snapshot>
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

promotion이 끝난 뒤에만 Render `localtwin-api`의 `DATABASE_URL`에 production connection
string을 저장한다. Web의 `VITE_API_BASE_URL`에는 Render 공개 API URL만 두며 DB secret을
넣지 않는다.

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
