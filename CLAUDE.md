# hub_ — 리뷰 매니저 AI

이 저장소는 "리뷰 매니저 AI"(구 "리뷰 답변 도우미") 프로젝트다. 소상공인이 손님 리뷰를 붙여넣으면 감정 분석·키워드 추출·반복 문제 감지·답변 초안 3종을 생성해주는 것을 넘어, 리뷰마다 AI 점수를 매기고 총 분석·월별 통계까지 제공하는 리뷰 관리 도구로 범위를 확장했다(2026-07-13 컨셉 확장). 2026-07-15에는 회원가입/로그인(토큰 기반 인증)도 추가했다. 기획 배경과 기능 스펙은 [`review-assistant-react/기획서.md`](review-assistant-react/기획서.md)를 따른다.

이 문서는 **개발 환경/컨벤션 관련 결정**을 정리한다(2주차 본격 개발 전 사전 세팅). 화면 전용 디자인 규칙은 [`review-assistant-react/CLAUDE.md`](review-assistant-react/CLAUDE.md)에 따로 있다.

## 디렉토리 구조

모노레포 툴(npm workspaces 등) 없이, **독립된 두 패키지를 형제 폴더**로 둔다. 이 프로젝트 규모(2주 단기 프로젝트, API 표면 2개)에서 워크스페이스 설정은 과한 복잡도라 판단했다.

```
hub_/
├── index.html                  # 초기 순수 HTML/CSS/JS 프로토타입 (기획서 1:1 대응 참고용, 더 이상 수정 안 함)
├── review-assistant-react/     # 프론트엔드 (Vite + React)
│   ├── design/                 # 디자인 핸드오프 원본 (design-build 스킬 참고)
│   ├── src/
│   └── CLAUDE.md                # 디자인 시스템 규칙
└── review-assistant-server/    # 백엔드 (Express) — 이번에 신규 추가
    ├── src/
    │   ├── routes/
    │   ├── controllers/
    │   ├── services/            # 향후 분석 엔진(규칙 기반 → Claude API 교체) 위치
    │   └── middleware/
    ├── .env.example
    └── package.json
```

새 API 엔드포인트가 늘어나면 `routes/*.route.js` + `controllers/*.controller.js` + 필요 시 `services/*.service.js` 패턴을 유지한다.

## 라이브러리

**프론트엔드** (`review-assistant-react`) — 기존 그대로 유지, 이번에 lint 도구만 추가:
- `react`, `react-dom`, `vite` (기존)
- 신규: `eslint` (flat config, `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`), `prettier`

**백엔드** (`review-assistant-server`) — 신규:
- `express` — API 서버
- `cors` — 프론트엔드 dev origin 허용
- `dotenv` — `.env` 로드
- `eslint` + `prettier` — 프론트엔드와 동일 스택
- 개발 서버 재시작: 별도 `nodemon` 의존성 대신 **Node 18+ 내장 `node --watch`** 사용 (`npm run dev`)
- **DB**: `node:sqlite` (Node 22+ 내장 모듈, 별도 패키지 설치·네이티브 빌드 불필요) 사용. `review-assistant-server/data/reviews.db` 파일에 세션별 분석 리뷰를 저장 — 반복 문제 감지, 총 분석 요약, 월별 통계의 공통 데이터 소스. DB 파일은 git에 커밋하지 않음(`.gitignore`).
  - (2026-07-13 결정 변경: 애초 "DB 없음, 인메모리"로 시작했으나 "리뷰 매니저 AI" 컨셉 확장으로 영속 저장이 필요해져 전환.)

## 컨벤션

### 커밋 메시지
`<type>: <한글 설명>` 형식을 새로 도입한다. `type`은 `feat` / `fix` / `docs` / `refactor` / `chore` / `style` / `test` 중 하나.
- 예: `feat: 리뷰 분석 API 검증 로직 추가`, `docs: 백엔드 환경설정 문서화`
- 기존 커밋 로그(타입 접두사 없는 한글 설명체)를 소급 변경하지는 않는다 — 이 시점부터 적용.

