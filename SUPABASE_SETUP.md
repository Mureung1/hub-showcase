# Supabase 저장 공고 연동

UniRadar의 로그인 사용자 저장 공고는 `saved_opportunities` 테이블에 저장한다. Express가 사용자 access token을 검증하고, Supabase RLS가 자신의 행만 조회·저장·삭제하도록 제한한다.

## 1. 테이블과 RLS 만들기

Supabase SQL Editor에서 [supabase/20260720_auth_profiles.sql](./supabase/20260720_auth_profiles.sql)을 실행한다. 이 migration에는 `profiles`, `user_settings`, `saved_opportunities`, `tasks`와 사용자별 RLS 정책이 포함되어 있다.

기존 로컬 데모용 `opportunity_analyses` 테이블은 로그인하지 않는 서버 저장 모드와의 호환을 위해 유지한다.

## 2. 환경변수 설정

로컬 `.env`에 아래 공개 인증 설정을 입력한다. 실제 키는 Git에 커밋하지 않는다.

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_publishable_anon_key
```

브라우저에는 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_ANON_KEY` 공개 값만 사용한다. `SUPABASE_SERVICE_ROLE_KEY`는 사용자별 저장 공고 API에 필요하지 않으며 프론트엔드에 넣으면 안 된다.

## 3. 데이터 흐름

```text
React 저장 버튼
→ POST /api/saved-opportunities + Bearer access token
→ Express 사용자 검증
→ saved_opportunities RLS 저장
→ GET /api/saved-opportunities
→ 4. 저장한 공고 화면
```

같은 사용자의 동일한 원문 URL은 중복 행을 만들지 않고 기존 저장 공고를 갱신한다. 원문 URL이 없으면 동일 제목을 기준으로 갱신한다.

## 4. 실행 및 확인

```bash
npm run dev
```

1. 로그인한다.
2. 공고를 분석하고 `서버 저장`을 누른다.
3. 사이드바에서 `4. 저장한 공고`를 연다.
4. 목록, 필터, 정렬, 상세 보기, 삭제를 확인한다.
5. 다른 계정으로 로그인했을 때 이전 계정 공고가 보이지 않는지 확인한다.

## 로컬 데모 fallback

Supabase 인증을 설정하지 않은 경우 기존 `/api/opportunities` API와 로컬 SQLite DB를 사용한다. DB 파일은 `data/uniradar-demo.sqlite`이며 Git에서 제외된다.