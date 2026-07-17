# Curriculum Planner Agent

## 목적

Curriculum Planner Agent는 ICU에서 사용자의 학습 목표를 받아 적절한 커리큘럼 트랙을 고르고, Today Hub와 Workspace가 바로 사용할 수 있는 `GeneratedCurriculumPlan`으로 변환하는 단일 agent입니다.

현재 단계에서는 multi-agent로 나누지 않습니다. 커리큘럼 선택, 시작 레벨 선택, 오늘 미션 생성, 공식 자료 연결까지 하나의 agent facade 안에서 deterministic하게 처리합니다. 이후 실제 AI, RAG, 개인화 진단이 붙어 역할이 커지면 별도 agent로 분리합니다.

## 입력 데이터

원천 데이터는 루트 `data/` 폴더의 JSON 파일입니다.

- `frontend.json`
- `backend.json`
- `fullstack.json`
- `devops.json`
- `software-engineer.json`

각 파일은 `track -> levels -> modules` 구조를 가집니다. 모듈은 `topics`, `practiceIdeas`, `resources`를 포함합니다.

## 출력 데이터

Today Hub와 Workspace는 기존처럼 `GeneratedCurriculumPlan`을 사용합니다.

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

## 동작 규칙

- 사용자 목표 문자열을 정규화합니다.
- 목표 키워드로 트랙을 선택합니다.
- 매칭되는 트랙이 없으면 `frontend`를 기본값으로 사용합니다.
- 선택된 트랙의 첫 레벨을 시작 레벨로 사용합니다.
- 첫 레벨의 modules를 Today Hub/Workspace steps로 변환합니다.
- 첫 모듈의 `practiceIdeas[0]`를 오늘 미션으로 사용합니다.
- resource type은 다음처럼 변환합니다.
  - `official-doc` -> `official_docs`
  - `reference` -> `practice_guide`

## 트랙 매칭 키워드

- frontend: `frontend`, `프론트`, `react`, `html`, `css`, `javascript`
- backend: `backend`, `백엔드`, `api`, `server`, `fastapi`, `db`
- fullstack: `fullstack`, `풀스택`
- devops: `devops`, `데브옵스`, `인프라`, `sre`, `cloud`, `docker`
- software-engineer: `software engineer`, `소프트웨어`, `cs`, `알고리즘`, `자료구조`

## 구현 위치

현재 구현은 `src/data/curriculumGenerator.ts`에 둡니다. 기존 UI 호출부 변경을 줄이기 위해 `generateMockCurriculum(goal)` export 이름은 유지합니다.

## Gemini CLI Agent

로컬 검증용 실제 agent는 `scripts/curriculum-planner-agent.mjs`에 둡니다. 이 스크립트는 `data/*.json` 카탈로그를 Gemini `generateContent` REST API에 전달하고, 결과를 검증한 뒤 정규화된 JSON으로 출력합니다.

실행 예시:

```bash
npm run agent:curriculum -- "백엔드 개발자가 되고 싶어"
npm run agent:curriculum -- --dry-run "DevOps 엔지니어가 되고 싶어"
```

환경 변수:

- `GEMINI_API_KEY`: 로컬 `.env` 또는 `src/.env`에 둡니다.
- `GEMINI_MODEL`: 선택값이며 기본값은 `gemini-flash-latest`입니다.

실패 시 확인:

- `API_KEY_SERVICE_BLOCKED`가 나오면 코드 문제가 아니라 Google Cloud/API key 제한에서 `generativelanguage.googleapis.com` 호출이 차단된 상태입니다.
- 이 경우 API key 제한 설정에서 Generative Language API 사용을 허용해야 합니다.

주의:

- API key는 React/Vite 클라이언트 코드에서 읽지 않습니다.
- `.env`, `src/.env`는 커밋하지 않습니다.
- 브라우저 화면은 아직 deterministic `generateMockCurriculum`을 사용합니다.
- Gemini CLI agent는 이후 Electron Main Process, 서버 API, Supabase Edge Function 중 하나로 옮길 수 있는 실행 검증용입니다.

## v1 제외 범위

- React 클라이언트에서 직접 AI API 호출
- RAG 기반 공식 문서 검색
- 사용자 레벨 테스트 기반 시작 레벨 계산
- 오답노트 기반 개인화 추천
- Supabase 저장
- multi-agent orchestration

## 검증 기준

- 목표별 트랙 매칭이 정확합니다.
- 빈 목표는 frontend fallback을 반환합니다.
- 생성 결과는 Today Hub와 Workspace가 쓰는 필드를 모두 채웁니다.
- `reference` resource type도 source로 안전하게 변환합니다.
- `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`가 통과합니다.
