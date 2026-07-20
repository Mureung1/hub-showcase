# DEPLOY-002 Production DB Promotion Tooling Run Report

## 결과

- 상태: tooling ready, production apply pending
- production Supabase project는 아직 생성하지 않았다.
- 개발용 `product/.env`와 분리된 `PRODUCTION_DATABASE_URL`만 허용한다.
- 기본 실행은 dry-run이며 `--apply`가 있어야 migration과 import를 수행한다.

## 검증한 안전장치

- project ref 형식과 재입력 일치
- URL host 또는 username의 project ref 일치
- PostgreSQL scheme, host, username과 password 존재
- canonical file과 세 snapshot directory 존재
- 오류 메시지의 URL·password 비노출
- migration → canonical → KOSIS population → KOSIS business → market population 순서
- 종료 시 engine dispose

## 자동 검증

```text
production promotion tests: 4 passed
Ruff: passed
dry-run: target verified, inputs verified, no changes
```

dry-run은 가짜 PostgreSQL target identity와 실제 local snapshot 경로로 수행했으며 외부 DB에
연결하거나 변경하지 않았다.

실제 input preflight는 다음 승인 경로로 다시 통과했다.

```text
canonical: product/data/processed/localtwin.db
KOSIS population: product/data/raw/kosis-population/20260716T040045Z
KOSIS business: product/data/raw/kosis-business-census/20260716T042316Z
Seoul market population: product/data/raw/seoul-market/20260716T083510Z
result: target verified, inputs verified, no database changes
```

Supabase 공식 연결 기준을 대조해 Render runtime은 IPv4를 지원하는 Shared pooler Session mode
`5432`를 사용하도록 확정했다. Direct endpoint는 IPv6 또는 IPv4 add-on 환경에서 migration에
사용할 수 있고, Transaction mode `6543`은 prepared statement를 지원하지 않으므로 현재
지속형 FastAPI·SQLAlchemy runtime 기본값에서 제외한다. 모든 production 연결은 SSL을
요구하며 `sslmode=require`가 없는 staging·production URL은 설정 단계에서 거부한다.

## 남은 Gate

- 사용자 승인으로 별도 production Supabase 생성
- 실제 production URL을 현재 process에만 설정
- dry-run 재실행 후 `--apply`
- Render `DATABASE_URL` 설정
- API 수동 release와 공개 smoke 뒤 Web 수동 release

## 공개 배포 1차 Smoke

2026-07-16에 현재 공개 URL을 읽기 전용으로 점검했다.

```text
Web https://localtwin-product.vercel.app -> 200
API GET /health -> 200
Web origin CORS preflight -> 200
Scene API GET /api/v1/scenes -> 404
Web production bundle -> Render API URL 포함, localhost API URL 없음
Search GET /api/v1/search?query=연남 -> 503
Market GET /api/v1/markets/3110562?category=카페 -> 503
```

Render Dashboard에서 secret 값은 열지 않고 key 이름만 확인했다. 현재 등록된 key는
`CORS_ORIGINS_SERVER`, `ENVIRONMENT`, `PYTHONUNBUFFERED`, `SCENE_API_ENABLED`이며
`DATABASE_URL`은 없다. 따라서 Web·API 주소와 CORS 연결은 완료됐지만 runtime DB를 사용하는
검색·분석 흐름은 아직 공개 환경에서 준비되지 않았다.

다음 수동 gate는 별도 production Supabase 승격을 마친 뒤 Render에 production
`DATABASE_URL`을 추가하고 수동 재배포하는 것이다. development DB URL을 임시 production
credential로 사용하지 않는다.

1차 smoke 뒤 `/health`는 프로세스 liveness로 유지하고 `/ready`를 추가했다. `/ready`는 runtime
DB 연결, `markets` schema와 최소 1개 canonical 상권을 확인하며 하나라도 준비되지 않으면 generic
503을 반환한다. 이후 Render health check는 `/ready`를 사용하므로 DB 없이 프로세스만 시작된
배포를 정상 release로 오인하지 않는다. 이 변경은 아직 공개 서비스에 수동 재배포하지 않았다.
