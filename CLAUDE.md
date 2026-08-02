# 시험 우선순위 계산기 — 저장소 규칙

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [디렉토리 구조](#3-디렉토리-구조)
4. [실행 · 테스트 명령](#4-실행--테스트-명령)
5. [코드 컨벤션](#5-코드-컨벤션)
6. [커밋 규칙](#6-커밋-규칙)
7. [아키텍처 결정](#7-아키텍처-결정)
8. [Agent 작업 지침](#8-agent-작업-지침)
9. [관련 문서](#9-관련-문서)

---

## 1. 프로젝트 개요

여러 과목을 동시에 준비하는 대학생이 **오늘 어떤 과목부터 공부할지** 정하도록 돕는 웹 서비스다.

과목명, 시험 날짜, 이해도, 난이도, 성적 반영 비율 등을 입력하면 우선순위 점수를 계산해 정렬된 결과와 추천 과목을 보여준다. 사용자는 우선순위 성향(균형 · 난이도 중시 · 임박도 중시 · 학점 전략)을 골라 계산 기준을 바꿀 수 있다.

---

## 2. 기술 스택

### Frontend
- React 19
- Vite 8
- JavaScript (ESM)
- 순수 CSS + CSS 변수 (CSS 프레임워크 없음)

### Backend
- Node.js 22 이상 (내장 `node:sqlite`, `node:test` 사용)
- Express 4
- cors, dotenv
- SQLite (`node:sqlite`)

### 개발 도구
- ESLint — `frontend`에만 설정돼 있다
- concurrently — 루트에서 서버와 클라이언트를 함께 띄운다
- `node --watch` — 서버 자동 재시작 (nodemon은 쓰지 않는다)
- `node:test` — 내장 테스트 러너 (별도 테스트 라이브러리 없음)

**포매터는 두지 않는다.** Prettier를 설치하거나 설정을 추가하지 않는다.

---

## 3. 디렉토리 구조

```text
hub/
├── frontend/                   # React + Vite 앱
│   ├── src/
│   │   ├── components/         # 화면 조각 (PascalCase.jsx)
│   │   ├── utils/              # 계산 · API · 포맷 로직, *.test.js 동거
│   │   ├── App.jsx             # 과목 · 성향 상태 관리
│   │   ├── index.css           # 디자인 토큰 (CSS 변수)
│   │   └── App.css
│   ├── eslint.config.js
│   └── vite.config.js          # /api → localhost:3001 프록시
├── server/                     # Express API 서버 (포트 3001)
│   └── src/
│       ├── routes/             # 경로 정의
│       ├── controllers/        # 요청 · 응답 처리
│       ├── services/           # 계산 · 업무 로직
│       ├── db/database.js      # SQLite 연결 (server/data/app.db)
│       └── index.js
├── docs/                       # 설계 문서
├── showcase/                   # 소개용 스크린샷 · 메타데이터
├── .claude/                    # 이 저장소 전용 Agent · Skill
├── index.html, style.css       # 초기 정적 프로토타입 (수정하지 않는다)
├── CLAUDE.md
├── design-skill.md
└── README.md
```

`pages/`, `styles/` 폴더는 없다. 화면은 `App.jsx`가 조립하고 조각은 전부 `components/`에 둔다.

---

## 4. 실행 · 테스트 명령

```bash
npm run dev                        # 서버 + 클라이언트 동시 실행 (루트)
npm run server                     # 서버만 (localhost:3001)
npm run client                     # 클라이언트만 (Vite dev)

npm --prefix frontend test         # 테스트 (node --test)
npm --prefix frontend run lint     # ESLint
npm --prefix frontend run build    # 프로덕션 빌드
```

의존성은 루트 · `frontend` · `server` 세 곳에 나뉘어 있다. 설치할 때 `npm --prefix <폴더> install`로 위치를 지정한다.

---

## 5. 코드 컨벤션

### 이름
- React 컴포넌트 파일명은 PascalCase로 쓴다. (`SubjectCard.jsx`, `PriorityBadge.jsx`)
- 그 밖의 모듈 파일명은 camelCase로 쓴다. (`priorityCalculator.js`, `daysUntil.js`)
- 함수명과 변수명은 camelCase로 쓴다. (`calculatePriorityScore`, `examDate`)

### 구조
- 하나의 컴포넌트는 하나의 역할만 맡는다.
- 계산 로직을 화면 컴포넌트 안에 직접 쓰지 않는다. 프론트는 `frontend/src/utils/`, 서버는 `server/src/services/`로 분리한다.
- 서버는 `routes → controllers → services` 한 방향으로 흐른다. 라우트가 DB를 직접 만지지 않는다.
- DB 접근은 `server/src/db/database.js`를 거친다.
- 모듈은 ESM(`import` / `export`)만 쓴다. 두 패키지 모두 `"type": "module"`이다.

### 스타일
- 색상 · 여백 · 폰트 크기 · 모서리는 `frontend/src/index.css`에 정의된 CSS 변수만 쓴다. 값을 직접 적지 않는다.
  - 색: `--color-primary`, `--color-surface`, `--color-text-secondary`, `--color-danger` …
  - 글자: `--font-title`, `--font-heading`, `--font-body`, `--font-caption` …
  - 여백: `--space-sm`, `--space-md`, `--space-card`, `--space-section`
  - 모서리: `--radius-input`, `--radius-button`, `--radius-card`
- 필요한 토큰이 없으면 값을 하드코딩하지 말고 `index.css`에 변수를 추가한다.

### 언어
- 주석, UI 문구, 커밋 메시지는 한국어로 쓴다.

---

## 6. 커밋 규칙

형식은 `type: 작업 내용`이다. 제목은 **무엇을 했는지 한국어 평서형 한 문장**으로 쓴다.

| type | 쓰임 |
|---|---|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서 작성 또는 수정 |
| `style` | 디자인 또는 코드 스타일 수정 |
| `refactor` | 코드 구조 개선 |
| `chore` | 환경 설정, 패키지 작업 |
| `test` | 테스트 코드 작성 |

예시:

```text
feat: 2단계에서도 과목별로 나머지 항목을 채울 수 있게 한다
fix: 나란히 놓인 버튼의 높이가 어긋나던 것을 고친다
style: 디자인 시스템 위반과 접근성 결함을 고친다
```

파일 이름이 아니라 **사용자에게 무엇이 달라졌는지**를 적는다.

---

## 7. 아키텍처 결정

지금 저장소의 실제 상태다. 결정이 바뀌면 코드와 함께 이 목록도 고친다.

1. 로그인과 회원가입은 만들지 않는다.
2. 과목 데이터는 **SQLite**(`server/data/app.db`)에 저장한다. `node:sqlite`를 쓰므로 추가 패키지가 없다.
3. 서버가 없으면 폴백으로 동작한다. 과목은 `localStorage`에, 점수 계산은 `frontend/src/utils/priorityCalculator.js`에 맡긴다. 서버 없는 정적 배포에서도 화면이 돌아가야 한다.
4. **우선순위 계산 규칙은 두 곳에 있다.** 기준은 서버의 `server/src/services/priorityService.js`이고, `frontend/src/utils/priorityCalculator.js`는 같은 규칙의 폴백 구현이다. 계산 규칙을 바꾸면 **반드시 두 파일을 함께** 고치고 양쪽 결과가 같은지 확인한다.
5. 프론트와 서버 통신은 `fetch`를 쓴다. Vite dev 서버가 `/api`를 `localhost:3001`로 프록시한다.
6. 디자인은 `design-skill.md`의 디자인 시스템을 기준으로 구현한다.
7. Desktop과 모바일을 모두 지원한다. 화면 폭 1024px 이상에서는 왼쪽 입력 · 오른쪽 순위판 2단으로 두고, 그 미만에서는 세로로 쌓아 단계 흐름만 남긴다. 순위판은 좁은 화면에서 감춘다(결과 화면에 같은 내용이 있고, 옆에 못 붙으면 존재 이유가 없다). 확인은 320 · 375 · 768 · 1024 · 1440px에서 한다.
8. `frontend`는 GitHub Pages(`https://<user>.github.io/hub/`)로 배포한다. 그래서 빌드할 때만 Vite `base`가 `/hub/`가 된다. 배포본에는 서버가 없으니 3번 폴백 경로로 돈다.

---

## 8. Agent 작업 지침

### 시작하기 전
- 문서와 코드가 어긋나면 **코드를 사실로 본다.** 그리고 이 파일을 고쳐 어긋남을 없앤다.
- 계산 · 판정 로직을 만들거나 고칠 때는 `.claude/skills/write-test`의 절차대로 순수 함수에 테스트를 먼저 붙인다.
- UI를 만들거나 고칠 때는 `design-skill.md`의 디자인 시스템과 검토 체크리스트를 따른다.

### 하지 않는 것
- 루트의 `index.html`, `style.css`는 React 이전의 프로토타입이다. 수정하지 않는다.
- 새 라이브러리를 임의로 추가하지 않는다. Node 내장 모듈(`node:test`, `node:sqlite`)을 먼저 찾고, 그래도 필요하면 **먼저 물어본다.**
- 요청받지 않은 리팩터링을 끼워 넣지 않는다.

### 끝내기 전
완료라고 말하기 전에 아래를 실제로 돌리고 결과를 확인한다.

```bash
npm --prefix frontend test
npm --prefix frontend run lint
```

기능이 요구사항대로 도는지 독립 검증이 필요하면 `.claude/agents/feature-verifier`를 쓴다.

---

## 9. 관련 문서

| 문서 | 내용 |
|---|---|
| `README.md` | 문제 정의, 사용자 흐름, 시스템 구조도, 데이터 흐름. 최상단에 배포·영상·소스·소개 자료 링크 |
| `showcase/README.md` | **프로젝트 소개 자료** — 문제, 화면, 핵심 기능, 기술 구조, AI 협업 방식 |
| `design-skill.md` | 디자인 원칙, 디자인 시스템 값, 컴포넌트 기준, 검토 체크리스트 |
| `docs/data-model.md` | `subjects` 테이블 구조, 점수 계산식, 저장 방식 |
| `docs/feature-completion-history.md` | 다음 기능(과목 완료 체크 · 히스토리) 설계 |
| `docs/my-workflow.md` | **최종 워크플로우** — 작업 순서, 확인 기준, 문제 시 되돌아갈 단계 |
| `docs/agent-collaboration.md` | 단계별 도구, 사람 결정과 AI 수행의 경계 |
| `docs/deployment.md` | Vercel·Render 배포 순서와 확인 방법 |
| `docs/my-ai-workflow.md` | 3주차 시점 기록 (최종본은 `my-workflow.md`) |
| `.claude/skills/write-test/SKILL.md` | 이 저장소의 테스트 작성 절차 |
| `.claude/agents/feature-verifier.md` | 기능 검증 Agent |
