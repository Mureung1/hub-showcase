# Curriculum Agent API

## 목적

데스크톱 앱 전환 전에도 실제 Curriculum Planner Agent를 검증할 수 있도록 React 화면과 LLM 호출 사이에 서버 API 경계를 둡니다. React는 API key, provider, model 설정을 직접 알지 않고 `POST /api/curriculum/recommend`만 호출합니다.

## v1 선택

v1 실제 호출 위치는 Node.js backend입니다.

- Node.js backend는 이후 인증, 학습 기록 DB, queue, worker, 코드 실행, RAG, Electron 연동을 같은 제품 서버 구조 안에서 관리하기에 적합합니다.
- Supabase Edge Function은 빠른 배포 대안으로만 남깁니다. 현재 ICU의 기본 계획에는 포함하지 않습니다.

현재 React mock 단계에서는 `src/features/curriculum/api/curriculumClient.ts`가 mock adapter로 동작합니다. 서버가 준비되면 같은 파일의 server mode가 `POST /api/curriculum/recommend`를 호출하도록 전환합니다.

## Node Backend 구현 계획

1. 서버 앱 경계 만들기
   - React/Vite 앱과 분리된 Node.js backend를 둡니다.
   - 브라우저는 `/api/curriculum/recommend`만 호출하고 provider, model, API key를 알지 않습니다.
   - 서버 프레임워크는 backend 작업을 시작할 때 결정합니다. React mock 단계에서는 Express 같은 서버 의존성을 추가하지 않습니다.

2. agent core 재사용
   - `backend/modules/curriculum`를 CLI가 아닌 API route에서도 호출할 수 있게 유지합니다.
   - route handler는 request validation, auth/session 확인, core 호출, response mapping만 담당합니다.
   - LLM 응답 검증과 fallback 정규화는 core 또는 agent service 계층에 둡니다.

3. 환경 변수와 보안
   - `GEMINI_API_KEY`, `GEMINI_MODEL`, provider 설정은 Node backend 환경 변수에서만 읽습니다.
   - `.env`, `src/.env`, 서버 secret 파일은 커밋하지 않습니다.
   - 실패 로그에는 API key, 원문 prompt, 민감한 사용자 입력을 그대로 남기지 않습니다.

4. 이후 확장
   - 사용자별 학습 기록 저장이 필요해지면 DB schema와 auth를 backend에 붙입니다.
   - 긴 작업은 queue/job으로 분리하고 React는 job status를 조회합니다.
   - RAG, 문서 chunking, embedding이 커지면 Python worker 또는 별도 Agent Service로 분리합니다.
## Endpoint

```http
POST /api/curriculum/recommend
Content-Type: application/json
```

## Request

```ts
type CurriculumRecommendationRequest = {
  goal: string
}
```

규칙:

- `goal`은 사용자가 Today Hub에서 입력한 학습 목표입니다.
- 빈 문자열은 클라이언트에서 먼저 막습니다.
- 서버는 trim된 goal을 기준으로 agent를 호출합니다.

예시:

```json
{
  "goal": "백엔드 개발자가 되고 싶어"
}
```

## Response

```ts
type CurriculumRecommendationResponse = {
  plan: GeneratedCurriculumPlan
}
```

`GeneratedCurriculumPlan`은 Today Hub와 Workspace가 이미 사용하는 화면 contract를 유지합니다.

```ts
type GeneratedCurriculumPlan = {
  id: string
  goal: string
  title: string
  summary: string
  estimatedDuration: string
  focusRole: string
  todayMission: {
    title: string
    detail: string
    durationMinutes: number
    fileName: string
  }
  steps: GeneratedCurriculumStep[]
  sources: CurriculumSource[]
}
```

예시:

```json
{
  "plan": {
    "id": "backend-curriculum-plan",
    "goal": "백엔드 개발자가 되고 싶어",
    "title": "백엔드 개발자 커리큘럼",
    "summary": "HTTP 요청-응답 흐름부터 시작합니다.",
    "estimatedDuration": "15주 로드맵",
    "focusRole": "백엔드 개발자",
    "todayMission": {
      "title": "HTTP 기본 실습",
      "detail": "간단한 GET 요청을 처리하는 서버를 작성합니다.",
      "durationMinutes": 30,
      "fileName": "main.py"
    },
    "steps": [],
    "sources": []
  }
}
```

## Server Behavior

- 서버는 `backend/modules/curriculum`의 core 로직을 재사용합니다.
- API key, provider, model 설정은 서버 환경 변수에서만 읽습니다.
- Gemini Developer API가 v1 기본 provider이며, Vertex AI는 provider option으로 추가합니다.
- 모델 응답은 `trackId`, `levelId`, `moduleIds`, `todayMission`, `sources`를 검증한 뒤 `GeneratedCurriculumPlan`으로 정규화합니다.
- 실패 시 React가 기존 mock/fallback UX를 유지할 수 있도록 4xx/5xx와 짧은 error message를 반환합니다.

## Client Integration

- React는 `src/features/curriculum/api/curriculumClient.ts`를 통해서만 커리큘럼 생성을 요청합니다.
- 현재 기본 mode는 `mock`입니다.
- 서버 연결 시 Today Hub의 호출 옵션만 `server`로 바꿉니다.
- 생성 결과는 `icu.generatedCurriculum` snapshot에 저장하고 Workspace는 이 snapshot을 우선 사용합니다.

## 제외 범위

- React 클라이언트에서 Gemini/Vertex/OpenAI API key를 읽는 구현
- Supabase Edge Function, Electron, RAG의 실제 구현
- 사용자별 DB 저장, 인증, queue, worker
- multi-agent orchestration
