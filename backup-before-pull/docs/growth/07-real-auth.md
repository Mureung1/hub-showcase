# 7. 실제 인증 — 화면만이 아니라 세션까지

여기서부터는 Mock이 아니라 진짜였다. Supabase Auth를 붙여서 실제로 회원가입하고 로그인하게 만들었다. 화면만 만드는 것과, 세션이 진짜로 유지되고 만료되는 걸 다루는 건 완전히 다른 일이었다.

## ① 진행한 내용

- 실제 Supabase로 인증 연결 — 이메일·비밀번호 회원가입, 이메일 인증(완료해야 서비스 이용), 로그인/로그아웃.
- 세션 관리 — 새로고침·브라우저 재시작 후 로그인 유지(복원), 토큰 자동 갱신, 만료 시 "세션이 만료되었습니다" 안내, 탭 간 로그아웃 동기화(onAuthStateChange 구독).
- 라우트 가드 — 비로그인은 워크스페이스 차단, 로그인 상태로 로그인 화면 진입 시 되돌림.
- 실제 프로젝트에서 하나씩 실측 — 메일 발송 제한 때문에 테스트 계정 아껴가며(Gmail `+별칭`) 미인증 로그인 케이스까지 재현.

## ② 추가로 배운 개념

- 이메일 인증을 필수로 두는 것, 세션과 Access·Refresh Token이 뭔지.
- `onAuthStateChange` 구독으로 세션 변화에 앱 전체가 반응하게 하는 것.
- 세션이 localStorage에 남아 복원되는 원리, 라우트 가드.

## ③ 꼭 공부할 개념

- 인증(Authentication) vs 인가(Authorization)
- 세션 vs 토큰, JWT 구조와 Access/Refresh Token 갱신
- 이메일 인증·OAuth 흐름
- 프론트 세션 저장(localStorage)과 보안 고려사항

**학습 자료**

- [Supabase — Auth](https://supabase.com/docs/guides/auth)
- [jwt.io — Introduction to JSON Web Tokens](https://jwt.io/introduction)
- [MDN — HTTP authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication)
- [OWASP — Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

## ④ 참고 링크 — 직접 만든 문서

- `docs/specs/SPEC-AUTH-001-email-auth-ui.md`
- `docs/specs/SPEC-AUTH-002-auth-session.md`
- `docs/decisions/ADR-001-supabase-auth.md`
