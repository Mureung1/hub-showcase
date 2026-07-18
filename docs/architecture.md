# ICU Architecture Guide

## 결론

ICU는 다음 조합으로 설계합니다.

- Modular Monolith: 기능별 모듈을 한 저장소와 한 제품 서버 안에서 관리합니다.
- Vertical Slice: 화면과 기능 흐름 기준으로 코드를 묶습니다.
- Lightweight Hexagonal Architecture: LLM, DB, 파일, 외부 연동은 adapter로 분리합니다.
- REST API: React와 Node backend 사이의 통신 contract를 명확히 합니다.
- 가벼운 DDD: `curriculum`, `mistake-notes`, `learning-progress`, `git-lab`, `profile`, `agent` 같은 도메인 경계를 이름과 폴더 구조에 반영합니다.

Clean Architecture, REST API, DDD를 모두 풀스펙으로 적용하지 않습니다. 지금 단계에서는 의존성 방향과 모듈 경계를 지키는 정도로 시작하고, DB, 인증, queue, RAG가 붙을 때 필요한 만큼 강화합니다.

## 전체 레이어

```txt
User
  -> React Screen
  -> Feature Hook / Store / Client Adapter
  -> REST API
  -> Node Backend Route
  -> Application Use Case
  -> Domain Rule
  -> Port
  -> Adapter
  -> LLM / JSON Data / DB / External API
```

의존성 방향은 바깥에서 안쪽으로 흐릅니다. 화면과 route는 얇게 유지하고, 실제 판단과 변환은 use case와 domain에 둡니다. Gemini, Vertex AI, Notion, DB, 파일 접근은 adapter에 둡니다.

## 추천 폴더 구조

```txt
src/
  app/
    App.tsx
    AppShell.tsx
  pages/
  features/
    today-learning/
    learning-workspace/
    mistake-notes/
    git-lab/
    profile/
  components/
  data/
  stores/
  styles/
  types/

backend/
  http/
    server.mjs
    routes/
  modules/
    curriculum/
      application/
      domain/
      ports/
      adapters/
    mistake-notes/
      application/
      domain/
      ports/
      adapters/
    learning-progress/
      application/
      domain/
      ports/
      adapters/
    agent/
      application/
      ports/
      adapters/
  agents/
    curriculum-planner-agent-core.mjs
  shared/
    env.mjs
    http.mjs
    errors.mjs
    validation.mjs
```

현재는 `backend/agents/curriculum-planner-agent-core.mjs`와 `backend/curriculum-agent-server.mjs`로 시작했습니다. 이후 API가 2개 이상으로 늘어나면 `backend/http`와 `backend/modules` 구조로 확장합니다.

## 화면 아키텍처

### 1. Onboarding / Profile Setup

역할:

- 학습 목표, 관심 트랙, 하루 학습 시간, 수준을 입력합니다.
- 첫 커리큘럼 생성의 기본 goal과 preference를 만듭니다.

현재 위치:

- 화면: `src/features/profile/ProfileSetup.tsx`
- 상태: `src/stores/useLearningProfileStore.ts`
- 타입: `src/types/profile.ts`

향후 연결:

```txt
ProfileSetup
  -> profile store
  -> POST /api/profile
  -> backend/modules/profile/application/saveProfile
```

### 2. Today Learning Hub

역할:

- 앱의 첫 학습 화면입니다.
- 오늘 할 일, 현재 미션, 커리큘럼 생성, 복습/오답 요약을 보여줍니다.
- 사용자가 학습을 시작할지, 커리큘럼을 다시 만들지, 오답을 복습할지 결정합니다.

현재 위치:

- 화면: `src/features/today-learning/TodayLearningHub.tsx`
- mock data: `src/data/todayLearning.ts`
- 커리큘럼 client: `src/data/curriculumClient.ts`
- 생성 커리큘럼 snapshot: `src/stores/useGeneratedCurriculumStore.ts`
- 진행 상태: `src/stores/useLearningProgressStore.ts`
- 오답 상태: `src/stores/useMistakeNoteStore.ts`

