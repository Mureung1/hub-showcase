# ICU Backend

ICU의 서버는 학습 데이터와 AI 호출을 담당하는 **Core API**와 코드 실행을 담당하는 **Judge API**로 분리됩니다. 브라우저는 Gemini나 다른 모델 provider를 직접 호출하지 않습니다.

## 서버 실행

Core API:

```bash
npm run start:api
```

기본 주소는 `http://127.0.0.1:8787`입니다.

Judge API:

```bash
npm run start:judge
```

기본 주소는 `http://127.0.0.1:8790`입니다.

전체 로컬 개발 환경:

```bash
npm run dev:server
```

이 명령은 Core API, Judge API, Vite App, Preview Runtime 네 프로세스를 실행합니다.

## Core API

```http
GET    /api/health

GET    /api/profile
PUT    /api/profile
DELETE /api/profile

POST   /api/curriculum/recommend
GET    /api/curriculum/generated
POST   /api/curriculum/generated
DELETE /api/curriculum/generated
DELETE /api/curriculum/generated/:id
GET    /api/curriculum/history

GET    /api/progress/today
POST   /api/progress/missions/:missionId
DELETE /api/progress/missions/:missionId
DELETE /api/progress

GET    /api/mistake-notes
POST   /api/mistake-notes
PATCH  /api/mistake-notes/:noteId
DELETE /api/mistake-notes/:noteId
DELETE /api/mistake-notes

GET    /api/git-lab/attempts
POST   /api/git-lab/attempts
DELETE /api/git-lab/attempts

POST   /api/tutor/ask
```

Core API entrypoint는 `backend/http/server.mjs`입니다.

### Curriculum Agent

```http
POST /api/curriculum/recommend
Content-Type: application/json
```

최초 생성:

```json
{ "goal": "백엔드 개발자가 되고 싶어" }
```

후속 요청은 기존 계획과 추가 지시를 함께 전달합니다.

```json
{
  "goal": "백엔드 개발자가 되고 싶어",
  "previousPlan": {},
  "followUpInstruction": "3주 과정으로 조정해줘"
}
```

응답의 `plan`은 Today Hub와 Workspace가 사용하는 `GeneratedCurriculumPlan` 계약을 따르며 설정된 repository에 snapshot으로 저장됩니다.

### Tutor

```http
POST /api/tutor/ask
Content-Type: application/json
```

Workspace의 현재 미션, 코드, 실행 결과, 이전 대화를 서버의 Gemini provider로 전달합니다. Provider secret은 서버 환경 변수에서만 읽습니다.

## Judge API

```http
GET  /api/health
POST /api/code/run
```

```json
{ "language": "javascript", "code": "console.log('hello ICU')" }
```

현재 runner는 JavaScript/JSX 학습 피드백에 필요한 실행 경계를 제공합니다. Core API는 `/api/code/run`을 노출하지 않습니다. 프로세스·파일시스템·컨테이너 수준의 강한 격리는 후속 과제입니다.

## Repository Modes

`ICU_REPOSITORY_MODE`로 Core API의 저장 방식을 선택합니다.

### in-memory

```env
ICU_REPOSITORY_MODE=in-memory
```

테스트와 일회성 실행용 기본 adapter입니다. 서버 재시작 시 데이터가 사라집니다.

### SQLite

```env
ICU_REPOSITORY_MODE=sqlite
ICU_SQLITE_PATH=.icu/icu.sqlite
```

다음을 로컬 파일에 저장합니다.

- learner profile
- generated curriculum
- learning progress
- mistake notes
- Git Lab attempts

### Supabase

```env
ICU_REPOSITORY_MODE=supabase
SUPABASE_URL=
SUPABASE_SECRET_KEY=
```

배포 환경에서 같은 application/domain 계약을 Supabase adapter로 구현합니다. `SUPABASE_SECRET_KEY`는 절대 `VITE_*` 변수로 노출하지 않습니다.

## 환경 변수

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
CURRICULUM_AGENT_PORT=8787
JUDGE_PORT=8790
ICU_ALLOWED_ORIGIN=
```

Frontend:

```env
VITE_CURRICULUM_RECOMMENDATION_MODE=server
VITE_ICU_API_MODE=server
VITE_API_BASE_URL=
VITE_CODE_RUNNER_BASE_URL=
```

`server` mode가 기본 동작입니다. API 없이 화면 fallback을 확인할 때만 `mock` mode를 명시적으로 선택합니다.

## 모듈 경계

- `backend/modules/profile`: 학습 프로필
- `backend/modules/curriculum`: 추천 생성과 snapshot 보관
- `backend/modules/learning-progress`: 미션 실행·완료 상태
- `backend/modules/mistake-notes`: 오답 기록과 복습 상태
- `backend/modules/git-lab`: Git 명령 시도와 연결 오답
- `backend/modules/code-runner`: Judge의 JavaScript/JSX 실행
- `backend/modules/knowledge`: agent/RAG grounding용 JSONL 지식

각 기능은 application/domain 계약을 유지하면서 in-memory, SQLite, Supabase adapter를 교체합니다.

## 빠른 검증

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

로컬 확인 흐름:

1. `npm run dev:server`
2. `/profile`에서 학습 프로필 저장
3. `/today/goal`에서 커리큘럼 생성
4. `/workspace`에서 코드 실행과 Tutor 질의
5. `/mistake-notes`와 `/git-lab`의 저장 상태 확인
