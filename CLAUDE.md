# CLAUDE.md

이 파일은 AI(Claude 등)가 이 저장소에서 작업할 때 지켜야 할 맥락과 규칙을 정리한 문서다.

## 프로젝트

일일 감정 체크아웃 툴. 정리되지 않은 감정을 날것 그대로 입력하면 AI가 감정·원인·다음 행동으로
구조화해주는 대학생용 도구. 상세 기획은 [docs/plan.md](docs/plan.md) 참고.

## 스택

- **Client**: React (Vite) — `client/`
- **Server**: Express — `server/`
- **DB**: Supabase `checkins` 테이블. React는 DB에 직접 접근하지 않고 Express를 거친다.

## 디자인 기준

- 현재 화면을 기준으로 삼고 스타일 원본은 `client/src/App.css`, 공통 스타일은 `client/src/index.css`에서 관리한다.
- 화면 구조와 데이터 흐름은 [docs/screen-flow.md](docs/screen-flow.md), 현재 화면 예시는 `docs/app-preview.png`를 참고한다.
- 새 화면을 만들 때 기존 CSS 변수·간격·색상·컴포넌트 패턴을 우선 재사용한다.

## 개발 실행

```
npm run install:all   # client, server 의존성 설치
npm run dev            # client(5173) + server(3001) 동시 실행 (concurrently)
npm test --prefix client
npm test --prefix server
npm run build
```

## 테스트 컨벤션

- 서버 로직(`server/services/*.js`)은 Node 내장 `node:test` + `assert`로 `server/tests/`에 작성한다.
- 클라이언트 순수 함수와 화면 로직은 Vitest로 검증한다.
- 자동 테스트 뒤에 API·브라우저 스모크 테스트를 수행하되, 실행하지 않은 항목을 통과로 표시하지 않는다.

## 에러 처리 컨벤션

- 모든 API 에러 응답은 `{ error: { message } }` 형식으로 통일한다.
- 비동기 라우터 예외는 `asyncHandler`로 `next(err)`에 넘기고, `server/index.js`의 중앙 에러 처리 미들웨어에서 상태코드와 응답을 결정한다.
- 서비스 계층 오류에는 필요한 경우 `status`를 붙이고, 라우터에서 같은 오류를 다시 포장하지 않는다.

## AI 연동

- Vertex AI(Gemini) 사용 확정. 직접 GCP SDK를 쓰지 않고, 로컬 LiteLLM 게이트웨이(OpenAI 호환 API)를 거쳐 호출한다.
- 서버는 `openai` npm 패키지(or 단순 fetch)로 `AI_BASE_URL`(기본 `http://127.0.0.1:4000/v1`)에 chat completions 요청을 보낸다. 모델명은 `AI_MODEL`(`vertex-gemini-flash`).
- 이 게이트웨이는 로컬(Hermes)에서 떠 있어야 동작 — 각자 로컬에 게이트웨이가 없으면 실제 배포용 엔드포인트로 교체 필요(추후 결정).
- 키는 `.env`에서만 읽고 커밋 안 함(`.gitignore` 반영됨).

## 커밋 규칙

- 접두사: `feat` / `fix` / `docs` / `chore`
- 한 줄 요약으로 간결하게 작성 (`feat: 체크인 저장 API 추가`)
- 작은 단위로 자주 커밋 (기능 하나, 파일 몇 개 단위로 쪼개서)

## AI 역할 제한 원칙 (핵심 설계 원칙)

이 서비스에서 AI가 감정 입력을 처리할 때는 아래 원칙을 반드시 지킨다 (plan.md 참고):

- **조언·진단·위로 금지** — 사용자에게 동조(sycophancy)하거나 상담하려 들지 않는다. 정리만 한다.
- **고정 출력 포맷** — 항상 "오늘의 감정 / 원인 / 내일의 작은 행동" 3개 카드 구조로만 응답한다.
  자유 서술형 응답으로 새지 않도록 한다.

이 원칙은 프로덕트 기능(감정 정리 API)뿐 아니라, AI(Claude)가 이 코드베이스에 기능을 구현할 때도
같은 톤을 유지하도록 참고한다 — 예: 사용자에게 심리적 조언을 하는 문구나 UI 카피를 임의로 추가하지 않는다.

## 디렉토리 컨벤션

- `client/src/components` — 재사용 가능한 UI 컴포넌트
- `client/src/pages` — 화면 단위 컴포넌트 (라우팅 대상)
- `server/routes` — Express 라우터 (엔드포인트 정의)
- `server/services` — 비즈니스 로직 / Supabase 데이터 접근
