# 오답노트 상세 모달 인라인 편집 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 오답노트 상세 모달을 새 오답 작성 화면과 같은 필드 구조로 정리하고, 자동 저장·수동 작성 여부와 관계없이 모달 안에서 모든 학습 내용을 안전하게 수정할 수 있게 한다.

**Architecture:** 작성·상세 화면이 하나의 typed form model과 공용 필드 컴포넌트를 사용한다. 상세 모달은 읽기/편집 상태와 draft를 로컬에서 관리하고, 저장은 기존 `PATCH /api/mistake-notes/:id`에 전체 내용 계약을 추가한다. 서버 모드에서는 응답으로 받은 note만 store에 반영하고, mock 모드에서는 기존 메타데이터를 보존한 note를 upsert한다.

**Tech Stack:** React 19, TypeScript, Zustand, CSS Modules, Express-style Node HTTP handlers, Vitest, Supabase repository adapter

## Global Constraints

- 엄격한 TDD 대신 `계약 우선 + 수직 슬라이스 + 위험 기반 검증`을 적용한다. 각 슬라이스 구현 직후 관련 테스트를 보강하고 실행한다.
- 편집 가능 필드는 `source`, `lessonTitle`, `lessonId`, `command`, `reason`, `correction`이다.
- `id`, `createdAt`, `reviewedAt`, `status`는 저장 과정에서 반드시 보존한다.
- 서버 모드에서 낙관적 업데이트나 localStorage fallback을 추가하지 않는다.
- 상태 변경, 삭제, 다시 풀기 동작은 기존 흐름을 유지한다.
- 새 의존성을 추가하지 않는다.
- `docs/issues/**`와 `.env`는 수정하거나 stage/commit하지 않는다.
- 구현 커밋 전에는 변경 파일과 핵심 내용을 사용자에게 먼저 보고한다.

---

## Task 1: 작성·편집 공용 폼 계약 추출

**Files:**

- Create: `src/features/mistake-notes/model/mistakeNoteForm.ts`
- Create: `src/features/mistake-notes/model/mistakeNoteForm.test.ts`
- Create: `src/features/mistake-notes/components/MistakeNoteFormFields.tsx`
- Create: `src/features/mistake-notes/components/MistakeNoteFormFields.module.css`
- Modify: `src/features/mistake-notes/AddMistakeNotePage.tsx`
- Modify: `src/features/mistake-notes/AddMistakeNotePage.module.css`

- [ ] **Step 1: 폼 값 변환·정규화 계약 구현**

`MistakeNoteInput`을 그대로 폼 값 타입으로 사용하고, 생성·편집 양쪽에서 쓰는 순수 함수를 만든다.

```ts
export const emptyMistakeNoteForm: MistakeNoteInput = {
  source: 'git-lab',
  lessonTitle: '',
  lessonId: '',
  command: '',
  reason: '',
  correction: '',
}

export function toMistakeNoteForm(note: MistakeNote): MistakeNoteInput
export function normalizeMistakeNoteForm(value: MistakeNoteInput): MistakeNoteInput
export function validateMistakeNoteForm(value: MistakeNoteInput): string | null
```

검증 문구와 source별 라벨·placeholder도 이 모듈로 옮겨 중복을 없앤다. `normalizeMistakeNoteForm`은 여섯 문자열을 trim하고 source는 그대로 보존한다.

- [ ] **Step 2: 폼 순수 함수의 위험 경계 테스트 추가**

`mistakeNoteForm.test.ts`에서 다음만 집중 검증한다.

- 기존 note에서 편집 가능한 여섯 필드만 draft로 복사
- 앞뒤 공백 정리
- source별 command 필수값 문구
- 각 필수값 누락 시 첫 번째 오류 반환

Run: `npm test -- src/features/mistake-notes/model/mistakeNoteForm.test.ts`

- [ ] **Step 3: 공용 필드 컴포넌트 구현**

```ts
type MistakeNoteFormFieldsProps = {
  formId: string
  value: MistakeNoteInput
  mode: 'read' | 'edit'
  disabled?: boolean
  onChange?: (next: MistakeNoteInput) => void
}
```

작성 화면과 동일한 순서로 출처, 레슨 이름·ID, 실패 내용, 실패 이유, 수정 힌트를 렌더링한다. `read`에서는 같은 카드/필드 계층을 유지하되 입력 불가능한 읽기 표현을 사용하고, `edit`에서는 기존 radio/input/textarea를 사용한다. 모든 label은 `formId` 기반으로 고유 연결한다.

- [ ] **Step 4: 새 오답 작성 페이지를 공용 폼으로 교체**

`AddMistakeNotePage.tsx`의 로컬 라벨 맵과 필드 JSX를 제거하고 `MistakeNoteFormFields`와 공용 validate/normalize를 사용한다. 중복 경고, submit 상태, 서버/로컬 저장 및 이동은 그대로 둔다. 공용 CSS로 이동한 스타일만 기존 CSS Module에서 제거한다.

Run: `npm run typecheck`

---