API 연결:

```txt
TodayLearningHub
  -> recommendCurriculum({ goal })
  -> POST /api/curriculum/recommend
  -> backend curriculum use case
  -> Gemini provider + curriculum JSON catalog
  -> GeneratedCurriculumPlan
  -> icu.generatedCurriculum store
```

UI 원칙:

- 사용자가 다음에 누를 행동이 명확해야 합니다.
- 긴 설명보다 현재 목표, 오늘 미션, 이어 학습하기, 전체보기 같은 구체적 액션을 우선합니다.
- 커리큘럼 생성 실패 시 초보자가 이해할 수 있는 짧은 한국어 오류를 보여줍니다.

### 3. Learning Workspace IDE

역할:

- 실제 학습이 진행되는 IDE형 화면입니다.
- 커리큘럼 단계, AI 튜터 설명, 코드 작성, 실행 결과, 다음 단계 이동을 한 흐름으로 묶습니다.

현재 위치:

- 화면: `src/features/learning-workspace/LearningWorkspace.tsx`
- 상호작용 로직: `src/features/learning-workspace/workspaceInteraction.ts`
- 진행 상태: `src/stores/useLearningProgressStore.ts`
- 생성 커리큘럼 참조: `src/stores/useGeneratedCurriculumStore.ts`

향후 API 연결:

```txt
LearningWorkspace
  -> POST /api/code/run
  -> backend/modules/code-runner/application/runCode

LearningWorkspace
  -> POST /api/code/review
  -> backend/modules/agent/application/requestCodeFeedback

LearningWorkspace
  -> POST /api/progress/missions/:missionId
  -> backend/modules/learning-progress/application/saveMissionProgress
```

UI 원칙:

- 편집기는 학습 세션 안에서만 중심이 됩니다.
- 실패 상태는 테스트 실패, 이유, 힌트, 다시 실행을 같이 보여줍니다.
- 성공 상태는 다음 단계와 코드 리뷰 요청을 명확히 보여줍니다.

### 4. Mistake Notes

역할:

- 실패한 명령, 테스트, 개념을 모아 다시 풀 수 있게 합니다.
- Today Hub의 요약형 카드에서 전체 리스트형 화면으로 진입합니다.

현재 위치:

- 화면: `src/features/mistake-notes/MistakeNotesPage.tsx`
- route helper: `src/features/mistake-notes/mistakeNoteRoutes.ts`
- 상태: `src/stores/useMistakeNoteStore.ts`

향후 API 연결:

```txt
MistakeNotesPage
  -> GET /api/mistake-notes
  -> POST /api/mistake-notes
  -> PATCH /api/mistake-notes/:noteId
  -> backend/modules/mistake-notes/application/*
```

UI 원칙:

- 대시보드형은 Today Hub에서 최근/중요 항목만 보여줍니다.
- 리스트형은 검색, 필터, 상태 변경, 다시 풀기 진입에 집중합니다.
- 긴 오답 내용은 리스트 행 전체를 키우기보다 상세 영역 또는 내부 스크롤로 처리합니다.

### 5. Git Branching Lab

역할:

- Pro Git 기반 Git 명령 학습을 시각적 commit graph와 터미널로 제공합니다.
- 실패한 명령은 오답노트로 연결됩니다.

현재 위치:

- 화면/컴포넌트: `src/features/git-lab/`
- 레벨 데이터: `src/features/git-lab/levels/`
- layout 계산: `src/features/git-lab/layout/`
- 오답 저장: `src/stores/useMistakeNoteStore.ts`

향후 API 연결:

```txt
GitLab
  -> POST /api/git-lab/attempts
  -> backend/modules/git-lab/application/recordAttempt

GitLab failure
  -> POST /api/mistake-notes
  -> backend/modules/mistake-notes/application/createMistakeNote
```

UI 원칙:

- 터미널은 어둡게, 그래프와 목표 패널은 읽기 쉽게 유지합니다.
- goal/current graph 차이를 색만으로 설명하지 않고 텍스트 피드백도 같이 제공합니다.
- 학습자가 현재 명령, 결과, 다음 시도를 놓치지 않게 합니다.

