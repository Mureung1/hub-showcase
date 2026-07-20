# Supabase 저장 공고 연동

UniRadar는 분석 결과를 `opportunity_analyses` 한 테이블에 저장한다. 전체 표준 분석 결과는 `analysis_result` JSONB 컬럼에 보관하고, 목록 화면에 필요한 공고명, 카테고리, 마감일, 주최 기관, 원문 URL은 별도 컬럼으로 함께 저장한다.

## 1. 테이블 만들기

Supabase 대시보드의 SQL Editor에서 [`supabase/opportunity_analyses.sql`](./supabase/opportunity_analyses.sql)을 실행한다.

이 테이블은 RLS를 활성화하고, 브라우저의 anon key에는 정책을 부여하지 않는다. 저장과 조회는 Express 서버의 service role key로만 수행한다.

## 2. 로컬 환경변수 설정

로컬 `.env`에 아래 값을 추가한다. 실제 키는 절대 Git에 커밋하지 않는다.

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=server_only_service_role_key
SUPABASE_OPPORTUNITIES_TABLE=opportunity_analyses
ALLOW_SUPABASE_PERSISTENCE=true
```

`ALLOW_SUPABASE_PERSISTENCE`는 명시적인 활성화 장치다. 키가 있어도 이 값이 `true`가 아니면 저장 API는 동작하지 않는다.

## 3. 실행 및 확인

개발 서버를 다시 시작한 뒤 다음을 확인한다.

```bash
npm run dev
```

- `GET /api/health`의 `supabaseConfigured`가 `true`
- 분석 결과의 `서버 저장` 버튼이 활성화됨
- `서버 저장 공고` 카드에서 저장한 분석 결과를 다시 열 수 있음

## 보안 제한

현재 앱에는 로그인 기능이 없다. 따라서 service role key를 사용하는 저장 API는 로컬 개발 또는 접근이 엄격히 제한된 환경에서만 사용한다. 공개 배포 전에 Supabase Auth와 사용자별 RLS 정책을 추가해야 한다.

## 계정 프로필 인증

로그인과 사용자별 프로필은 별도 migration인 [supabase/20260720_auth_profiles.sql](./supabase/20260720_auth_profiles.sql)로 설정합니다. 이 경로는 service role key를 사용하지 않으며, 브라우저 공개 anon key와 RLS 정책으로 자신의 `profiles` 행만 읽고 쓸 수 있게 합니다. 자세한 환경변수와 테스트는 [AUTH_AND_USER_DATA.md](./AUTH_AND_USER_DATA.md)를 참고하세요.