## Task 2: 백엔드 전체 내용 PATCH 계약 추가

**Files:**

- Modify: `backend/modules/mistake-notes/domain/mistakeNote.mjs`
- Modify: `backend/modules/mistake-notes/application/mistakeNoteService.mjs`
- Modify: `backend/http/mistakeNoteRoutes.mjs`
- Modify: `backend/http/mistakeNoteRoutes.test.mjs`

- [ ] **Step 1: 메타데이터 보존 도메인 함수 추가**

```js
export function updateMistakeNoteContent(note, input) {
  return { ...note, ...normalizeMistakeNoteInput(input) }
}
```

정규화된 여섯 필드만 덮어써 `id`, `createdAt`, `reviewedAt`, `status`를 보존한다.

- [ ] **Step 2: 조회 후 저장하는 application service 추가**

```js
export async function updateMistakeNote({ id, input, repository }) {
  const note = await repository.findById(id)
  if (!note) throw new Error('Mistake note not found')
  return await repository.save(updateMistakeNoteContent(note, input))
}
```

- [ ] **Step 3: PATCH body 형태로 상태 변경과 내용 수정을 분기**

`mistakeNoteRoutes.mjs`에서 body가 `{ status }` 계약이면 기존 상태 변경을 호출하고, 그 외에는 전체 내용 수정 서비스를 호출한다. 수정 요청에 `status`와 내용 필드가 섞인 모호한 body는 `400`으로 거절한다. 조회 대상이 없으면 상태·내용 수정 모두 `404 mistake_note_not_found`, 필드 검증 실패는 `400 invalid_mistake_note`로 응답한다.

- [ ] **Step 4: HTTP 계약 테스트 보강**

기존 create/list/status/delete 시나리오는 유지하고 다음을 추가한다.

- 전체 내용 PATCH가 여섯 필드를 변경
- `id`, 생성일, 복습일, 상태가 유지됨
- 빈 필드 또는 지원하지 않는 source는 400
- 없는 ID는 404
- 기존 `{ status }` PATCH는 계속 동작

Run: `npm test -- backend/http/mistakeNoteRoutes.test.mjs`

---

## Task 3: 프론트엔드 수정 API와 서버 응답 반영 경계 추가

**Files:**

- Modify: `src/features/mistake-notes/api/mistakeNoteClient.ts`
- Modify: `src/features/mistake-notes/api/mistakeNoteClient.test.ts`
- Modify: `src/features/mistake-notes/persistMistakeNoteMutation.ts`
- Modify: `src/features/mistake-notes/persistMistakeNoteMutation.test.ts`

- [ ] **Step 1: 전체 내용 수정 client 추가**

```ts
export async function updateMistakeNoteContent(
  id: string,
  request: MistakeNoteInput,
  fetchImpl: typeof fetch = fetch,
): Promise<MistakeNoteResponse>
```

`PATCH /api/mistake-notes/:id`, JSON content type, `MistakeNoteInput` 전체 body를 사용한다. 실패 응답은 기존 client처럼 status가 포함된 Error로 변환한다.

- [ ] **Step 2: client 계약 테스트 추가**

인코딩된 ID URL, PATCH method, header, 정확한 여섯 필드 body, 성공 응답 파싱, non-2xx throw를 검증한다.

Run: `npm test -- src/features/mistake-notes/api/mistakeNoteClient.test.ts`

- [ ] **Step 3: 서버 응답만 upsert하는 mutation helper 추가**

```ts
export async function updateServerMistakeNoteContent(
  id: string,
  input: MistakeNoteInput,
  options: {
    update: (id: string, input: MistakeNoteInput) => Promise<{ note: MistakeNote }>
    upsert: (note: MistakeNote) => unknown
  },
)
```

API 성공 후 응답 note를 upsert하고 반환한다. API 실패 시 upsert를 호출하지 않고 오류를 그대로 전파한다.

- [ ] **Step 4: mutation helper 성공·실패 테스트 추가**

Run: `npm test -- src/features/mistake-notes/persistMistakeNoteMutation.test.ts`

---

## Task 4: 상세 모달 읽기/편집 상태와 저장 UX 구현

**Files:**

- Modify: `src/features/mistake-notes/components/MistakeNoteDetailModal.tsx`
- Modify: `src/features/mistake-notes/components/MistakeNoteDetailModal.module.css`
- Create: `src/features/mistake-notes/components/MistakeNoteDetailModal.test.tsx`

- [ ] **Step 1: 모달 update 계약과 keyed content 구조 추가**

```ts
onUpdate: (note: MistakeNote, input: MistakeNoteInput) => boolean | Promise<boolean>
```

바깥 컴포넌트는 backdrop, body scroll lock, Escape를 담당하고, `key={note.id}`인 내부 content가 `mode`, `draft`, `error`, `saving`을 관리한다. note가 바뀌면 내부 상태가 새 note로 자연스럽게 초기화되게 하며 effect 안에서 draft를 동기화하지 않는다.

- [ ] **Step 2: 읽기 모드를 공용 필드 계층으로 교체**

