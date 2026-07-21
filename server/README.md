# 알리장 서버

Express 백엔드. `api-spec.md`를 계약으로 삼아 구현한다. DB는 Supabase(Postgres)를 쓰고, 서버만 `service_role key`로 접근한다 (프론트는 Supabase를 직접 호출하지 않음).

## 실행

```
npm install
npm run dev
```

`.env`에 아래 값을 채워야 한다 (`.env.example` 참고):

```
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`는 Supabase 프로젝트의 Project Settings → API에서 확인한다.

## 마이그레이션 (수동)

자체 마이그레이션 러너가 없다. `server/migrations/*.sql`을 새 파일 번호 순서대로 **Supabase SQL Editor에서 직접 실행**해야 한다.

1. [supabase.com](https://supabase.com) 로그인 → `.env`에 URL/키를 넣은 프로젝트로 진입
2. 왼쪽 사이드바 **SQL Editor** → **New query**
3. `server/migrations/000N_*.sql` 파일 내용을 그대로 붙여넣고 **Run**
4. **Table Editor**에서 테이블이 생성됐는지 확인

### 권한(GRANT) 문제

테이블만 만들고 끝내면 API 호출 시 아래처럼 에러가 난다 (RLS 정책 문제가 아니라 GRANT 누락):

```json
{"error":{"code":"DB_ERROR","message":"permission denied for table posts"}}
```

새 마이그레이션으로 테이블을 만들 때마다, SQL Editor에서 그 테이블에 대해 아래 GRANT문도 함께 실행한다 (테이블명만 바꿔서):

```sql
GRANT ALL ON TABLE public.<테이블명> TO anon, authenticated, service_role;
```

현재 이 프로젝트에 필요한 것들:

```sql
GRANT ALL ON TABLE public.posts TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.brand_profiles TO anon, authenticated, service_role;
```

새 환경(팀원 합류, 배포용 프로젝트 분리 등)에서 Supabase 프로젝트를 새로 만들 때는 이 문서의 "마이그레이션" 단계 전체(테이블 생성 + GRANT)를 다시 밟아야 한다.

## 폴더 구조

```
migrations/       Supabase SQL Editor에서 수동 실행하는 마이그레이션 SQL (번호 순서대로)
src/
  routes/         엔드포인트별 라우터
  services/       인터뷰 흐름, 콘텐츠 생성(규칙 기반), 리포지토리(Supabase 쿼리)
  db/index.js     Supabase 클라이언트 초기화
  middleware/     공통 에러 포맷
```
