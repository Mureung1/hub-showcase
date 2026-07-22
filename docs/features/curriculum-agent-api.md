# Curriculum Agent API

## 목적

Curriculum Agent API는 React 화면이 LLM provider key를 직접 다루지 않고, Node backend를 통해 학습 목표 기반 커리큘럼을 추천받기 위한 서버 경계입니다.

현재 v1은 Express 기반 Node backend에서 동작합니다. React는 `src/features/curriculum/api/curriculumClient.ts`를 통해 mock 또는 server mode로 커리큘럼을 요청합니다.

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

- `goal`은 Today Hub에서 사용자가 입력한 학습 목표입니다.
- 빈 문자열은 클라이언트와 서버에서 모두 거부합니다.
- API key, provider, model 설정은 브라우저에 노출하지 않습니다.

## Response

```ts
type CurriculumRecommendationResponse = {
  plan: GeneratedCurriculumPlan
}
```

`GeneratedCurriculumPlan`은 Today Hub와 Workspace가 함께 사용하는 화면 contract입니다.

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

## 현재 구현 상태

- backend entrypoint는 `backend/http/server.mjs`입니다.
- route handler는 `backend/http/curriculumRoutes.mjs`입니다.
- application use case는 `backend/modules/curriculum/application/recommendCurriculum.mjs`입니다.
- curriculum catalog는 `shared/curriculum/*.json`에서 읽습니다.
- Gemini provider는 `backend/modules/curriculum/adapters/geminiCurriculumRecommendationProvider.mjs`에 있습니다.
- JSONL knowledge loader는 `backend/modules/knowledge/adapters/jsonlKnowledgeRepository.mjs`에 있습니다.
- React, Docker 같은 공식 문서 chunk는 추천 근거 context로 사용합니다.

## Today Hub와 Workspace 연결

1. Today Hub에서 사용자가 목표를 입력합니다.
2. `recommendCurriculum({ goal })`이 mock 또는 server mode로 실행됩니다.
3. server mode에서는 `/api/curriculum/recommend`를 호출합니다.
4. 응답받은 `plan`을 `icu.generatedCurriculum` snapshot으로 저장합니다.
5. 사용자가 `추천 미션 시작`을 누르면 `/workspace?mission=generated-first-mission`으로 이동합니다.
6. Workspace는 같은 snapshot을 읽어 오늘 미션, 단계 목록, 추천 근거와 출처를 표시합니다.

## Knowledge Data 정책

- `shared/curriculum/*.json`은 커리큘럼 track/level/module 구조의 기준 데이터입니다.
- `data/*.jsonl`은 공식 문서 chunk 기반 추천 근거입니다.
- 현재 구현은 full RAG가 아니라, Agent 추천 품질을 높이기 위한 lightweight knowledge context 단계입니다.
- React JSONL은 `{ title, content, url }` 형태도 처리합니다.
- React 학습 목표에서는 deprecated/legacy API보다 `/learn/` 문서를 우선하도록 scoring을 조정했습니다.

## 환경 변수

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
CURRICULUM_AGENT_PORT=8787
VITE_CURRICULUM_RECOMMENDATION_MODE=server
VITE_ICU_API_MODE=server
```

주의:

- 실제 provider key는 `.env` 또는 배포 secret store에만 둡니다.
- `VITE_*` 이름으로 API key를 만들지 않습니다.

## 제외 범위

- 브라우저에서 직접 Gemini/Vertex/OpenAI key 사용
- Supabase Edge Function 전환
- full RAG 검색/embedding/vector store
- 사용자별 DB 저장
- multi-agent orchestration
- Notion API 연동