기존 command/reason/correction 전용 카드를 `MistakeNoteFormFields mode="read"`로 바꾼다. 헤더 배지와 생성·복습 메타데이터는 유지한다. footer에 `수정` 버튼을 추가하고 기존 다시 풀기·상태·삭제·닫기 동작을 유지한다.

- [ ] **Step 3: 모달 내부 편집·취소·저장 구현**

- 수정: 현재 note에서 만든 draft로 edit mode 진입
- 변경: draft만 갱신하고 저장 오류 제거
- 취소: 서버 호출 없이 원본 note로 draft 복원 후 read mode
- 저장: 공용 validate 후 normalize된 input을 `onUpdate`로 전달
- 성공: read mode로 복귀
- 실패: draft와 edit mode 유지, `저장에 실패했습니다. 다시 시도해 주세요.` 표시
- 저장 중: 모든 필드와 취소·저장·닫기·backdrop·Escape를 비활성화해 중복 요청과 상태 유실 방지

- [ ] **Step 4: 모달 상호작용 위험 테스트 추가**

테스트 환경에 이미 쓰이는 React DOM 패턴을 재사용하여 다음을 검증한다.

- 읽기 → 수정 전환 시 여섯 필드 초기값
- 취소 시 원본 복구 및 update 미호출
- 유효한 저장 payload와 성공 후 읽기 모드
- validation 실패 시 update 미호출
- 저장 실패 시 draft와 오류 유지
- 저장 중 닫기·Escape·중복 저장 차단

Run: `npm test -- src/features/mistake-notes/components/MistakeNoteDetailModal.test.tsx`

---

## Task 5: 목록 페이지에서 mock/server 저장 흐름 연결

**Files:**

- Modify: `src/features/mistake-notes/MistakeNotesPage.tsx`
- Modify: `src/features/mistake-notes/model/useMistakeNoteStore.test.ts`

- [ ] **Step 1: 내용 수정 handler 구현**

```ts
async function handleUpdateMistake(note: MistakeNote, input: MistakeNoteInput) {
  setMutationError(null)

  if (!serverMode) {
    upsertMistakeNote({ ...note, ...input })
    return true
  }

  // pending ID 설정 → updateServerMistakeNoteContent → 성공 응답 upsert
}
```

서버 실패 시 `오답 내용을 저장하지 못했습니다. 입력한 내용은 그대로 유지되었습니다.`를 설정하고 false를 반환한다. 모달의 `isPending`과 `onUpdate`를 연결한다.

- [ ] **Step 2: mock metadata 보존 회귀 테스트 보강**

기존 store의 `upsertMistakeNote`로 내용을 수정했을 때 `id`, `createdAt`, `reviewedAt`, `status`가 유지되고 여섯 필드만 바뀌는 시나리오를 추가한다.

Run: `npm test -- src/features/mistake-notes/model/useMistakeNoteStore.test.ts`

- [ ] **Step 3: 변경된 출처·lesson ID 기반 다시 풀기 경로 확인**

저장 응답이 store에 반영되면 `selectedNote`가 같은 ID의 최신 객체로 재계산되고, 모달의 `createMistakeReviewPath(note)`도 변경된 source/lessonId를 사용하는지 모달 테스트에 회귀 케이스를 추가한다.

Run: `npm run typecheck`

---

## Task 6: 문서·전체 회귀·Supabase 왕복 검증

**Files:**

- Modify: `docs/features/mistake-notes.md`
- Modify: `scripts/supabase-smoke.mjs` only if the existing smoke cannot exercise mistake-note update safely

- [ ] **Step 1: 기능 문서 갱신**

상세 모달의 읽기/편집 전환, 편집 가능 필드, 메타데이터 보존, 전체 내용 PATCH body, 400/404, 실패 시 draft 보존을 기록한다. 계획·설계 문서 외 `docs/issues/**`는 건드리지 않는다.

- [ ] **Step 2: 변경 영역 검사**

Run:

```powershell
npm test -- backend/http/mistakeNoteRoutes.test.mjs src/features/mistake-notes
npm run typecheck
npm run lint
```

- [ ] **Step 3: 전체 회귀 검사**

Run:

```powershell
npm test
npm run build
```

- [ ] **Step 4: Supabase create → content PATCH → GET → DELETE 왕복 smoke**

기존 smoke가 같은 repository `save` 경로를 충분히 검증하면 해당 명령과 결과를 사용한다. 부족하면 임시 note를 생성하고 내용을 수정한 뒤 조회로 메타데이터 보존을 확인하고 즉시 삭제하는 진단을 추가한다. 테스트 데이터는 성공·실패 여부와 관계없이 정리한다.

Run: `npm run smoke:supabase`

- [ ] **Step 5: 최종 diff·작업 트리 범위 확인**

`git diff --check`, `git status -sb`, 변경 파일 목록을 확인해 Claude가 병합한 기존 변경과 `docs/issues/**`, `.env`가 포함되지 않았는지 검토한다. 커밋이나 push는 사용자의 별도 지시에 따른다.
