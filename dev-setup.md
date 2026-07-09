## 1. 목적

Decision Log의 개발을 시작하기 전에 기본 개발 환경, 디렉토리 구조, 라이브러리, 실행 방식, 컨벤션을 정리한다.

이번 프로젝트는 4주 MVP를 목표로 하므로, 처음부터 복잡한 구조를 만들지 않는다.  
먼저 mock data로 핵심 사용자 흐름을 완성하고, 이후 실제 AI API 연결을 붙인다.

---

## 2. 개발 전략

### 1) 핵심 원칙

- React와 Express를 기본 개발 환경으로 사용한다.
- 처음에는 실제 AI API를 연결하지 않고 mock data로 화면과 흐름을 만든다.
- DB는 MVP 초기에는 사용하지 않는다.
- 상태 저장은 우선 React state 또는 localStorage로 처리한다.
- 기능을 넓히기보다 핵심 흐름을 먼저 완성한다.
- 개발 Agent는 이 문서의 기술 스택과 디렉토리 구조를 임의로 바꾸지 않는다.

### 2) MVP 핵심 흐름

```text
질문 입력
→ 여러 AI 답변 표시
→ Manager AI 비교 카드 표시
→ 카드 상태 선택
→ Decision Log 저장
→ MD Export
→ Zip 다운로드
```

---

## 3. 기술 스택

| 영역 | 선택 |
|---|---|
| Frontend | React |
| Build Tool | Vite |
| Backend | Express |
| Language | JavaScript |
| Styling | 일반 CSS |
| 임시 저장 | React state, localStorage |
| Export | JSZip, file-saver |
| 개발 실행 | concurrently |
| 환경변수 관리 | dotenv |

---

## 4. 기술 선택 이유

### React

질문 입력, AI 답변 카드, Manager AI 카드, Decision Log 패널을 컴포넌트 단위로 나누기 쉽다.

### Vite

React 프로젝트를 빠르게 시작하고 개발 서버를 쉽게 실행할 수 있다.

### Express

AI 요청을 처리하는 간단한 API 서버를 만들 수 있다.  
API Key를 프론트엔드에 직접 노출하지 않고 서버에서 관리할 수 있다.

### JavaScript

이번 프로젝트는 4주 MVP가 목표이므로 TypeScript보다 JavaScript로 빠르게 구현한다.  
타입 안정성보다 기능 흐름 완성을 우선한다.

### 일반 CSS

Tailwind, styled-components 등 추가 스타일 도구는 사용하지 않는다.  
디자인 시스템에 정의한 색상, 간격, 카드 규칙을 일반 CSS로 구현한다.

### JSZip / file-saver

Decision Log를 여러 개의 Markdown 파일로 만든 뒤, Zip 파일로 묶어 다운로드하기 위해 사용한다.

---

## 5. 디렉토리 구조

```text
decision-log/
├─ client/
│  ├─ src/
│  │  ├─ components/
│  │  │  ├─ ProjectContext.jsx
│  │  │  ├─ QuestionPanel.jsx
│  │  │  ├─ ModelSelector.jsx
│  │  │  ├─ ModelAnswerCard.jsx
│  │  │  ├─ ManagerCard.jsx
│  │  │  └─ DecisionLogPanel.jsx
│  │  │
│  │  ├─ data/
│  │  │  └─ mockData.js
│  │  │
│  │  ├─ utils/
│  │  │  ├─ parseAnswer.js
│  │  │  ├─ exportMarkdown.js
│  │  │  └─ zipDownload.js
│  │  │
│  │  ├─ App.jsx
│  │  ├─ main.jsx
│  │  └─ App.css
│  │
│  ├─ index.html
│  └─ package.json
│
├─ server/
│  ├─ src/
│  │  ├─ routes/
│  │  │  ├─ ai.routes.js
│  │  │  └─ export.routes.js
│  │  │
│  │  ├─ services/
│  │  │  ├─ modelClient.js
│  │  │  └─ managerAI.js
│  │  │
│  │  ├─ prompts/
│  │  │  ├─ answerFormatPrompt.js
│  │  │  └─ managerPrompt.js
│  │  │
│  │  └─ index.js
│  │
│  ├─ .env.example
│  └─ package.json
│
├─ docs/
│  ├─ plan.md
│  ├─ value-structure.md
│  ├─ task-list.md
│  ├─ design-system.md
│  ├─ design-skill.md
│  └─ dev-setup.md
│
├─ prototype/
│  └─ index.html
│
├─ CLAUDE.md
├─ README.md
└─ package.json
```

---

## 6. 설치 명령어

### 1) 루트 프로젝트 생성

```bash
mkdir decision-log
cd decision-log
npm init -y
```

### 2) 프론트엔드 생성

```bash
npm create vite@latest client -- --template react
cd client
npm install
npm install jszip file-saver
cd ..
```

### 3) 백엔드 생성

```bash
mkdir server
cd server
npm init -y
npm install express cors dotenv
npm install -D nodemon
mkdir -p src/routes src/services src/prompts
touch src/index.js
touch .env.example
cd ..
```

### 4) 루트 개발 실행 도구 설치

```bash
npm install -D concurrently
```

---

## 7. 실행 스크립트

### 1) 루트 `package.json`

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:client\" \"npm run dev:server\"",
    "dev:client": "cd client && npm run dev",
    "dev:server": "cd server && npm run dev"
  }
}
```

### 2) 서버 `server/package.json`

```json
{
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js"
  }
}
```

### 3) 클라이언트 `client/package.json`

Vite 기본값을 그대로 사용한다.

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

---

## 8. 서버 기본 코드 초안

### `server/src/index.js`

```js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Decision Log server is running" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

---

## 9. 환경변수

### `server/.env.example`

```env
PORT=4000

OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
```

