# Learning Workspace IDE

## 목적

Learning Workspace는 Today Hub에서 선택한 커리큘럼 미션을 실제 학습 세션으로 이어주는 화면입니다. 현재 미션, 단계, AI 튜터 안내, Monaco Editor, 실행 결과, 활동 기록을 한 화면에서 연결합니다.

Workspace는 모든 커리큘럼을 같은 Preview 화면에 억지로 넣지 않습니다. React, Linux, Docker, Python 학습은 서로 다른 실행 환경과 결과 패널을 사용합니다.

## Workspace Mode

```ts
type WorkspaceMode = 'react' | 'linux' | 'docker' | 'python'
```

`GeneratedCurriculumPlan.todayMission.mode`는 optional 필드입니다. 새 커리큘럼은 가능한 경우 mode를 포함하고, 기존 저장 데이터처럼 mode가 없으면 Workspace가 `fileName`, `focusRole`, `goal`로 fallback 판별합니다.

Fallback 규칙:

- `Dockerfile` 또는 `*.dockerfile` -> `docker`
- `*.sh` 또는 DevOps/Linux 목표 -> `linux`
- `*.py` 또는 Python/FastAPI 목표 -> `python`
- `*.js`, `*.jsx`, `*.tsx` 또는 그 외 기본값 -> `react`

## mode별 화면 동작

| mode     | 기본 파일                 | 오른쪽 패널 | 실행 언어        | v1 실행 방식                                          |
| -------- | ------------------------- | ----------- | ---------------- | ----------------------------------------------------- |
| `react`  | `App.jsx` / `app.tsx`     | `Preview`   | `jsx` 또는 `tsx` | 별도 origin의 Preview 앱에서 React 화면을 실제 렌더링 |
| `linux`  | `ops-checklist.sh`        | `Terminal`  | `shell`          | 주요 shell 명령을 mock terminal log로 표시            |
| `docker` | `Dockerfile`              | `Build Log` | `dockerfile`     | Dockerfile 필수 instruction을 mock build log로 검증   |
| `python` | `main.py` / `solution.py` | `Output`    | `python`         | print/FastAPI/function 신호를 mock output으로 표시    |

React가 아닌 mode에서는 “화면 미리보기 없음”을 보여주지 않습니다. 실행 전에는 각 mode에 맞는 대기 문구를 보여주고, 실행 후에는 Console 영역에 로그를 표시합니다.

## 데이터 계약

Workspace가 사용하는 핵심 contract는 `GeneratedCurriculumPlan`입니다.

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
    mode?: WorkspaceMode
  }
  steps: GeneratedCurriculumStep[]
  sources: CurriculumSource[]
}
```

## 코드 실행 API

```http
POST /api/code/run
Content-Type: application/json
```

Request:

```ts
type CodeRunRequest = {
  code: string
  language: 'javascript' | 'jsx' | 'tsx' | 'shell' | 'dockerfile' | 'python' | string
  css?: string
}
```

Response:

```ts
type CodeRunResult = {
  success: boolean
  logs: string[]
  error?: string
  result?: string | null
  preview?: {
    kind: 'react'
    code: string
    css: string
    componentName: string
  }
}
```

구현 기준:

- React 화면은 `src/features/learning-workspace/api/codeRunnerClient.ts`를 통해 API를 호출합니다.
- Judge route handler는 `backend/http/codeRunRoutes.mjs`에 두고 `backend/http/judgeServer.mjs`가 별도 프로세스로 제공합니다.
- 실행 로직은 `backend/modules/code-runner/codeRunner.mjs`에 둡니다.
- JSX/TSX는 백엔드에서 CommonJS Preview 번들로 변환하며 React 런타임과 CSS import만 허용합니다.
- Preview 앱은 기본적으로 `http://127.0.0.1:5174/preview.html`에서 실행해 메인 앱과 origin을 분리합니다.
- 부모와 Preview 앱은 `requestId`가 포함된 `postMessage` 계약을 사용하고 origin, source, payload를 검증합니다.
- React 실행은 Preview 앱이 `icu:preview-rendered`를 응답한 뒤에만 통과로 기록합니다.
- 현재 Judge는 JavaScript/JSX/TSX 학습 피드백과 React Preview bundle을 지원합니다. shell, Dockerfile, Python mode의 결과는 아직 학습용 신호 검증입니다. 프로세스·파일시스템·컨테이너 격리와 실제 비-JavaScript 실행은 후속 단계에서 강화합니다.

