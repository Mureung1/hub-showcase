# 오답노트

## 목적

오답노트는 ICU에서 사용자가 틀린 명령, 실습 실패, 헷갈린 개념을 저장하고 다시 풀 수 있게 하는 학습 회고 기능입니다. Git Lab은 첫 연결 대상일 뿐이며, 이후 Learning Workspace, 알고리즘 실습, API 실습 같은 다른 학습 모듈도 같은 방식으로 오답을 남기고 원래 레슨으로 돌아갈 수 있어야 합니다.

React mock 단계에서는 실제 DB, RAG, Notion 연동 없이 브라우저 localStorage에 저장합니다. 목표는 학습 흐름을 `실패 -> 기록 -> 전체보기 -> 출처 레슨 다시 풀기 -> 해결 처리`까지 끊기지 않게 만드는 것입니다.

- 라우트: `/mistake-notes`, `/mistake-notes/new` (수동 작성)
- Navigator 메뉴명: `오답노트`
- 저장 키: `icu.mistakeNotes`

## 주요 사용자 액션

- 오답 저장: 학습 모듈에서 실패한 명령어, 코드 실행 실패, 퀴즈 오답을 오답노트에 자동/수동 추가합니다.
- 수동 오답 작성: `/mistake-notes/new` 페이지에서 출처 학습 모듈, 레슨 정보, 실패 명령, 실패 이유, 수정 힌트를 직접 작성합니다.
- 오답 확인: 전체 오답, 미해결 오답, 해결한 오답을 확인합니다.
- 오답 상세 보기·수정: 목록의 오답 항목(행)을 클릭하여 모달에서 전체 내용을 확인하고, 자동 저장·수동 작성 여부와 관계없이 바로 수정합니다.
- 다시 풀기: 오답이 발생한 출처 학습 모듈과 레슨으로 돌아갑니다.
- 해결 처리: 다시 풀고 이해한 오답을 해결 상태로 바꿉니다.
- 다시 열기: 해결 처리한 오답을 미해결 상태로 되돌립니다.
- 삭제: 더 이상 필요 없는 오답 기록을 제거합니다.

## 화면 구성

오답노트 목록 화면은 카드 그리드가 아니라 참고 화면처럼 넓은 테이블형 관리 화면으로 구성합니다. 이 화면은 Today Hub의 `복습과 오답` 카드에서 `전체보기`를 눌렀을 때 들어오는 전체 목록 화면입니다. 사용자는 오답을 많이 쌓아두고 다시 풀어야 하므로, 한 화면에서 여러 행을 빠르게 훑고 상태를 바꿀 수 있어야 합니다.

### 상단 영역

- 페이지 제목은 `오답노트`로 표시합니다.
- 탭은 `내가 저장한 오답`, `공유된 오답`을 기본으로 둡니다.
- 현재 선택된 탭은 ICU의 deep-blue 텍스트와 cyan 하단 border로 강조합니다.
- 우측에는 `내보내기`, `+ 새 오답 추가` 버튼을 둡니다.
- `+ 새 오답 추가`는 Git Lab 자동 기록 외에 사용자가 직접 오답을 남길 수 있는 후속 확장 진입점입니다.

### 상단 요약

- 전체 오답 개수, 미해결 오답 개수, 해결한 오답 개수는 큰 카드가 아니라 테이블 상단 또는 하단의 작고 간결한 텍스트로 표시합니다.
- 예: `전체 12행`, `미해결 5`, `해결 7`

### 필터 영역

- 전체
- 미해결
- 해결

### 오답 테이블

오답 목록은 테이블 행으로 표시합니다. 기본 컬럼은 다음 순서로 둡니다.

- `레슨`
- `출처`
- `실패 명령`
- `실패 이유`
- `수정 힌트`
- `저장 날짜`
- `최근 복습`
- `다시 풀기`
- `상태`
- `수정 및 삭제`

표시 규칙:

