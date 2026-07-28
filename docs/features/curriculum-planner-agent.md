# Curriculum Planner Agent

## 목적

Curriculum Planner Agent는 ICU에서 사용자의 학습 목표를 받아 적절한 커리큘럼 트랙을 고르고, Today Hub와 Workspace가 바로 사용할 수 있는 `GeneratedCurriculumPlan`으로 변환하는 단일 agent입니다.

현재 단계에서는 multi-agent로 나누지 않습니다. 커리큘럼 선택, 시작 레벨 선택, 오늘 미션 생성, 공식 자료 연결까지 하나의 agent facade 안에서 deterministic하게 처리합니다. 이후 실제 AI, RAG, 개인화 진단이 붙어 역할이 커지면 별도 agent로 분리합니다.

## 입력 데이터

원천 데이터는 `shared/curriculum/` 폴더의 JSON 파일입니다.

- `frontend.json`
- `backend.json`
- `fullstack.json`
- `devops.json`
- `software-engineer.json`

각 파일은 `track -> levels -> modules` 구조를 가집니다. 모듈은 `topics`, `practiceIdeas`, `resources`를 포함합니다.

## 출력 데이터

Today Hub와 Workspace는 기존처럼 `GeneratedCurriculumPlan`을 사용합니다.

```ts
type WorkspaceMode = 'react' | 'linux' | 'docker' | 'python'

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
    mode?: WorkspaceMode
  }
  steps: GeneratedCurriculumStep[]
  sources: CurriculumSource[]
}
```

## 동작 규칙

- 사용자 목표 문자열을 정규화합니다.
- 목표 키워드로 트랙을 선택합니다.
- 매칭되는 트랙이 없으면 `frontend`를 기본값으로 사용합니다.
- 선택된 트랙의 첫 레벨을 시작 레벨로 사용합니다.
- 첫 레벨의 modules를 Today Hub/Workspace steps로 변환합니다.
- 첫 모듈의 `practiceIdeas[0]`를 오늘 미션으로 사용합니다.
- 오늘 미션에는 가능한 경우 `mode`를 포함합니다. mode가 없으면 Workspace가 파일명과 트랙 정보로 fallback 판별합니다.
- resource type은 다음처럼 변환합니다.
  - `official-doc` -> `official_docs`
  - `reference` -> `practice_guide`

## 대화형 후속 커리큘럼 생성 (Multi-turn Follow-up Agent)

사용자가 최초 생성 후 추가 지시어(예: `"3주 커리큘럼으로 짜줘"`, `"2주 분량으로 조정해줘"`, `"어제 학습한 거에 이어서 다음 단계 짜줘"`)를 입력할 수 있습니다.

- `followUpInstruction`: 사용자의 추가 후속 요청 문자열
- `previousPlan`: 직전에 생성되거나 보관함에서 선택한 커리큘럼 스냅샷
- Gemini Provider는 `contents` 멀티턴 메시지 배열(System Instruction + Initial Prompt + Previous Recommendation + Follow-up Instruction)을 구성하여 기존 맥락을 유지하면서 기간 및 단계를 재조정하여 생성합니다.

## 트랙 매칭 키워드

- frontend: `frontend`, `프론트`, `react`, `html`, `css`, `javascript`
- backend: `backend`, `백엔드`, `api`, `server`, `fastapi`, `db`
- fullstack: `fullstack`, `풀스택`
- devops: `devops`, `데브옵스`, `인프라`, `sre`, `cloud`, `docker`
- software-engineer: `software engineer`, `소프트웨어`, `cs`, `알고리즘`, `자료구조`

## 구현 위치

기본 server mode에서 `/today/goal`은 `src/features/curriculum/api/curriculumClient.ts`를 통해 `/api/curriculum/recommend`를 호출합니다. 응답 plan은 generated-curriculum repository에 저장되고 Today Hub와 Workspace store에 반영됩니다. `src/features/curriculum/model/curriculumGenerator.ts`의 deterministic generator는 mock mode fallback입니다.

실제 LLM 호출 agent는 CLI entrypoint와 core 모듈을 분리합니다.

- `scripts/curriculum-planner-agent.mjs`: CLI 인자 처리, env 로딩, 결과 출력만 담당합니다.
- `backend/modules/curriculum`: catalog 생성, prompt/system instruction 생성, provider config, Gemini 호출, 응답 JSON 추출/검증/정규화를 담당합니다.