## Tutor API

```http
POST /api/tutor/ask
```

Workspace는 현재 미션, 코드, 실행 결과, 대화 이력을 Core API에 전달합니다. 서버가 Gemini provider를 호출하며 frontend는 provider secret을 읽지 않습니다. 요청 실패 시 기존 대화와 입력을 유지하고 다시 시도할 수 있는 오류 상태를 표시합니다.

## 서버 진행 상태

- 진입 시 generated curriculum과 mission progress를 API에서 불러옵니다.
- 실행 결과, 시도 수, active step, 완료 시각, 활동 로그를 mission progress API에 저장합니다.
- 시스템 연결 실패는 학습 실패 시도에 포함하지 않습니다.
- mock mode에서만 localStorage progress fallback을 사용합니다.

## 진행 상태

- `idle`: 아직 실행하지 않은 상태입니다.
- `running`: 실행 요청이 진행 중입니다.
- `failed`: 실행 오류 또는 검증 실패 상태입니다.
- `passed`: 실행이 성공한 상태입니다.
- `compiling`: React 코드를 Preview 번들로 변환하고 있습니다.
- `rendering`: Preview 앱의 실제 화면 렌더링 응답을 기다리고 있습니다.
- `timeout`: Preview 앱이 5초 안에 렌더링 결과를 응답하지 않은 상태입니다.

새 실행을 시작하면 이전 API 요청과 Preview 요청을 취소합니다. 늦게 도착한 응답은 현재 상태와 진도 기록을 변경하지 않습니다. 컴파일·렌더링·timeout은 학습 실패로 기록하지만 서버 연결 같은 시스템 오류는 시도 횟수에 포함하지 않습니다.

## 후속 범위

- Judge의 프로세스·파일시스템·컨테이너 격리
- 실제 shell, Docker, Python runner
- Tutor의 full RAG retrieval과 코드 리뷰 강화
- 인증 기반 사용자별 DB 분리
- Electron IPC 연결과 desktop packaging

## 화면 구성 기준

- Top bar는 현재 track, step, 오늘 진행률, 남은 시간, Today 또는 학습 목록으로 돌아가는 행동을 제공합니다.
- Curriculum panel은 오늘 단계, 현재 mission, 통과 조건, 복습 shortcut을 보여줍니다.
- AI Tutor panel은 설명, mission, hint, code review, 공식 출처를 구분합니다.
- Editor panel은 file tab, language, 실행 제어, Monaco editor, Preview를 제공합니다.
- Result panel은 not run, running, compiling, rendering, passed, failed, timeout 상태를 구분합니다.
- 실패 상태는 실패 항목, 쉬운 원인 설명, hint, 다시 실행을 함께 제공합니다.
- 성공 상태는 통과 항목, 짧은 feedback, code review, 다음 단계 행동을 제공합니다.

## 접근성 및 좁은 화면

- 실행, 취소, 다시 실행, 다음 단계의 keyboard focus를 항상 표시합니다.
- terminal과 결과 변경은 screen reader가 읽을 수 있는 status 또는 live region으로 제공합니다.
- 오류와 성공은 색상 외에 제목과 설명으로 구분합니다.
- 좁은 화면에서는 `튜터`, `코드`, `결과` tab 또는 같은 의미의 순차 영역으로 전환합니다.
- 현재 mission과 실행 행동은 tab 전환 후에도 찾기 쉬운 위치를 유지합니다.