- `실패 명령`은 monospace로 표시합니다.
- `실패 이유`와 `수정 힌트`가 길면 한 줄 말줄임으로 줄이고, hover/title 또는 상세 확장으로 전체 내용을 확인할 수 있게 합니다.
- `상태`는 compact badge로 표시합니다. `미해결`은 warm orange 주의 색상, `해결`은 blue/cyan 계열을 사용합니다.
- `다시 풀기`, `수정`, `삭제`는 각 행의 작은 outline 버튼으로 둡니다.
- 삭제 버튼은 강한 빨강 대신 warm orange 주의 계열 outline을 사용합니다.
- 테이블 하단에는 `전체 N 행`과 페이지네이션을 표시합니다.

### 반응형

- 데스크톱에서는 테이블을 유지합니다.
- 폭이 좁아지면 가로 스크롤을 허용하되, 주요 컬럼인 `레슨`, `실패 명령`, `상태`, `다시 풀기`는 읽기 쉽도록 최소 너비를 둡니다.
- 모바일에서는 테이블을 카드형 리스트로 바꿀 수 있지만, 데스크톱 기본 경험은 반드시 테이블입니다.

### 오답 상세 보기 모달 (`MistakeNoteDetailModal`)

- 목록 테이블의 오답 행(`tr`)을 클릭하면 팝업 대화상자가 표시됩니다.
- 행 내부의 버튼(`다시 풀기`, `해결`, `삭제`) 클릭 시에는 `e.stopPropagation()`으로 모달 오픈을 방지합니다.
- 모달 구성:
  - **헤더**: 출처 배지, 레슨 ID 배지, 해결 상태 배지, 레슨 제목 (`lessonTitle`), 닫기(`×`) 버튼.
  - **본문**: 수동 작성 페이지와 같은 순서로 출처, 레슨 이름·ID, 실패 내용, 실패 이유, 수정 힌트를 표시하고 저장·복습 메타 데이터를 별도로 표시합니다.
  - **읽기 푸터**: `다시 풀기`, `수정`, `해결로 표시`/`미해결로 되돌리기`, `삭제`, `닫기`
  - **편집 푸터**: `취소`, `저장`
- `수정`을 누르면 `source`, `lessonTitle`, `lessonId`, `command`, `reason`, `correction`이 같은 모달 안에서 입력 필드로 전환됩니다.
- `취소`는 서버 요청 없이 원본 값을 복구합니다. 저장 실패 시에는 draft와 편집 모드를 유지해 재시도할 수 있게 합니다.
- `id`, `createdAt`, `reviewedAt`, `status`는 내용 수정으로 바뀌지 않습니다. 수정된 source·lessonId는 저장 응답 이후 다시 풀기 경로에 즉시 반영됩니다.
- 접근성: `role="dialog"`, `aria-modal="true"`, `ESC` 키 입력 및 배경 클릭 시 닫기 처리. 저장 중에는 중복 요청과 입력 유실을 막기 위해 닫기·ESC·배경 클릭을 비활성화합니다.

### 수동 오답 작성 페이지 (`/mistake-notes/new`)

- 상단 네비게이션 `+ 새 오답 추가` 링크를 통해 진입합니다.
- 사용자가 학습 모듈 이외에서도 자유롭게 틀린 내용이나 헷갈린 개념을 기록할 수 있는 작성 페이지입니다.
- 주요 구성:
  - **출처 학습 모듈 선택**: Git Lab, 학습 워크스페이스, 알고리즘 실습, API 실습 라디오 칩
  - **레슨 정보**: 레슨 이름, 레슨 ID
  - **오답 내용**: 실패 명령/코드, 실패 이유, 수정 힌트
  - **중복 경고**: 출처·레슨·명령·이유가 동일한 미해결 오답 존재 시 안내 메시지 표시
  - **저장 처리**: 로컬 store 등록 후 backend API (`POST /api/mistake-notes`) 연동

## 표시 데이터

```ts
type MistakeNote = {
  id: string
  source: 'git-lab' | 'workspace' | 'algorithm' | 'api-practice'
  lessonId: string
  lessonTitle: string
  command: string
  reason: string
  correction: string
  createdAt: string
  reviewedAt: string | null
  status: 'open' | 'resolved'
}
```

필드 규칙:

