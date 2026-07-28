# ICU

DevChat은 새로운 기술을 배워야 하지만 무엇부터 공부해야 할지 막막한 사용자를 위한 AI 코딩 튜터 프로젝트입니다. 사용자가 목표와 현재 수준을 말하면 AI 튜터가 학습 순서, 필요한 개념, 실습 과제를 제안하고 코드 실행과 피드백까지 한 화면에서 이어갈 수 있도록 돕는 것을 목표로 합니다.

## 문서 목록

- [MVP 개발 계획](./MVP-Plan)
- [사용자 흐름](./User-Flow)

## 만들게 된 계기

개발 공부를 시작하거나 새로운 기술을 익힐 때 가장 어려운 점은 자료가 부족한 것이 아니라, 너무 많다는 점입니다. 공식 문서, 강의, 블로그, 에디터를 오가다 보면 어디서부터 시작해야 하는지 판단하기 어렵고 학습 흐름도 쉽게 끊깁니다.

저도 새로운 기술 스택을 처음 접할 때 다음과 같은 고민을 자주 겪었습니다.

- 공식 문서를 열었지만 어떤 순서로 읽어야 할지 모름
- 개념을 이해해도 바로 코드로 실습하기까지 과정이 번거로움
- ChatGPT에 질문할 수는 있지만 내 진도와 수준에 맞춘 커리큘럼은 부족함
- 코딩 준비, 개념 학습, 오답 정리가 서로 분리되어 있음
- 오늘 무엇을 배웠고 다음에 무엇을 복습해야 하는지 기록이 남지 않음

DevChat은 이 문제를 해결하기 위해, 대화형 AI 튜터가 학습 흐름을 잡아주고 사용자는 바로 옆의 코드 에디터에서 실습하며 실행 결과와 피드백을 받는 경험을 제공합니다.

## 프로젝트 내용

현재 이 저장소는 DevChat 프로젝트를 소개하는 React 화면을 구현한 프론트엔드입니다. Vite 기반 React 앱으로 구성되어 있으며, 메인 화면에서 프로젝트의 핵심 가치와 사용 흐름을 보여줍니다.

DevChat이 목표로 하는 핵심 경험은 다음과 같습니다.

- AI 튜터가 사용자의 목표와 수준에 맞춰 커리큘럼을 제안
- ChatGPT처럼 자연스럽게 질문하고 답변을 받는 채팅 기반 학습
- 공식 문서 기반으로 신뢰도 높은 개념 설명 제공
- 코드 에디터에서 바로 실습하고 실행 결과 확인
- 퀴즈, 실습, 오답노트, 복습 스케줄을 통해 학습 흐름 유지
- Notion 연동을 통해 오늘 학습 내용을 자동 정리

## 주요 기능 구상

- 맞춤 커리큘럼 제안: 새 기술을 배울 때 필요한 개념을 순서대로 정리
- AI 튜터 채팅: 자유 질문과 커리큘럼 학습을 동시에 지원
- 코드 에디터: 설명을 듣고 바로 코드를 작성할 수 있는 실습 공간
- 실행 결과 검증: 작성한 코드를 실행하고 테스트 결과를 확인
- AI 피드백: 실패 원인, 힌트, 코드 리뷰를 채팅으로 제공
- 학습 진도 관리: 퀴즈 정답률, 실습 통과율, 오답 이력을 기반으로 상태 관리
- 복습 및 기록: 오답노트와 Notion 학습 요약으로 복습 흐름 유지

## 기술 스택

- React
- Vite
- TypeScript
- CSS
- Electron

향후 전체 앱으로 확장할 경우 Electron, Monaco Editor, SQLite, ChromaDB, OpenAI API, Notion API 등을 활용하는 구조를 목표로 합니다.

## 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 `.env`로 복사합니다. 프론트엔드는 기본적으로 Express API를 사용하며, 로컬 Vite proxy를 사용할 때 `VITE_API_BASE_URL`은 비워 둡니다.

Supabase를 실제 저장소로 사용할 때는 다음 서버 전용 값을 설정합니다. secret key를 `VITE_*` 변수에 넣지 않습니다.

```env
VITE_ICU_API_MODE=server
VITE_API_BASE_URL=
ICU_REPOSITORY_MODE=supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

### 3. 개발 서버 실행

```bash
npm run dev:server
```

이 명령은 Express API, Vite 앱, React Preview 서버를 함께 실행합니다. 앱 기본 주소는 다음과 같습니다.

```text
http://localhost:5173/
```

### 4. 타입 검사

```bash
npm run typecheck
```

### 5. 린트

```bash
npm run lint
```

### 6. 포맷 확인

```bash
npm run format:check
```

### 7. 테스트

```bash
npm run test
```

### 8. 프로덕션 빌드

```bash
npm run build
```

### 9. 빌드 결과 미리보기

```bash
npm run preview
```

## 프로젝트 구조

```text
hub/
├─ src/
│  ├─ app/
│  │  ├─ model/
│  │  ├─ App.tsx
│  │  ├─ AppShell.tsx
│  │  └─ router.tsx
│  ├─ components/
│  ├─ features/
│  │  ├─ curriculum/
│  │  │  ├─ api/
│  │  │  └─ model/
│  │  ├─ today-learning/
│  │  │  └─ data/
│  │  ├─ learning-workspace/
│  │  ├─ learning-progress/
│  │  │  └─ model/
│  │  ├─ mistake-notes/
│  │  │  └─ model/
│  │  ├─ profile/
│  │  │  └─ model/
│  │  ├─ onboarding/
│  │  │  ├─ data/
│  │  │  └─ model/
│  │  └─ git-lab/
│  ├─ pages/
│  ├─ styles/
│  └─ main.tsx
├─ backend/
│  ├─ http/
│  ├─ modules/
│  └─ shared/
├─ shared/
│  └─ curriculum/
├─ docs/
├─ scripts/
├─ prototype.html
├─ prototype.css
├─ AGENTS.md
├─ package.json
└─ README.md
```

## 현재 구현된 화면

현재 화면은 DevChat의 프로젝트 주제를 소개합니다. 사용자가 새로운 기술을 배워야 할 때 커리큘럼을 어떻게 짜야 할지 막막한 상황을 시작점으로 삼고, AI 튜터가 학습 순서와 실습 방향을 제안하는 모습을 보여줍니다.
