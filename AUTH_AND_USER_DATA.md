# 인증과 사용자 데이터

## 선택한 구조

- 인증: Supabase Auth의 이메일·비밀번호 인증
- 프로필 DB: Supabase PostgreSQL `profiles`
- 세션: Supabase 클라이언트가 이 기기의 `localStorage`에서 복원하며, 앱은 `AuthProvider` 한 곳에서 상태를 관리한다. 창·탭을 닫은 뒤에도 유지되며 사용자가 로그아웃하면 제거된다.
- API 인증: React가 access token을 `Authorization: Bearer <token>`으로 보내면 Express가 Supabase `auth.getUser(token)`으로 검증한다.
- DB 접근: 프로필 쿼리는 검증된 토큰을 가진 anon Supabase 클라이언트로 실행한다. 따라서 RLS가 실제 API 접근에도 적용된다.

비밀번호와 service role key는 앱 코드나 브라우저 저장소에 저장하지 않는다. 지속 로그인 기능을 위해 Supabase 클라이언트가 갱신 가능한 인증 세션을 이 기기의 `localStorage`에 보관한다. 이 세션은 로그아웃 시 제거되며, 공용 기기에서는 사용 후 반드시 로그아웃해야 한다. UniRadar의 `uniradar.userProfile`에는 프로필 데이터만 남는다.

## 환경변수

`.env.example`을 참고해 로컬 `.env`에 아래 네 값을 설정한다.

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_anon_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_publishable_anon_key
```

`VITE_` 값은 브라우저에 노출되는 공개 anon 키이므로 service role key를 넣으면 안 된다. `SUPABASE_SERVICE_ROLE_KEY`는 기존 서버 전용 저장 기능에서만 필요하며, 인증·프로필 API에는 사용하지 않는다.

## DB와 RLS

Supabase SQL Editor에서 [`supabase/20260720_auth_profiles.sql`](./supabase/20260720_auth_profiles.sql)을 실행한다.

`profiles.user_id`는 `auth.users.id`를 참조한다. 각 정책은 `auth.uid() = user_id`를 요구하므로 다른 계정의 조회, 삽입, 수정, 삭제가 허용되지 않는다. 같은 migration에는 이후 구현할 `user_settings`, `saved_opportunities`, `tasks`의 테이블 골격과 동일한 소유자 기반 RLS 정책도 포함한다. 오늘 연결된 CRUD는 `profiles`뿐이다.

## 회원가입과 프로필 흐름

```text
회원가입 또는 로그인
→ AuthProvider가 세션 복원 및 상태 변경 감지
→ GET /api/profile (Bearer token)
→ Express requireAuth
→ Supabase 토큰 검증
→ RLS가 적용된 profiles 조회
→ 화면 표시

프로필 저장
→ PUT /api/profile
→ req.user.id로 upsert
→ 저장된 프로필 반환
→ 화면과 로컬 매칭 결과 갱신
```

요청 본문의 `userId`는 저장 소유자 판정에 사용하지 않는다. 서버는 언제나 검증된 `req.user.id`를 사용한다.

## 기존 localStorage 프로필

기존 `uniradar.userProfile`가 있고 계정 DB 프로필이 비어 있으면 로그인 후 **계정으로 가져오기**를 표시한다. 사용자가 버튼을 눌렀을 때만 DB에 저장한 뒤 기존 로컬 프로필을 지운다. 동의 전에는 삭제하거나 자동 이전하지 않는다.

Supabase 환경변수가 없는 로컬 데모에서는 기존 localStorage 프로필을 계속 사용할 수 있다. 이것은 인증 대체 기능이 아니라 개발 중 기존 흐름을 보존하기 위한 fallback이며, 계정별 데이터 분리는 Supabase 설정 후에만 활성화된다.

## 다음 데이터 연결

- `user_settings`: 사용자별 추천 조건과 자동 저장 설정
- `saved_opportunities`: 분석한 공고와 당시 분석 결과
- `tasks`: 저장 공고와 연결된 준비 태스크

각 테이블은 `user_id`와 RLS 정책을 먼저 준비했다. 이후 API는 지금의 `/api/profile`과 동일하게 `requireAuth`와 `req.user.id`를 사용해야 한다.