- `id`: 저장 시 생성하는 고유 id입니다.
- `source`: 오답이 발생한 학습 모듈입니다. MVP 구현은 `git-lab`부터 시작하지만, 필드는 다른 학습 모듈로 확장 가능해야 합니다.
- `lessonId`: 다시 풀기 이동에 사용하는 출처 학습 모듈의 레슨 또는 미션 id입니다.
- `lessonTitle`: 목록에서 사용자가 이해하기 쉬운 레슨 이름입니다.
- `command`: 사용자가 실패한 Git 명령어, 코드 실행 라벨, 퀴즈 답변 요약입니다.
- `reason`: 학습 모듈이 반환한 실패 이유 또는 오답 원인입니다.
- `correction`: 현재 레슨의 힌트나 다시 풀 때 볼 수정 방향입니다.
- `createdAt`: ISO 문자열로 저장합니다.
- `status`: 기본값은 `open`입니다.

## 상태 규칙

- `open`: 아직 다시 풀어야 하는 오답입니다. 목록에서 우선 노출합니다.
- `resolved`: 사용자가 이해했다고 표시한 오답입니다. 기본 목록에서는 뒤쪽에 배치합니다.

목록 정렬은 미해결 우선, 같은 상태 안에서는 최신순을 기본으로 합니다.

## 학습 모듈 연결 규칙

각 학습 모듈은 실패한 실행 결과를 오답 후보로 만들 수 있습니다. MVP에서는 Git Lab 실패 명령어를 먼저 연결합니다. Git Lab은 실패한 Git 명령을 자동으로 오답노트에 저장하고, 이미 같은 source, lessonId, command, reason의 미해결 오답이 있으면 중복 저장하지 않습니다.

자동 기록 조건:

- `runGitCommand` 결과가 `ok: false`입니다.
- 입력값이 비어 있지 않은 Git 명령어입니다.
- `level`, `hint` 같은 UI 명령은 오답노트에 저장하지 않습니다.

저장 값:

- `lessonId`: 현재 추천 모듈의 레벨 또는 미션 id
- `lessonTitle`: 현재 추천 모듈의 레슨 제목
- `command`: 사용자가 입력한 명령어, 코드 실행 오류, 또는 퀴즈 답안 요약
- `reason`: 실패 로그 첫 줄
- `correction`: 현재 레벨 `hint`

라우트 규칙:

- `git-lab`: `/git-lab?lesson=<lessonId>`
- `workspace`: `/workspace?mission=<lessonId>`
- `algorithm`: `/workspace?mission=<lessonId>`
- `api-practice`: `/workspace?mission=<lessonId>`

Git Lab 터미널은 실패 로그에서 오답노트 자동 기록 여부를 알려주고 `/mistake-notes` 링크를 제공합니다. 오답노트 목록의 `다시 풀기`는 source별 라우트 규칙에 따라 원래 학습 모듈로 이동합니다.

## Today Hub 연결 규칙

Today Hub의 `복습과 오답` 카드에는 오답노트 store의 최근 오답을 우선 표시합니다.

- 저장된 오답이 있으면 최신 미해결 오답을 최대 3개 보여줍니다.
- 저장된 오답이 없으면 기존 mock `recentMistakes`를 fallback으로 보여줍니다.
- Today Hub 카드의 `전체보기` 링크는 `/mistake-notes`로 이동합니다.
- 각 오답 항목은 상세 화면 없이 오답노트 전체 화면에서 다시 풀기 액션을 제공합니다.

## 저장 방식

React mock 단계에서는 Zustand store와 localStorage를 사용합니다.

- store 이름: `useMistakeNoteStore`
- 저장 키: `icu.mistakeNotes`
- 저장 형태: `{ notes: MistakeNote[] }`
- 깨진 JSON 또는 형식이 맞지 않는 값은 빈 목록으로 복구합니다.

Electron/SQLite 단계에서는 같은 필드를 유지하되 저장소만 로컬 DB로 교체합니다.

## 구현 우선순위