## 백엔드 모듈 경계

### curriculum

책임:

- 사용자 목표를 커리큘럼 catalog와 매칭합니다.
- LLM 추천 결과를 검증합니다.
- React 화면 contract인 `GeneratedCurriculumPlan`으로 변환합니다.

현재 구현:

- `backend/agents/curriculum-planner-agent-core.mjs`
- `backend/curriculum-agent-server.mjs`

다음 목표 구조:

```txt
backend/modules/curriculum/
  application/recommendCurriculum.mjs
  domain/generatedCurriculumPlan.mjs
  ports/curriculumCatalogRepository.mjs
  ports/curriculumRecommendationProvider.mjs
  adapters/jsonCurriculumCatalogRepository.mjs
  adapters/geminiCurriculumRecommendationProvider.mjs
```

### mistake-notes

책임:

- 실패 항목 생성, 상태 변경, 다시 풀기 진입 정보를 관리합니다.
- Git Lab, Workspace, Quiz 실패를 공통 오답 모델로 모읍니다.

### learning-progress

책임:

- mission별 실행 결과, 완료 상태, 최근 활동, mastery score를 관리합니다.
- Today Hub와 Workspace가 같은 진행 상태를 보게 합니다.

### agent

책임:

- Gemini, Vertex AI, OpenAI 같은 provider 차이를 숨깁니다.
- prompt version, response schema, retry, 비용 로그, 응답 검증을 관리합니다.

초기에는 curriculum agent 하나로 시작하고, 이후 Review Agent, Code Feedback Agent, RAG Answer Agent로 확장합니다.

## REST API 초안

```txt
POST /api/curriculum/recommend
GET  /api/progress/today
POST /api/progress/missions/:missionId
GET  /api/mistake-notes
POST /api/mistake-notes
PATCH /api/mistake-notes/:noteId
POST /api/code/run
POST /api/code/review
GET  /api/git-lab/levels
POST /api/git-lab/attempts
```

API route는 HTTP status, request parsing, response mapping만 담당합니다. 비즈니스 판단은 application use case로 넘깁니다.

## 상태 관리 기준

현재 React mock 단계:

- `localStorage + Zustand`가 임시 persistence입니다.
- `icu.generatedCurriculum`, `icu.learningProgress`, `icu.mistakeNotes` snapshot을 사용합니다.
- 화면 검증과 UX 흐름 안정화가 목적입니다.

Node backend 단계:

- Zustand는 화면 상태와 optimistic UI에 집중합니다.
- 서버가 사용자별 profile, progress, mistake notes, generated curriculum을 저장합니다.
- React client adapter는 mock/server mode를 유지해 개발 중 fallback이 가능하게 합니다.

Electron 단계:

- Renderer는 화면만 담당합니다.
- Main Process 또는 Node backend가 LLM 호출, 로컬 DB, 코드 실행, 파일 접근을 담당합니다.
- 같은 use case와 agent core를 재사용합니다.

## 적용 순서

1. 현재 `backend/curriculum-agent-server.mjs`를 유지하며 `/api/curriculum/recommend`를 안정화합니다.
2. API가 2개 이상으로 늘어날 때 `backend/http`와 `backend/modules/curriculum`으로 한 번 더 분리합니다.
3. 오답노트와 학습 진행을 backend module로 옮깁니다.
4. 코드 실행 API가 필요해지는 시점에 backend shared error/validation/http helper를 만듭니다.
5. RAG, embedding, 문서 chunking이 커질 때 Python worker 또는 별도 Agent Service를 검토합니다.

## 선택하지 않는 것

- 지금 당장 Microservices로 쪼개지 않습니다.
- DDD entity, aggregate, repository interface를 모든 파일에 강제로 만들지 않습니다.
- Express, Electron, Monaco, RAG, Notion API는 필요한 기능 단계가 오기 전까지 추가하지 않습니다.
- React 화면에서 provider API key를 읽지 않습니다.