### 규칙

- 실제 API Key는 `.env` 파일에만 작성한다.
- `.env` 파일은 Git에 올리지 않는다.
- 프론트엔드 코드에 API Key를 직접 작성하지 않는다.
- MVP 초기에는 API Key 없이 mock data로 먼저 개발한다.

---

## 10. API 구조 초안

| Method | Path | 목적 | MVP 초기 구현 |
|---|---|---|---|
| GET | `/api/health` | 서버 상태 확인 | 실제 구현 |
| POST | `/api/ask` | 여러 AI에게 질문 실행 | 처음에는 mock 응답 |
| POST | `/api/manager/compare` | AI 답변 비교 카드 생성 | 처음에는 mock 응답 |
| POST | `/api/export/markdown` | Decision Log를 MD로 변환 | 프론트 유틸 우선 구현 |

---

## 11. 데이터 구조 초안

### 1) Model Answer

```js
const modelAnswer = {
  id: "answer_001",
  model: "chatgpt",
  answerText: "AI 원문 답변",
  paragraphs: []
};
```

### 2) Paragraph

```js
const paragraph = {
  id: "paragraph_001",
  model: "chatgpt",
  section: "recommendation",
  text: "문단 내용"
};
```

### 3) Manager Card

```js
const managerCard = {
  id: "card_001",
  type: "common",
  title: "RLS는 기본 ON으로 둔다",
  summary: "여러 AI가 공통으로 RLS 활성화를 권장했다.",
  sourceModels: ["chatgpt", "claude", "gemini"],
  sourceParagraphs: [],
  status: "none"
};
```

### 4) Decision Log

```js
const decisionLog = {
  accepted: [],
  verify: [],
  rejected: []
};
```

---

## 12. 프론트엔드 컴포넌트 역할

| 컴포넌트 | 역할 |
|---|---|
| `ProjectContext.jsx` | 프로젝트 목표, 기술 스택, 제약조건 표시 |
| `QuestionPanel.jsx` | 질문 입력, 실행 버튼 관리 |
| `ModelSelector.jsx` | Claude, ChatGPT, Gemini 선택 UI |
| `ModelAnswerCard.jsx` | AI별 답변 표시 |
| `ManagerCard.jsx` | Manager AI 비교 카드 표시 |
| `DecisionLogPanel.jsx` | Accepted, Verify, Rejected 리스트 표시 |

---

## 13. 개발 순서

1. `prototype/index.html`로 화면 구조를 먼저 확인한다.
2. React 프로젝트를 생성한다.
3. 3단 레이아웃을 정적 UI로 구현한다.
4. mock data로 AI 답변 카드를 표시한다.
5. mock data로 Manager AI 카드를 표시한다.
6. 카드 상태 변경 기능을 만든다.
7. Decision Log 패널에 상태별로 카드가 쌓이게 만든다.
8. localStorage에 Decision Log를 저장한다.
9. Decision Log를 Markdown 문자열로 변환한다.
10. JSZip으로 여러 MD 파일을 Zip으로 묶는다.
11. file-saver로 다운로드한다.
12. mock 흐름이 완성된 뒤 실제 AI API 연결을 검토한다.

---

## 14. 커밋 로그 규칙

| 타입 | 의미 | 예시 |
|---|---|---|
| `feat` | 기능 추가 | `feat: 질문 입력 UI 추가` |
| `fix` | 버그 수정 | `fix: 카드 상태 변경 오류 수정` |
| `docs` | 문서 수정 | `docs: 개발 환경 문서 추가` |
| `style` | CSS 또는 UI 수정 | `style: Manager 카드 여백 조정` |
| `refactor` | 구조 개선 | `refactor: DecisionLogPanel 분리` |
| `chore` | 설정 작업 | `chore: Vite 프로젝트 초기 설정` |

---

## 15. 개발 컨벤션

- 컴포넌트 이름은 PascalCase를 사용한다.
- 함수 이름은 camelCase를 사용한다.
- 파일 하나는 하나의 주요 역할만 갖는다.
- 컴포넌트가 너무 커지면 분리한다.
- UI와 데이터 변환 로직을 가능하면 분리한다.
- 새로운 라이브러리는 꼭 필요한 경우에만 추가한다.
- Tailwind, styled-components, Redux, Zustand 등은 MVP 초기에는 사용하지 않는다.
- 서버 API 연결 전에는 mock data를 우선 사용한다.
- API Key는 서버 환경변수로만 관리한다.

---

## 16. MVP 제외 결정

이번 MVP에서는 아래 기능을 구현하지 않는다.

- 로그인
- 결제
- 팀 협업
- DB 저장
- 사용자 계정
- GitHub 연동
- Notion 연동
- 공식 문서 자동 검증
- 웹 검색 기반 검증
- 코드 실행 검증
- 여러 AI 간 토론 기능
- 관리자 페이지
- 복잡한 설정 화면

---

## 17. 개발 전 추가 결정 사항

| 항목 | 결정 |
|---|---|
| TypeScript 사용 여부 | 사용하지 않음 |
| CSS 도구 | 일반 CSS |
| DB | MVP 초기 제외 |
| 저장 방식 | localStorage 우선 |
| AI API | mock data 이후 연결 |
| 인증 | MVP 제외 |
| Export | MD + Zip |
| 배포 | 시간이 남으면 진행 |

---

## 18. 완료 기준

개발 환경 구성은 아래 조건을 만족하면 완료로 본다.

- `client` React 앱이 실행된다.
- `server` Express 서버가 실행된다.
- 루트에서 `npm run dev`로 client와 server를 함께 실행할 수 있다.
- `docs/dev-setup.md` 기준의 디렉토리 구조가 준비된다.
- `CLAUDE.md`가 Agent 작업 기준으로 작성되어 있다.
