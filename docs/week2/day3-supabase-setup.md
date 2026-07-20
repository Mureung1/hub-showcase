# Supabase 연동 셋업 가이드 — 이슈 #3

지원금 데이터를 저장/조회할 Supabase 기반을 구성한다. 이 문서는 **프로젝트 생성 → 스키마 실행 → 시드 → 조회 검증**까지의 순서를 정리한다.

> 범위: 연결·스키마·시드·검증까지. 실제 `GET /api/subsidies` / `POST /api/match`의 DB 조회 전환은 이슈 #4에서 진행한다.

---

## 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) 로그인 → **New project**
2. 입력값
   - **Name**: `gov-subsidy-curator` (자유)
   - **Database Password**: 강력한 비밀번호 생성 후 안전하게 보관 (DB 직접 접속 시 사용)
   - **Region**: `Northeast Asia (Seoul)` 권장 (지연 최소화)
3. 생성 완료까지 대기 (약 1~2분)

## 2. 연결 정보 확보

**Project Settings > API** 에서 아래 두 값을 복사한다.

| 항목 | 환경변수 | 용도 |
|------|----------|------|
| Project URL | `SUPABASE_URL` | Supabase 엔드포인트 |
| `service_role` secret | `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 키 (RLS 우회) |

> `service_role` 키는 **모든 RLS 정책을 우회하는 관리자 키**다. 절대 클라이언트(프론트)나 저장소에 커밋하지 말 것. 서버(`server/`)의 `.env`에서만 사용한다.

## 3. 스키마 실행

Supabase 대시보드 **SQL Editor**에서 [`supabase/schema.sql`](../../supabase/schema.sql) 전체를 붙여넣고 실행한다. `subsidies` 테이블과 RLS 설정이 생성된다.

- 서버는 `service_role` 키로 접근하므로 RLS는 켜두되 별도 anon 정책은 두지 않는다.

## 4. 환경변수 입력

루트 `.env`(없으면 `cp .env.example .env`)에 값 입력:

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

`.env`는 커밋하지 않는다 (`.gitignore` 확인).

## 5. 시드 & 조회 검증

```bash
npm run db:seed  -w @hub/server   # 샘플 지원금 데이터 upsert
npm run db:check -w @hub/server   # count + 첫 row 출력 (조회 성공 확인)
```

- `db:check`가 count와 첫 row를 정상 출력하면 이슈 #3 완료 기준을 만족한다.

---

## 검증 체크리스트 (이슈 #3)

- [ ] Supabase 연결 환경변수(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)가 정상 로드된다.
- [ ] `db:seed` 실행 시 샘플 row가 insert/upsert 된다.
- [ ] `db:check` 실행 시 저장된 row가 조회된다.