### 코드 스타일
- 세미콜론 없음(`semi: false`), 작은따옴표, 줄 길이 100자, trailing comma — 루트 [`.prettierrc.json`](.prettierrc.json)이 두 패키지에 공통 적용된다(prettier가 상위 디렉토리로 설정을 탐색하므로 각 패키지에 따로 만들 필요 없음).
- 프론트엔드: 함수형 컴포넌트 + hooks, 컴포넌트는 PascalCase 파일명(`App.jsx`), 나머지 유틸은 camelCase.
- 백엔드: 파일명은 kebab-case + 역할 접미사(`reviews.route.js`, `reviews.controller.js`) — Node 생태계 관례.
- 각 패키지에서 `npm run lint` / `npm run format`으로 검사·정리한다.

### 브랜치 / PR
이 저장소는 코호트 공유 리포([[project_connect-aiagentchallenge-hub|메모리 참고]])이며 학생별 고정 브랜치(`N112_엄기윤`)를 사용한다. 기능별로 서브 브랜치를 새로 파지 않고 해당 브랜치에서 작업 후 업스트림 동일 이름 브랜치로 PR을 연다.

## 그 외 결정 사항

- **패키지 매니저**: npm (두 패키지 모두 `package-lock.json` 사용).
- **Node 버전**: 18 이상 (`engines.node` 명시). 로컬 개발 환경은 Node 24.
- **포트**: 프론트엔드 5173(Vite 기본값), 백엔드 4000. `review-assistant-server/.env.example`에 `PORT=4000` 기본값 포함.
- **CORS**: 백엔드가 `CORS_ORIGIN` 환경변수(기본 `http://localhost:5173`)만 허용.
- **세션 ID**: 리뷰 분석·반복 문제 감지·통계는 여전히 로그인과 무관한 익명 세션 기준으로 동작한다. 백엔드 `sessionId` 미들웨어가 `X-Session-Id` 요청 헤더를 읽고, 없으면 `crypto.randomUUID()`로 생성해 응답 헤더로 그대로 돌려준다. 프론트엔드가 이 값을 `localStorage`에 저장해 재사용한다(구현 완료, 2주차).
- **회원 인증** (2026-07-15 결정 변경): 애초 "로그인 없는 익명 세션"만으로 가기로 했으나, 회원가입/로그인 화면 + 토큰 기반 인증을 실제로 구현하기로 컨셉을 확장했다. `users`/`auth_tokens` 테이블(SQLite) 추가, 비밀번호는 `node:crypto`의 `scrypt`로 해싱(별도 패키지 없음, bcrypt 미사용), 로그인 시 발급되는 토큰은 프론트가 `Authorization: Bearer <token>` 헤더로 매 요청에 실어 보낸다. **다만 리뷰 데이터 자체는 여전히 `X-Session-Id` 기준으로 저장되며, user 계정과 리뷰는 아직 연결되어 있지 않다** — 로그인은 신원 확인 기능만 제공하고, "내 리뷰 모아보기" 같은 계정 연동 기능은 미구현 상태.
- **에러 응답 형식**: `{ "error": { "code": "...", "message": "..." } }` — 기획서 5-4절과 동일. 코드: `EMPTY_INPUT` / `NO_VALID_REVIEW` / `TOO_MANY_REVIEWS` / `INVALID_JSON`(400), `ANALYSIS_FAILED` (500). `review-assistant-server/src/middleware/errorHandler.js`에서 일괄 처리.
- **환경변수**: `.env`는 git에 올리지 않고 `.env.example`만 커밋. 향후 Claude API 연동 시 `ANTHROPIC_API_KEY`는 **백엔드 전용** — 프론트엔드에 절대 노출하지 않는다.

## 향후 Claude API 연동 (2주차 이후, 지금은 미구현)

기획서 4번(향후 확장)에 명시된 대로, 현재 브라우저 내 규칙 기반 분석을 실제 Claude API 호출로 교체할 예정이다.
- 추천 모델: **`claude-haiku-4-5`** (입력 $1.00 / 출력 $5.00 per MTok) — 리뷰 감정 분류·키워드 추출·짧은 답변 초안 생성 정도의 경량 작업에 적합. 답변 품질을 더 높이고 싶으면 `claude-sonnet-5`(입력 $3.00 / 출력 $15.00, 2026-08-31까지 인트로가 $2.00/$10.00)로 상향 가능.
- 호출은 `review-assistant-server`에서만 수행 (API 키를 서버에만 보관). 현재 `src/services/`에 분석 엔진 자리를 비워뒀다.
- 정확한 모델 ID/가격은 시점에 따라 바뀔 수 있으므로, 실제 연동 시점에 다시 확인할 것 (모델 ID를 임의로 추측하지 말 것).
