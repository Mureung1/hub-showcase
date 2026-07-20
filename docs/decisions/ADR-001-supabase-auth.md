# ADR-001: Supabase Auth 기반 이메일·비밀번호 인증 도입

- 상태: Accepted
- 날짜: 2026-07-16

## 배경

초기 결정은 로그인 없음 + `sessionId` 기반 구분이었다. 계정별 Chat·DecisionNote 관리, AI 호출 비용의 사용자 단위 통제, 데이터 소유권 분리가 필요해져 인증 구조를 도입한다. 4주 MVP와 React SPA + Express 구조에서 별도 인증 서버 없이 도입 가능한 Supabase Auth를 선택했다.

## 결정

- 인증 방식은 Supabase Auth 이메일 + 비밀번호로 하고, 이메일 인증 완료를 서비스 이용의 필수 조건으로 한다.
- 사용자 식별자는 `auth.users.id`를 사용한다. 별도 Account 테이블을 만들지 않고, 프로필 정보가 필요해질 때만 `public.profiles`를 추가한다.
- React는 회원가입, 로그인, 로그아웃, 세션 확인 등 Supabase Auth 기능에 한해 Supabase Client를 직접 호출할 수 있다. 서비스 데이터의 조회·저장은 반드시 Express API를 거친다.
- Express Auth Middleware가 `Authorization: Bearer` 토큰의 Supabase JWT를 검증해 `req.auth.userId`를 설정한다. 클라이언트가 전달한 userId는 신뢰하지 않는다.
- `sessionId`는 인증 사용자 데이터 소유권에서 제거하고, 필요한 경우 로그인 전 localStorage 임시 Draft 구분에만 사용한다.
- 프론트엔드에는 Supabase URL과 Publishable Key만 둔다. Secret Key와 Service Role Key는 백엔드 환경변수에만 둔다.

## MVP 제외

비밀번호 재설정(Should), 소셜 로그인, 프로필 수정, 회원 탈퇴, 게스트 데이터 병합(비회원 데이터 이전·sessionId 병합 포함), 다중 인증.

## 결과

- 모든 소유 데이터는 `user_id` 기준으로 분리되고 사용자 데이터 테이블에 RLS를 적용한다.
- 이메일 인증 활성화로 가입 직후 "인증 안내" 상태와 로그인 완료 상태를 UI에서 구분해야 한다.
