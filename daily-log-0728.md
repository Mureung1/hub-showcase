# 7/28 (월) — 기능 점검 및 버그 수정 (SMTP 타임아웃, API 안정화)

## 주요 작업 리스트
- 배포된 앱(Vercel + Render)을 실행하면서 전체 기능 점검 — 되는 기능 8개, 안 되는 기능 3개, Mock 전용 4개, UX 이슈 3개로 분류
- 이메일 인증 SMTP 무한 대기 버그 수정 — nodemailer에 connection/socket 타임아웃(10s/15s) 추가
- AI 음식 추천 fallback에서 undefined 노출되는 버그 수정 — 파라미터 기본값 처리
- 프론트엔드 모든 API 호출(11곳)에 fetchWithTimeout 헬퍼 적용 — 서버 무응답 시 20초 후 에러 메시지 표시
- Firebase API 키를 소스코드 하드코딩에서 환경변수(import.meta.env) 기반으로 변경
- 깨진 git ref(refs/remotes/origin/main 2) 수정 후 NO87_박준우 브랜치 push
- upstream(connect-AIAgentChallenge-26-1/hub)에 PR #2039 생성 및 본문 업데이트
- Render 대시보드에서 환경변수 3개(MONGODB_URI, GEMINI_API_KEY, EMAIL_PASS) 수동 설정

## 내가 설명할 수 있는 부분
- 앱의 전체 로그인 흐름: 이메일+비밀번호 입력 → 이메일 인증(4자리 코드) → 온보딩 → 메인 화면, 또는 Google OAuth로 바로 진입
- fetchWithTimeout이 왜 필요한지: Render 무료 서버가 15분 후 sleep되고, cold start에 30~60초 걸리는데, fetch에 타임아웃이 없으면 UI가 "발송 중..." 상태로 영원히 멈춤
- AI 추천 fallback에서 undefined가 뜬 이유: 서버 코드에서 ${foodCategory}를 템플릿 리터럴로 쓰는데, 클라이언트가 해당 필드를 안 보내거나 빈 값이면 JS가 그대로 "undefined" 문자열로 출력
- Fork 워크플로우: origin(Aiden-Park11/hub) → upstream(connect-AIAgentChallenge-26-1/hub), 작업은 Aiden-Park11 브랜치에서 하고 NO87_박준우로 merge해서 PR

## 아직 이해 못 한 부분
- 로컬에서 node server.js를 실행하면 프로세스는 뜨는데 포트를 열지 않는 문제 — require.main === module 조건도 맞는데 왜 listen이 안 되는지 원인 불명
- Gmail 앱 비밀번호가 왜 Render에서 타임아웃이 나는지 — 비밀번호 만료인지, Render IP 차단인지, Gmail 보안 정책 변경인지 정확한 원인은 못 찾음
- MongoDB Atlas M0 무료 티어의 연결 제한이나 IP 화이트리스트 설정이 Render와 맞는지

## 새로 알게 된 것
- AbortController를 사용한 fetch 타임아웃 패턴 — signal 옵션으로 넘기고 setTimeout으로 .abort() 호출하면 Promise가 reject됨
- nodemailer에 connectionTimeout, greetingTimeout, socketTimeout 옵션이 있어서 SMTP 서버 무응답을 방지할 수 있음
- git remote prune origin으로 삭제된 원격 브랜치의 로컬 추적 ref를 정리할 수 있음 — 이름에 공백이 포함된 깨진 ref도 이걸로 해결됨
- Vite 환경변수는 import.meta.env.VITE_ 접두사가 붙어야 클라이언트에서 접근 가능