이렇게 분리하면 이후 Node.js 백엔드와 Electron Main Process에서 CLI를 거치지 않고 core 함수를 직접 재사용할 수 있습니다.

## Gemini CLI Agent

로컬 검증용 실제 agent는 `scripts/curriculum-planner-agent.mjs`에 둡니다. 이 스크립트는 `shared/curriculum/*.json` 카탈로그를 Gemini `generateContent` REST API에 전달하고, 결과를 검증한 뒤 정규화된 JSON으로 출력합니다.

실행 예시:

```bash
npm run agent:curriculum -- "백엔드 개발자가 되고 싶어"
npm run agent:curriculum -- --dry-run "DevOps 엔지니어가 되고 싶어"
```

환경 변수:

- `GEMINI_API_KEY`: 로컬 `.env` 또는 `src/.env`에 둡니다.
- `GEMINI_MODEL`: 선택값이며 기본값은 `gemini-flash-latest`입니다.
- `CURRICULUM_AGENT_PROVIDER` 또는 `GEMINI_PROVIDER`: 선택값이며 현재 지원값은 `developer`입니다. Vertex AI는 추후 provider로 추가합니다.

실패 시 확인:

- `API_KEY_SERVICE_BLOCKED`가 나오면 코드 문제가 아니라 Google Cloud/API key 제한에서 `generativelanguage.googleapis.com` 호출이 차단된 상태입니다.
- 이 경우 API key 제한 설정에서 Generative Language API 사용을 허용해야 합니다.

주의:

- API key는 React/Vite 클라이언트 코드에서 읽지 않습니다.
- `.env`, `src/.env`는 커밋하지 않습니다.
- 브라우저는 Core API만 호출하고 Gemini API key를 읽지 않습니다.
- mock mode는 API 없이 화면을 확인할 때만 명시적으로 사용합니다.
- Gemini CLI agent는 서버 core와 같은 계약을 독립적으로 검증하는 도구입니다.

## 실제 호출 위치 결정

현재 브라우저는 Gemini API를 직접 호출하지 않고 Core API를 사용합니다. API contract는 [Curriculum Agent API](./curriculum-agent-api.md)를 기준으로 합니다.

1. 현재 연결: Node.js backend
   - React는 `/api/curriculum/recommend` 같은 서버 API만 호출합니다.
   - Node API route가 `backend/modules/curriculum`의 core 로직과 secret env를 소유합니다.
   - API key, provider, model 설정은 서버 환경 변수에서만 읽습니다.
   - 프론트 contract는 `GeneratedCurriculumPlan` 또는 그에 대응하는 정규화 JSON으로 유지합니다.
   - 생성된 plan은 configured repository(in-memory, SQLite, Supabase)에 저장합니다.

2. 데스크톱 앱 전환 후: Electron Main Process
   - Renderer는 IPC로 `curriculum:generate`를 요청합니다.
   - Main Process가 같은 core 함수를 재사용해 LLM을 호출합니다.
   - 이 단계에서는 로컬 DB/파일 접근과 agent 실행을 Main Process에 모읍니다.

3. Vertex AI 전환
   - Vertex AI는 provider로 추가합니다.
   - 화면과 저장 store는 provider 차이를 알지 않습니다.
   - provider 내부에서 project, location, access token/IAM 설정을 처리합니다.

이 결정의 기준은 API key 노출 방지, 데스크톱 전환 전 실제 AI 흐름 검증, 이후 Electron 재사용 가능성입니다.

## v1 제외 범위

- React 클라이언트에서 직접 AI API 호출
- RAG 기반 공식 문서 검색
- 사용자 레벨 테스트 기반 시작 레벨 계산
- 오답노트 기반 개인화 추천
- 인증 기반 사용자별 추천 이력 분리
- multi-agent orchestration

## 검증 기준

- 목표별 트랙 매칭이 정확합니다.
- 빈 목표는 frontend fallback을 반환합니다.
- 생성 결과는 Today Hub와 Workspace가 쓰는 필드를 모두 채웁니다.
- `reference` resource type도 source로 안전하게 변환합니다.
- `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`가 통과합니다.