1. `useMistakeNoteStore`와 테스트를 추가합니다.
2. `/mistake-notes` 라우트와 Navigator 메뉴를 추가합니다.
3. 오답노트 목록 화면을 구현합니다.
4. Git Lab 실패 명령을 자동 기록하고 터미널에서 오답노트 보기 링크를 제공합니다.
5. 오답노트 `다시 풀기`는 `source`별 라우팅 규칙에 따라 원래 학습 모듈로 이동합니다. MVP에서는 `/git-lab?lesson=<lessonId>`를 먼저 지원합니다.
6. Today Hub의 `복습과 오답` 카드에 최근 오답을 연결합니다.

## 완료 기준

- Navigator에서 `오답노트` 메뉴로 이동할 수 있습니다.
- Git Lab에서 실패한 명령어가 오답노트에 자동 기록되고 다시 풀기 흐름으로 이어집니다.
- 오답노트 목록에서 특정 행을 클릭하면 `MistakeNoteDetailModal`을 통해 저장된 명령어, 실패 이유, 수정 힌트를 상세히 확인할 수 있습니다.
- `+ 새 오답 추가` 버튼을 눌러 `/mistake-notes/new` 페이지에서 오답을 수동 작성 및 등록할 수 있습니다.
- 오답노트에서 해결/다시 열기/삭제를 할 수 있습니다.
- 오답노트에서 출처 학습 모듈의 해당 레슨으로 다시 이동할 수 있습니다. MVP에서는 Git Lab 레슨 이동을 먼저 지원합니다.
- Today Hub에서 최근 오답을 확인할 수 있습니다.

## 검증 기준

코드 구현 시 다음을 확인합니다.

- `npm run typecheck`
- `npm test`
- `npm run lint`
- `npm run build`
- `/mistake-notes` 라우트 수동 QA
- Git Lab 실패 명령 저장과 다시 풀기 수동 QA
- 후속 학습 모듈이 `source + lessonId` 규칙으로 붙을 수 있는지 문서/타입 검토
- Today Hub 최근 오답 표시 수동 QA

문서 변경만 있을 때는 변경된 Markdown이 UTF-8로 정상 출력되고 상대 링크가 올바른지 확인합니다.

## v1 제외 범위

- AI 자동 해설 생성
- RAG 기반 개인화 복습 추천
- Notion 동기화
- Electron/SQLite 저장
- 전체 학습 트랙별 통합 오답 분석
- 코드 실행 실패 자동 수집

## Backend API Boundary

Implemented in this task:

- Server routes: `backend/http/mistakeNoteRoutes.mjs`
- Application service: `backend/modules/mistake-notes/application/mistakeNoteService.mjs`
- Domain rules: `backend/modules/mistake-notes/domain/mistakeNote.mjs`
- In-memory adapter: `backend/modules/mistake-notes/adapters/inMemoryMistakeNoteRepository.mjs`
- Frontend client adapter: `src/features/mistake-notes/api/mistakeNoteClient.ts`

Supported routes:

```txt
GET    /api/mistake-notes
POST   /api/mistake-notes
PATCH  /api/mistake-notes/:noteId
DELETE /api/mistake-notes/:noteId
DELETE /api/mistake-notes
```

`PATCH /api/mistake-notes/:noteId`는 두 요청 형태를 지원합니다.

- 상태 변경: `{ "status": "open" | "resolved" }`
- 내용 수정: `source`, `lessonId`, `lessonTitle`, `command`, `reason`, `correction` 여섯 필드를 모두 포함한 JSON

내용 수정은 기존 note를 조회한 뒤 여섯 필드만 정규화해 저장하므로 식별자와 생성·복습 시각, 해결 상태를 보존합니다. 필드 검증 실패는 `400 invalid_mistake_note`, 없는 note는 `404 mistake_note_not_found`입니다. 서버 모드의 React 화면은 성공 응답으로 받은 note만 store에 upsert하고, 실패하면 기존 note와 편집 draft를 유지합니다.

The React store still owns mock-screen interaction state. The API adapter gives the same feature a server boundary so the storage can later move from in-memory data to SQLite/Supabase/PostgreSQL without changing the page-level flow first.
