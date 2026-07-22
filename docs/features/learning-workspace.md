# Learning Workspace IDE

## 목적

Learning Workspace는 사용자가 Today Hub에서 선택하거나 AI가 생성한 커리큘럼을 실제 학습 세션으로 이어가는 화면입니다. 현재 미션, 커리큘럼 단계, AI 튜터 안내, Monaco 코드 에디터, 실행 결과, 활동 기록을 한 화면에서 연결해 학습 흐름이 끊기지 않게 합니다.

이 화면은 VS Code 같은 개발 도구의 구조를 참고하되, 파일 탐색기보다 현재 학습 단계와 다음 액션을 더 중요하게 보여줍니다.

## 현재 구현 상태

- `/workspace` 진입 시 URL의 `mission` query를 읽습니다.
- `mission` query가 없으면 `generated-first-mission`을 기본 미션으로 사용합니다.
- `generated-first-mission`은 Today Hub에서 생성된 `icu.generatedCurriculum` snapshot을 우선 사용합니다.
- 생성된 snapshot이 없거나 깨져 있으면 프로필 목표 기반 fallback 커리큘럼을 사용합니다.
- Workspace는 Today Hub와 같은 `GeneratedCurriculumPlan` contract를 사용합니다.
- 코드 입력 영역은 `@monaco-editor/react` 기반 Monaco Editor를 사용합니다.
- 실행 버튼은 Express backend의 `POST /api/code/run`으로 현재 코드를 전송합니다.
- 현재 코드 실행 API는 JavaScript/JSX를 우선 지원하며, 다른 언어는 명시적인 미지원 결과를 반환합니다.
- 학습 진행 상태는 `icu.learningProgress` localStorage 또는 서버 모드 API를 통해 유지합니다.

## 화면 구성

- Top Bar: 현재 미션 제목, 추천 트랙, 학습 목록/오늘 학습 이동
- Status Strip: 진행률, 테스트 통과 수, 예상 시간, 학습 상태
- Curriculum Panel:
  - 현재 단계
  - 생성된 계획 요약
  - 커리큘럼 단계 목록
- AI Tutor Panel:
  - 오늘의 미션
  - 통과 기준
  - 힌트
  - 코드 리뷰 안내
  - 추천 근거와 출처
- Code Editor Panel:
  - 파일 탭
  - 미션 유형 badge
  - 실행 버튼
  - Monaco Editor 기반 코드 입력
- Test Results Panel:
  - 테스트 케이스별 입력/예상/실제/결과
  - 힌트 보기
  - 코드 리뷰 요청
  - 다음 단계
  - 활동 기록

## 생성 커리큘럼 연결 규칙

- Today Hub에서 커리큘럼 생성 성공 시 결과를 `icu.generatedCurriculum`에 저장합니다.
- Today Hub의 `추천 미션 시작` CTA는 `/workspace?mission=generated-first-mission`으로 이동합니다.
- Workspace는 저장된 생성 플랜의 `todayMission`, `steps`, `sources`를 화면에 반영합니다.
- 생성 플랜이 있으면 `저장됨`, 없으면 `기본값` 상태로 표시합니다.
- `steps`가 길어질 수 있으므로 커리큘럼 단계 목록은 패널 내부에서 스크롤합니다.
- `sources`가 길어질 수 있으므로 추천 근거와 출처도 패널 내부에서 스크롤합니다.

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
  language: 'javascript' | 'jsx' | string
}
```

Response:

```ts
type CodeRunResult = {
  success: boolean
  logs: string[]
  error?: string
  result?: string | null
}
```

구현 기준:

- React 화면은 `src/features/learning-workspace/api/codeRunnerClient.ts`를 통해 API를 호출합니다.
- Express route handler는 `backend/http/codeRunRoutes.mjs`에 둡니다.
- JavaScript 실행 로직은 `backend/modules/code-runner/codeRunner.mjs`에 둡니다.
- 현재 실행기는 로컬 학습용 최소 실행기입니다. 보안 격리, 파일 시스템 격리, 프로세스 제한은 Judge Service 단계에서 강화합니다.

## 실행 상태

- `idle`: 아직 실행하지 않은 상태입니다.
- `running`: 코드 실행 요청이 진행 중입니다.
- `failed`: 실행 오류 또는 검증 실패 상태입니다. 힌트 보기와 다시 실행을 유도합니다.
- `passed`: 실행이 성공한 상태입니다. 다음 단계로 이동할 수 있습니다.

## 후속 범위

- Judge Service 구현
- Python 실행 지원
- AI 코드 리뷰 API 연결
- RAG 기반 튜터 답변 생성
- 사용자별 DB 저장 강화
- Electron IPC 연결 및 desktop packaging
