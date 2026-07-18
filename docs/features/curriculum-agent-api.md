# Curriculum Agent API

## 목적

데스크톱 앱 전환 전에도 실제 Curriculum Planner Agent를 검증할 수 있도록 React 화면과 LLM 호출 사이에 서버 API 경계를 둡니다. React는 API key, provider, model 설정을 직접 알지 않고 `POST /api/curriculum/recommend`만 호출합니다.

## v1 선택

v1 실제 호출 위치는 Supabase Edge Function 또는 Node.js backend 중 하나입니다.

- Supabase Edge Function: 별도 서버 운영 없이 빠르게 배포하고 secret env를 숨기는 데 적합합니다.
- Node.js backend: 이후 인증, 학습 기록 DB, queue, worker를 같은 제품 서버에서 관리할 때 적합합니다.

현재 React mock 단계에서는 `src/data/curriculumClient.ts`가 mock adapter로 동작합니다. 서버가 준비되면 같은 파일의 server mode가 `POST /api/curriculum/recommend`를 호출하도록 전환합니다.

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

- 서버는 `scripts/curriculum-planner-agent-core.mjs`의 core 로직을 재사용합니다.
- API key, provider, model 설정은 서버 환경 변수에서만 읽습니다.
- Gemini Developer API가 v1 기본 provider이며, Vertex AI는 provider option으로 추가합니다.
- 모델 응답은 `trackId`, `levelId`, `moduleIds`, `todayMission`, `sources`를 검증한 뒤 `GeneratedCurriculumPlan`으로 정규화합니다.
- 실패 시 React가 기존 mock/fallback UX를 유지할 수 있도록 4xx/5xx와 짧은 error message를 반환합니다.

## Client Integration

- React는 `src/data/curriculumClient.ts`를 통해서만 커리큘럼 생성을 요청합니다.
- 현재 기본 mode는 `mock`입니다.
- 서버 연결 시 Today Hub의 호출 옵션만 `server`로 바꿉니다.
- 생성 결과는 `icu.generatedCurriculum` snapshot에 저장하고 Workspace는 이 snapshot을 우선 사용합니다.

## 제외 범위

- React 클라이언트에서 Gemini/Vertex/OpenAI API key를 읽는 구현
- Express, Supabase, Electron, RAG의 실제 구현
- 사용자별 DB 저장, 인증, queue, worker
- multi-agent orchestration

