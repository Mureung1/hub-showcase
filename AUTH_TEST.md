# 인증 수동 테스트

테스트 계정의 실제 이메일과 비밀번호는 문서나 Git에 기록하지 않는다. 아래 테스트는 Supabase 환경변수와 [`supabase/20260720_auth_profiles.sql`](./supabase/20260720_auth_profiles.sql)을 적용한 개발 서버에서 수행한다.

1. `npm run dev` 실행 후 `http://127.0.0.1:5173`을 연다.
2. 계정 A를 회원가입하고 이메일 인증이 켜져 있다면 인증을 완료한 뒤 로그인한다.
3. 프로필에 학교, 학년, 전공, 관심 분야, 활동 가능 지역, 팀 참여 가능 여부를 입력해 저장한다.
4. 새로고침한다. 계정 A의 프로필이 다시 표시되는지 확인한다.
5. DevTools Network에서 `GET /api/profile`과 `PUT /api/profile` 요청이 `Authorization: Bearer ...`를 포함하고, 응답의 `profile.userId`가 계정 A인지 확인한다. 토큰 값 자체는 기록하지 않는다.
6. 로그아웃한다. 프로필 폼이 로그인 안내로 바뀌고 `GET /api/profile`을 직접 호출하면 401인지 확인한다.
7. 계정 B를 회원가입 또는 로그인한다. 계정 A의 프로필이 보이지 않아야 한다.
8. 계정 B에서 요청 body에 계정 A의 `userId` 값을 임의로 넣어 `PUT /api/profile`을 보내도, 계정 B의 토큰으로만 저장되는지 확인한다. 계정 A로 다시 로그인해 원래 프로필이 유지되는지 확인한다.
9. 만료되었거나 임의의 Bearer 토큰으로 `GET /api/profile`을 호출해 401과 친절한 메시지가 반환되는지 확인한다.
10. 기존 localStorage 프로필이 있다면 계정 DB 프로필이 비어 있는 상태에서 **계정으로 가져오기**를 누른다. DB 저장 성공 후 화면이 갱신되고 `uniradar.userProfile`가 제거되는지 확인한다.

자동 테스트는 `npm test`, 빌드는 `npm run build`로 실행한다. 실제 두 계정 분리는 Supabase 프로젝트 설정과 이메일 수신이 필요한 수동 검증 항목이다.