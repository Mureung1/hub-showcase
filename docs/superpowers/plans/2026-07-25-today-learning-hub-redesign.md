# 오늘 학습 허브 재구성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/today` 페이지를 실데이터 기반 대시보드로 재구성하고, 목표 생성 플로우를 `/today/goal`로 분리한다.

**Architecture:** 기존 Zustand 스토어(`useLearningProgressStore`, `useMistakeNoteStore`)와 백엔드 SQLite 저장소에 `lastTestResult` 필드를 추가해 테스트 통과율을 실데이터로 영속화하고, 이를 기반으로 트랙(Git 시뮬레이터/React 실습/Docker) 진행률·취약개념 집계 유틸을 새로 만든 뒤 `TodayLearningHub.tsx`를 이 데이터로 재구성한다. 목표 생성 UI는 별도 페이지로 이동한다.

**Tech Stack:** React 19 + TypeScript, Zustand, React Router 8, Vite, Vitest, Express 5 백엔드 + `node:sqlite`.

## Global Constraints

- 새 UI는 `TodayLearningHub.module.css`에 이미 정의된 배경색·패널 구조(카드 배경, `panelTitleRow`, 그라디언트 톤)를 그대로 따른다 — 새 디자인 언어를 도입하지 않는다.
- 새 순수 로직에는 반드시 vitest 단위 테스트를 작성한다. 프런트는 `src/**/*.test.ts(x)`, 백엔드는 `backend/**/*.test.mjs` 컨벤션을 따른다.
- 새 의존성을 추가하지 않는다.
- 모든 변경 텍스트는 한국어로, 기존 파일의 어투(존댓말 없는 안내문)를 따른다.
- 각 태스크 종료 시 관련 테스트를 실행해 통과를 확인한다. 마지막 태스크에서 `npm run typecheck`와 `npm run test`(vitest run) 전체를 실행한다.

---

### Task 1: 백엔드 — 미션 진행 도메인에 `lastTestResult` 반영

**Files:**
- Modify: `backend/modules/learning-progress/domain/missionProgress.mjs`
- Modify: `backend/http/learningProgressRoutes.test.mjs`
- Test: `backend/modules/learning-progress/domain/missionProgress.test.mjs` (신규)

**Interfaces:**
- Produces: `createMissionProgress(missionId, input)`와 `normalizeMissionProgressInput(missionId, input)`가 반환하는 객체에 `lastTestResult: { passed: number, total: number, ranAt: string } | null` 필드가 추가된다. 이후 태스크(2)에서 이 필드를 SQLite에 저장한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/modules/learning-progress/domain/missionProgress.test.mjs` 신규 생성:

```js
import { describe, expect, it } from 'vitest'
import { createMissionProgress, normalizeMissionProgressInput } from './missionProgress.mjs'

describe('missionProgress domain', () => {
  it('normalizes a valid lastTestResult', () => {
    const progress = createMissionProgress('mission-1', {
      lastTestResult: { passed: 2, total: 3, ranAt: '2026-07-25T09:00:00.000Z' },
    })

    expect(progress.lastTestResult).toEqual({ passed: 2, total: 3, ranAt: '2026-07-25T09:00:00.000Z' })
  })

  it('drops an incomplete or missing lastTestResult', () => {
    expect(createMissionProgress('mission-1', {}).lastTestResult).toBeNull()
    expect(createMissionProgress('mission-1', { lastTestResult: { passed: 2 } }).lastTestResult).toBeNull()
  })

  it('passes lastTestResult through normalizeMissionProgressInput', () => {
    const progress = normalizeMissionProgressInput('mission-1', {
      runState: 'passed',
      lastTestResult: { passed: 3, total: 3, ranAt: '2026-07-25T09:00:00.000Z' },
    })

    expect(progress.lastTestResult).toEqual({ passed: 3, total: 3, ranAt: '2026-07-25T09:00:00.000Z' })
  })
})
```

- [ ] **Step 2: 테스트 실행 후 실패 확인**

Run: `npx vitest run backend/modules/learning-progress/domain/missionProgress.test.mjs`
Expected: FAIL (`lastTestResult` is `undefined`, not normalized)

- [ ] **Step 3: 도메인 함수 구현**

`backend/modules/learning-progress/domain/missionProgress.mjs`를 다음과 같이 수정 (기존 함수 본문 확장):

```js
export function createMissionProgress(missionId, input = {}) {
  return {
    missionId,
    runState: isLearningRunState(input.runState) ? input.runState : 'idle',
    runAttemptCount: normalizeNumber(input.runAttemptCount, 0),
    activeStepOffset: normalizeNumber(input.activeStepOffset, 0),
    completedAt: typeof input.completedAt === 'string' ? input.completedAt : null,
    activityLog: normalizeActivityLog(input.activityLog),
    lastTestResult: normalizeTestResult(input.lastTestResult),
  }
}

export function normalizeMissionProgressInput(missionId, input = {}) {
  return createMissionProgress(missionId, {
    runState: input.runState,
    runAttemptCount: input.runAttemptCount,
    activeStepOffset: input.activeStepOffset,
    completedAt: input.completedAt,
    activityLog: input.activityLog,
    lastTestResult: input.lastTestResult,
  })
}
```

같은 파일에 헬퍼 추가:

```js
function normalizeTestResult(value) {
  if (!value || typeof value !== 'object') return null

  const passed = normalizeNumber(value.passed, null)
  const total = normalizeNumber(value.total, null)
  const ranAt = typeof value.ranAt === 'string' ? value.ranAt : null

  if (passed === null || total === null || !ranAt) return null

  return { passed, total, ranAt }
}
```

- [ ] **Step 4: 테스트 실행 후 통과 확인**

Run: `npx vitest run backend/modules/learning-progress/domain/missionProgress.test.mjs`
Expected: PASS

- [ ] **Step 5: 라우트 테스트에 회귀 케이스 추가**

`backend/http/learningProgressRoutes.test.mjs`의 첫 번째 `it('saves and returns mission progress', ...)` 테스트에서 POST 바디에 `lastTestResult`를 추가하고 응답에 포함되는지 검증:

```js
bodyText: JSON.stringify({
  runState: 'passed',
  runAttemptCount: 2,
  activeStepOffset: 1,
  activityLog: [{ id: 'a1', time: '09:00', title: '실행 성공', detail: '테스트 통과' }],
  lastTestResult: { passed: 2, total: 3, ranAt: '2026-07-25T09:00:00.000Z' },
}),
```

그리고 `toMatchObject`의 `body.progress`에 `lastTestResult: { passed: 2, total: 3 }`를 추가.

Run: `npx vitest run backend/http/learningProgressRoutes.test.mjs`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add backend/modules/learning-progress/domain/missionProgress.mjs backend/modules/learning-progress/domain/missionProgress.test.mjs backend/http/learningProgressRoutes.test.mjs
git commit -m "feat(backend): normalize lastTestResult in mission progress domain"
```

---

### Task 2: 백엔드 — SQLite에 `lastTestResult` 영속화

**Files:**
- Modify: `backend/shared/sqliteDatabase.mjs`
- Modify: `backend/modules/learning-progress/adapters/sqliteLearningProgressRepository.mjs`
- Modify: `backend/modules/knowledge/adapters/sqliteRepositories.test.mjs`

**Interfaces:**
- Consumes: Task 1의 `createMissionProgress`가 반환하는 `progress.lastTestResult` (shape: `{passed, total, ranAt} | null`)
- Produces: `createSqliteLearningProgressRepository(database).saveMission(progress)` / `.listMissions()`가 `lastTestResult`를 왕복 저장·복원한다.

- [ ] **Step 1: 실패하는 테스트로 확장**

`backend/modules/knowledge/adapters/sqliteRepositories.test.mjs`의 `'persists learning progress with activity log JSON'` 테스트를 수정 — `saveMission` 입력에 `lastTestResult` 추가, `toMatchObject`에도 추가:

```js
repository.saveMission({
  missionId: 'mission-1',
  runState: 'passed',
  runAttemptCount: 2,
  activeStepOffset: 1,
  completedAt: '2026-07-20T10:00:00.000Z',
  activityLog: [{ id: 'a1', time: '10:00', title: 'Run passed', detail: 'All checks passed' }],
  lastTestResult: { passed: 2, total: 3, ranAt: '2026-07-20T10:00:00.000Z' },
})

expect(repository.listMissions()).toMatchObject({
  'mission-1': {
    runState: 'passed',
    runAttemptCount: 2,
    activeStepOffset: 1,
    activityLog: [{ id: 'a1', title: 'Run passed' }],
    lastTestResult: { passed: 2, total: 3, ranAt: '2026-07-20T10:00:00.000Z' },
  },
})
```

- [ ] **Step 2: 테스트 실행 후 실패 확인**

Run: `npx vitest run backend/modules/knowledge/adapters/sqliteRepositories.test.mjs`
Expected: FAIL (`lastTestResult`가 `undefined`)

- [ ] **Step 3: DDL에 컬럼 추가 (신규 DB + 기존 DB 마이그레이션)**

`backend/shared/sqliteDatabase.mjs`의 `initializeSqliteSchema`에서 `learning_progress` 테이블 정의에 컬럼 추가:

```js
CREATE TABLE IF NOT EXISTS learning_progress (
  mission_id TEXT PRIMARY KEY,
  run_state TEXT NOT NULL,
  run_attempt_count INTEGER NOT NULL,
  active_step_offset INTEGER NOT NULL,
  completed_at TEXT,
  activity_log_json TEXT NOT NULL,
  last_test_result_json TEXT,
  updated_at TEXT NOT NULL
);
```

`CREATE TABLE IF NOT EXISTS`는 이미 존재하는 로컬 DB 파일(`.icu/icu.sqlite`)에는 새 컬럼을 추가하지 않으므로, 같은 함수 안에 기존 DB를 위한 방어적 마이그레이션을 추가한다 (테이블 생성 SQL 실행 직후):

```js
try {
  database.exec('ALTER TABLE learning_progress ADD COLUMN last_test_result_json TEXT')
} catch {
  // Column already exists (fresh DB created with the DDL above, or already migrated).
}
```

- [ ] **Step 4: 리포지토리에서 컬럼 읽고 쓰기**

`backend/modules/learning-progress/adapters/sqliteLearningProgressRepository.mjs` 전체를 다음으로 교체:

```js
export function createSqliteLearningProgressRepository(database) {
  const listStatement = database.prepare('SELECT * FROM learning_progress ORDER BY updated_at DESC')
  const saveStatement = database.prepare(`
    INSERT INTO learning_progress (
      mission_id,
      run_state,
      run_attempt_count,
      active_step_offset,
      completed_at,
      activity_log_json,
      last_test_result_json,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(mission_id) DO UPDATE SET
      run_state = excluded.run_state,
      run_attempt_count = excluded.run_attempt_count,
      active_step_offset = excluded.active_step_offset,
      completed_at = excluded.completed_at,
      activity_log_json = excluded.activity_log_json,
      last_test_result_json = excluded.last_test_result_json,
      updated_at = excluded.updated_at
  `)
  const deleteStatement = database.prepare('DELETE FROM learning_progress WHERE mission_id = ?')
  const resetStatement = database.prepare('DELETE FROM learning_progress')

  return {
    listMissions() {
      return Object.fromEntries(listStatement.all().map((row) => [row.mission_id, mapMissionProgress(row)]))
    },
    saveMission(progress) {
      saveStatement.run(
        progress.missionId,
        progress.runState,
        progress.runAttemptCount,
        progress.activeStepOffset,
        progress.completedAt,
        JSON.stringify(progress.activityLog),
        progress.lastTestResult ? JSON.stringify(progress.lastTestResult) : null,
        new Date().toISOString(),
      )

      return progress
    },
    deleteMission(missionId) {
      deleteStatement.run(missionId)
    },
    reset() {
      resetStatement.run()
    },
  }
}

function mapMissionProgress(row) {
  return {
    missionId: row.mission_id,
    runState: row.run_state,
    runAttemptCount: row.run_attempt_count,
    activeStepOffset: row.active_step_offset,
    completedAt: row.completed_at,
    activityLog: parseJsonArray(row.activity_log_json),
    lastTestResult: parseJsonObject(row.last_test_result_json),
  }
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value)

    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function parseJsonObject(value) {
  if (!value) return null

  try {
    const parsed = JSON.parse(value)

    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}
```

- [ ] **Step 5: 테스트 실행 후 통과 확인**

Run: `npx vitest run backend/modules/knowledge/adapters/sqliteRepositories.test.mjs`
Expected: PASS

- [ ] **Step 6: 관련 백엔드 테스트 전체 실행**

Run: `npx vitest run backend`
Expected: PASS (모든 백엔드 테스트, 특히 `repositoryMode.test.mjs`, `server.test.mjs`가 깨지지 않는지 확인)

- [ ] **Step 7: 커밋**

```bash
git add backend/shared/sqliteDatabase.mjs backend/modules/learning-progress/adapters/sqliteLearningProgressRepository.mjs backend/modules/knowledge/adapters/sqliteRepositories.test.mjs
git commit -m "feat(backend): persist lastTestResult in sqlite learning progress repository"
```

---

### Task 3: 프런트 — `LearningMissionProgress`에 `lastTestResult` 추가

**Files:**
- Modify: `src/features/learning-progress/model/useLearningProgressStore.ts`
- Modify: `src/features/learning-progress/model/useLearningProgressStore.test.ts`
- Modify: `src/features/learning-progress/api/learningProgressClient.ts`

**Interfaces:**
- Produces: `export type LearningTestResult = { passed: number; total: number; ranAt: string }`. `LearningMissionProgress.lastTestResult: LearningTestResult | null`. `useLearningProgressStore.getState().recordRunResult(input)`의 `input`에 선택적 `lastTestResult?: LearningTestResult | null` 추가 — 생략 시 기존 값 유지, 전달 시 덮어씀.

- [ ] **Step 1: 실패하는 테스트로 확장**

`useLearningProgressStore.test.ts`의 `savedMission` 픽스처(4번째 줄 부근)에 필드 추가:

```ts
const savedMission: LearningMissionProgress = {
  missionId: 'generated-first-mission',
  runState: 'passed',
  runAttemptCount: 2,
  activeStepOffset: 1,
  completedAt: '2026-07-14T12:00:00.000Z',
  activityLog,
  lastTestResult: { passed: 2, total: 3, ranAt: '2026-07-14T11:59:00.000Z' },
}
```

그리고 새 테스트 케이스 추가 (파일 하단, `resetAllProgress` 테스트 앞):

```ts
it('stores lastTestResult from a run and keeps it on a later step advance without a new result', async () => {
  const localStorage = createLocalStorage()
  const useLearningProgressStore = await importStore(localStorage)

  useLearningProgressStore.getState().recordRunResult({
    missionId: 'counter-mission',
    runState: 'passed',
    runAttemptCount: 1,
    activeStepOffset: 1,
    activityLog,
    lastTestResult: { passed: 4, total: 4, ranAt: '2026-07-14T12:00:00.000Z' },
  })

  expect(
    useLearningProgressStore.getState().getMissionProgress('counter-mission')?.lastTestResult,
  ).toEqual({ passed: 4, total: 4, ranAt: '2026-07-14T12:00:00.000Z' })

  useLearningProgressStore.getState().recordRunResult({
    missionId: 'counter-mission',
    runState: 'passed',
    runAttemptCount: 1,
    activeStepOffset: 2,
    activityLog,
  })

  expect(
    useLearningProgressStore.getState().getMissionProgress('counter-mission')?.lastTestResult,
  ).toEqual({ passed: 4, total: 4, ranAt: '2026-07-14T12:00:00.000Z' })
})
```

- [ ] **Step 2: 테스트 실행 후 실패 확인**

Run: `npx vitest run src/features/learning-progress/model/useLearningProgressStore.test.ts`
Expected: FAIL (`toEqual` 불일치 — `lastTestResult` 필드 없음)

- [ ] **Step 3: 스토어 타입/로직 구현**

`useLearningProgressStore.ts` 수정. 타입 추가 (2번째 export 앞):

```ts
export type LearningTestResult = {
  passed: number
  total: number
  ranAt: string
}
```

`LearningMissionProgress`에 필드 추가:

```ts
export type LearningMissionProgress = {
  missionId: string
  runState: LearningRunState
  runAttemptCount: number
  activeStepOffset: number
  completedAt: string | null
  activityLog: LearningActivityItem[]
  lastTestResult: LearningTestResult | null
}
```

`MissionProgressInput`에 필드 추가:

```ts
type MissionProgressInput = {
  missionId: string
  runState: LearningRunState
  runAttemptCount: number
  activeStepOffset: number
  completedAt?: string | null
  activityLog: LearningActivityItem[]
  lastTestResult?: LearningTestResult | null
}
```

`createMissionProgress`에 정규화 추가:

```ts
function createMissionProgress(
  missionId: string,
  input: Partial<LearningMissionProgress> = {},
): LearningMissionProgress {
  return {
    missionId,
    runState: input.runState === 'failed' || input.runState === 'passed' ? input.runState : 'idle',
    runAttemptCount: Number.isFinite(input.runAttemptCount) ? input.runAttemptCount ?? 0 : 0,
    activeStepOffset: Number.isFinite(input.activeStepOffset) ? input.activeStepOffset ?? 0 : 0,
    completedAt: typeof input.completedAt === 'string' ? input.completedAt : null,
    activityLog: Array.isArray(input.activityLog) ? input.activityLog.slice(0, 5) : [],
    lastTestResult: normalizeTestResult(input.lastTestResult),
  }
}

function normalizeTestResult(value: unknown): LearningTestResult | null {
  if (!value || typeof value !== 'object') return null

  const record = value as Partial<LearningTestResult>
  const passed = typeof record.passed === 'number' && Number.isFinite(record.passed)
    ? Math.round(record.passed)
    : null
  const total = typeof record.total === 'number' && Number.isFinite(record.total)
    ? Math.round(record.total)
    : null
  const ranAt = typeof record.ranAt === 'string' ? record.ranAt : null

  if (passed === null || total === null || !ranAt) return null

  return { passed, total, ranAt }
}
```

`recordRunResult` 액션 수정 (destructure에 `lastTestResult` 추가, 저장 시 병합):

```ts
recordRunResult: ({
  missionId,
  runState,
  runAttemptCount,
  activeStepOffset,
  completedAt,
  activityLog,
  lastTestResult,
}) => {
  set((state) => {
    const current = state.missions[missionId]
    const nextMissions = {
      ...state.missions,
      [missionId]: createMissionProgress(missionId, {
        ...current,
        runState,
        runAttemptCount,
        activeStepOffset,
        completedAt: completedAt ?? current?.completedAt ?? null,
        activityLog,
        lastTestResult: lastTestResult ?? current?.lastTestResult ?? null,
      }),
    }

    persistProgress(nextMissions)

    return { missions: nextMissions }
  })
},
```

- [ ] **Step 4: 테스트 실행 후 통과 확인**

Run: `npx vitest run src/features/learning-progress/model/useLearningProgressStore.test.ts`
Expected: PASS

- [ ] **Step 5: API 클라이언트 타입 확장**

`src/features/learning-progress/api/learningProgressClient.ts` 수정:

```ts
import type { LearningMissionProgress, LearningRunState, LearningTestResult } from '../model/useLearningProgressStore'

export type SaveLearningProgressRequest = {
  runState: LearningRunState
  runAttemptCount: number
  activeStepOffset: number
  completedAt?: string | null
  activityLog: LearningMissionProgress['activityLog']
  lastTestResult?: LearningTestResult | null
}
```

- [ ] **Step 6: 타입체크**

Run: `npm run typecheck`
Expected: PASS (아직 `recordRunResult`/`saveMissionProgress` 호출부는 수정 전이므로, Task 4 이전엔 `LearningWorkspace.tsx`의 기존 호출은 `lastTestResult`가 선택 필드라 그대로 컴파일된다)

- [ ] **Step 7: 커밋**

```bash
git add src/features/learning-progress/model/useLearningProgressStore.ts src/features/learning-progress/model/useLearningProgressStore.test.ts src/features/learning-progress/api/learningProgressClient.ts
git commit -m "feat(frontend): add lastTestResult to learning mission progress store"
```

---

### Task 4: 프런트 — 워크스페이스에서 실제 테스트 결과 기록 + 재사용 헬퍼 export

**Files:**
- Modify: `src/features/learning-workspace/LearningWorkspace.tsx`
- Test: `src/features/learning-workspace/workspaceMissionPresentation.test.ts` (신규)

**Interfaces:**
- Consumes: Task 3의 `LearningTestResult`, `recordRunResult({ ..., lastTestResult })`
- Produces: `LearningWorkspace.tsx`에서 다음을 `export`한다 (Task 10에서 사용): `resolveWorkspaceMission(missionId, generatedPlan): WorkspaceMission`, `resolveActiveGeneratedStep(generatedPlan, activeStepOffset): GeneratedCurriculumStep | null`, `createActiveMissionPresentation(mission, activeGeneratedStep): WorkspaceMission`, `createWorkspaceEditorFiles(mission): WorkspaceEditorFile[]`, `type WorkspaceMission`, `type WorkspaceEditorFile`.

- [ ] **Step 1: 실패하는 테스트 작성 (재사용 헬퍼 계약 고정)**

`src/features/learning-workspace/workspaceMissionPresentation.test.ts` 신규 생성:

```ts
import { describe, expect, it } from 'vitest'
import { generatedMissionId } from './workspaceInteraction'
import {
  createActiveMissionPresentation,
  createWorkspaceEditorFiles,
  resolveActiveGeneratedStep,
  resolveWorkspaceMission,
} from './LearningWorkspace'
import { generateMockCurriculum } from '../curriculum/model/curriculumGenerator'

describe('workspace mission presentation helpers', () => {
  it('resolves the generated mission and its first editor file', () => {
    const plan = generateMockCurriculum('React 프론트엔드 개발자가 되고 싶어')
    const mission = resolveWorkspaceMission(generatedMissionId, plan)
    const activeStep = resolveActiveGeneratedStep(plan, 0)
    const activeMission = createActiveMissionPresentation(mission, activeStep)
    const files = createWorkspaceEditorFiles(activeMission)

    expect(mission.id).toBe(generatedMissionId)
    expect(activeMission.title).toBe(activeStep?.title)
    expect(files[0].value.length).toBeGreaterThan(0)
  })

  it('resolves a today-queue mission by id', () => {
    const plan = generateMockCurriculum('React 프론트엔드 개발자가 되고 싶어')
    const mission = resolveWorkspaceMission('counter-mission', plan)

    expect(mission.id).toBe('counter-mission')
    expect(mission.mode).toBe('react')
  })
})
```

- [ ] **Step 2: 테스트 실행 후 실패 확인**

Run: `npx vitest run src/features/learning-workspace/workspaceMissionPresentation.test.ts`
Expected: FAIL (`resolveWorkspaceMission` 등이 `LearningWorkspace.tsx`에서 export되지 않음)

- [ ] **Step 3: 헬퍼 함수/타입에 `export` 추가**

`LearningWorkspace.tsx`에서 다음 4개 함수 선언과 2개 타입 선언 앞에 `export`를 추가한다 (본문은 변경하지 않음):
- `type WorkspaceMission = {` → `export type WorkspaceMission = {` (52번째 줄 부근)
- `type WorkspaceEditorFile = {` → `export type WorkspaceEditorFile = {` (93번째 줄 부근)
- `function resolveWorkspaceMission(` → `export function resolveWorkspaceMission(` (201번째 줄 부근)
- `function createWorkspaceEditorFiles(` → `export function createWorkspaceEditorFiles(` (374번째 줄 부근)
- `function resolveActiveGeneratedStep(` → `export function resolveActiveGeneratedStep(` (438번째 줄 부근)
- `function createActiveMissionPresentation(` → `export function createActiveMissionPresentation(` (449번째 줄 부근)

- [ ] **Step 4: 테스트 실행 후 통과 확인**

Run: `npx vitest run src/features/learning-workspace/workspaceMissionPresentation.test.ts`
Expected: PASS

- [ ] **Step 5: 실제 테스트 실행 지점에서 `lastTestResult` 계산해 전달**

`LearningWorkspace.tsx`의 `handleRun` 함수 내부, 첫 번째 `recordRunResult` 호출 직전(성공/실패 공통 경로, 현재 811번째 줄 부근)에 테스트 결과 계산을 추가한다. `nextState`가 계산된 직후, `recordRunResult` 호출 전에 삽입:

```ts
      const nextTestCases = createTestCases(mission, nextState)
      const testResult = {
        passed: nextTestCases.filter((item) => item.state === 'passed').length,
        total: nextTestCases.length,
        ranAt: new Date().toISOString(),
      }

      recordRunResult({
        missionId: mission.id,
        runState: nextState,
        runAttemptCount: nextAttemptCount,
        activeStepOffset,
        activityLog: resultLog,
        lastTestResult: testResult,
      })
      syncMissionProgressToServer({
        missionId: mission.id,
        runState: nextState,
        runAttemptCount: nextAttemptCount,
        activeStepOffset,
        activityLog: resultLog,
        lastTestResult: testResult,
      })
```

두 번째 지점(타임아웃/렌더링 실패 catch 경로, 현재 862번째 줄 부근, `runState`는 항상 `'failed'`)에도 동일하게 추가:

```ts
        const nextTestCases = createTestCases(mission, 'failed')
        const testResult = {
          passed: nextTestCases.filter((item) => item.state === 'passed').length,
          total: nextTestCases.length,
          ranAt: new Date().toISOString(),
        }

        recordRunResult({
          missionId: mission.id,
          runState: 'failed',
          runAttemptCount: nextAttemptCount,
          activeStepOffset,
          activityLog: resultLog,
          lastTestResult: testResult,
        })
        syncMissionProgressToServer({
          missionId: mission.id,
          runState: 'failed',
          runAttemptCount: nextAttemptCount,
          activeStepOffset,
          activityLog: resultLog,
          lastTestResult: testResult,
        })
```

세 번째 지점(`handleAdvanceStep`, 현재 940번째 줄 부근, 새 실행 없이 완료 처리)은 수정하지 않는다 — `lastTestResult`를 생략하면 스토어가 기존 값을 유지한다(Task 3).

`syncMissionProgressToServer`의 파라미터 타입(718번째 줄 부근)에도 필드를 추가:

```ts
  function syncMissionProgressToServer(input: {
    missionId: string
    runState: LearningRunState
    runAttemptCount: number
    activeStepOffset: number
    completedAt?: string | null
    activityLog: LearningActivityItem[]
    lastTestResult?: LearningTestResult | null
  }) {
    if (!shouldUseServerApi()) {
      return
    }

    void saveMissionProgress(input.missionId, {
      runState: input.runState,
      runAttemptCount: input.runAttemptCount,
      activeStepOffset: input.activeStepOffset,
      completedAt: input.completedAt,
      activityLog: input.activityLog,
      lastTestResult: input.lastTestResult,
    })
      .then(({ progress }) => upsertMissionProgress(progress))
      .catch(() => recordServerSyncFailure(input.missionId, input.activeStepOffset))
  }
```

`LearningRunState` 옆에서 함께 import하던 것에 `LearningTestResult` 타입도 추가 (28번째 줄 부근 import):

```ts
import {
  useLearningProgressStore,
  type LearningActivityItem,
  type LearningRunState,
  type LearningTestResult,
} from '../learning-progress/model/useLearningProgressStore'
```

- [ ] **Step 6: 타입체크와 관련 테스트 실행**

Run: `npm run typecheck && npx vitest run src/features/learning-workspace`
Expected: PASS

- [ ] **Step 7: 브라우저로 수동 확인**

`/workspace?mission=counter-mission`에서 코드 실행 후, 브라우저 devtools에서 `localStorage.getItem('icu.learningProgress')`를 확인해 `lastTestResult`가 채워지는지 확인한다.

- [ ] **Step 8: 커밋**

```bash
git add src/features/learning-workspace/LearningWorkspace.tsx src/features/learning-workspace/workspaceMissionPresentation.test.ts
git commit -m "feat(frontend): record real test results and export mission presentation helpers"
```

---

### Task 5: 프런트 — 트랙 집계 유틸 (`trackStats.ts`)

**Files:**
- Create: `src/features/today-learning/model/trackStats.ts`
- Test: `src/features/today-learning/model/trackStats.test.ts`

**Interfaces:**
- Consumes: `LearningMissionProgress` (Task 3), `MistakeNote` (`src/features/mistake-notes/model/useMistakeNoteStore.ts`), `gitLabLevels.json` + `createPlayableLevels` (`src/features/git-lab/levels/gitLabCurriculumAdapter.ts`)
- Produces:
  - `type TrackStatus = 'in_progress' | 'completed' | 'not_started' | 'unavailable'`
  - `getTrackStatus(percent: number | null): TrackStatus`
  - `getGitLabTrackProgress(): { clearedCount: number; totalCount: number; percent: number }`
  - `formatTestResultLabel(result: LearningTestResult | null | undefined): string` (`"2 / 3"` 또는 `"아직 실행 안함"`)
  - `findTopWeakConcept(notes: MistakeNote[]): string | null`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/features/today-learning/model/trackStats.test.ts` 신규 생성:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MistakeNote } from '../../mistake-notes/model/useMistakeNoteStore'
import { formatTestResultLabel, findTopWeakConcept, getTrackStatus } from './trackStats'

function createMistakeNote(overrides: Partial<MistakeNote>): MistakeNote {
  return {
    id: 'note-1',
    source: 'workspace',
    lessonId: 'lesson-1',
    lessonTitle: 'state 업데이트',
    command: 'npm test',
    reason: '오답',
    correction: '정정',
    createdAt: '2026-07-20T09:00:00.000Z',
    reviewedAt: null,
    status: 'open',
    ...overrides,
  }
}

describe('trackStats', () => {
  it('classifies track status from a percent value', () => {
    expect(getTrackStatus(null)).toBe('unavailable')
    expect(getTrackStatus(0)).toBe('not_started')
    expect(getTrackStatus(45)).toBe('in_progress')
    expect(getTrackStatus(100)).toBe('completed')
  })

  it('formats a test result label', () => {
    expect(formatTestResultLabel(null)).toBe('아직 실행 안함')
    expect(formatTestResultLabel({ passed: 2, total: 3, ranAt: '2026-07-20T09:00:00.000Z' })).toBe('2 / 3')
  })

  it('finds the most frequent open lessonTitle across mistake notes', () => {
    const notes = [
      createMistakeNote({ id: 'a', lessonTitle: 'state 업데이트' }),
      createMistakeNote({ id: 'b', lessonTitle: 'state 업데이트' }),
      createMistakeNote({ id: 'c', lessonTitle: '이벤트 핸들러' }),
      createMistakeNote({ id: 'd', lessonTitle: '해결됨', status: 'resolved' }),
    ]

    expect(findTopWeakConcept(notes)).toBe('state 업데이트')
  })

  it('returns null when there are no open mistake notes', () => {
    expect(findTopWeakConcept([createMistakeNote({ status: 'resolved' })])).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트 실행 후 실패 확인**

Run: `npx vitest run src/features/today-learning/model/trackStats.test.ts`
Expected: FAIL (모듈이 존재하지 않음)

- [ ] **Step 3: 유틸 구현**

`src/features/today-learning/model/trackStats.ts` 신규 생성:

```ts
import levelsData from '../../git-lab/levels/gitLabLevels.json'
import { createPlayableLevels } from '../../git-lab/levels/gitLabCurriculumAdapter'
import type { MistakeNote } from '../../mistake-notes/model/useMistakeNoteStore'
import type { LearningTestResult } from '../../learning-progress/model/useLearningProgressStore'

export type TrackStatus = 'in_progress' | 'completed' | 'not_started' | 'unavailable'

const gitLabClearedLevelsStorageKey = 'icu:git-lab-cleared-levels'

export function getTrackStatus(percent: number | null): TrackStatus {
  if (percent === null) return 'unavailable'
  if (percent <= 0) return 'not_started'
  if (percent >= 100) return 'completed'

  return 'in_progress'
}

export function formatTestResultLabel(result: LearningTestResult | null | undefined): string {
  if (!result) return '아직 실행 안함'

  return `${result.passed} / ${result.total}`
}

export function getGitLabTrackProgress(): { clearedCount: number; totalCount: number; percent: number } {
  const playableLevelIds = new Set(createPlayableLevels(levelsData).map((level) => level.id))
  const totalCount = playableLevelIds.size
  const clearedCount = readClearedGitLabLevelIds().filter((id) => playableLevelIds.has(id)).length
  const percent = totalCount > 0 ? Math.round((clearedCount / totalCount) * 100) : 0

  return { clearedCount, totalCount, percent }
}

export function findTopWeakConcept(notes: MistakeNote[]): string | null {
  const counts = new Map<string, number>()

  for (const note of notes) {
    if (note.status !== 'open') continue
    counts.set(note.lessonTitle, (counts.get(note.lessonTitle) ?? 0) + 1)
  }

  let topTitle: string | null = null
  let topCount = 0

  for (const [title, count] of counts) {
    if (count > topCount) {
      topTitle = title
      topCount = count
    }
  }

  return topTitle
}

function readClearedGitLabLevelIds(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(gitLabClearedLevelsStorageKey)

    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}
```

- [ ] **Step 4: 테스트 실행 후 통과 확인**

Run: `npx vitest run src/features/today-learning/model/trackStats.test.ts`
Expected: PASS

- [ ] **Step 5: 타입체크**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add src/features/today-learning/model/trackStats.ts src/features/today-learning/model/trackStats.test.ts
git commit -m "feat(frontend): add track progress and weak-concept aggregation utils"
```

---

### Task 6: 프런트 — `ProgressBar` 컴포넌트

**Files:**
- Create: `src/features/today-learning/ProgressBar.tsx`
- Create: `src/features/today-learning/ProgressBar.module.css`
- Test: `src/features/today-learning/ProgressBar.test.tsx`

**Interfaces:**
- Produces: `<ProgressBar percent={number} label={string} />` — `percent`는 0-100로 clamp되고, `role="progressbar"`와 `aria-valuenow`/`aria-label`을 갖는다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/features/today-learning/ProgressBar.test.tsx` 신규 생성:

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('clamps percent into 0-100 and renders an accessible label', () => {
    const markup = renderToStaticMarkup(<ProgressBar percent={140} label="React 진행률 60퍼센트" />)

    expect(markup).toContain('role="progressbar"')
    expect(markup).toContain('aria-valuenow="100"')
    expect(markup).toContain('React 진행률 60퍼센트')
  })

  it('clamps a negative percent to 0', () => {
    const markup = renderToStaticMarkup(<ProgressBar percent={-10} label="진행률 0퍼센트" />)

    expect(markup).toContain('aria-valuenow="0"')
  })
})
```

- [ ] **Step 2: 테스트 실행 후 실패 확인**

Run: `npx vitest run src/features/today-learning/ProgressBar.test.tsx`
Expected: FAIL (모듈이 존재하지 않음)

- [ ] **Step 3: 컴포넌트 구현**

`src/features/today-learning/ProgressBar.tsx` 신규 생성:

```tsx
import styles from './ProgressBar.module.css'

type ProgressBarProps = {
  percent: number
  label: string
}

export function ProgressBar({ percent, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)))

  return (
    <div
      className={styles.track}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={styles.fill} style={{ width: `${clamped}%` }} />
    </div>
  )
}
```

`src/features/today-learning/ProgressBar.module.css` 신규 생성 (기존 `TodayLearningHub.module.css`의 톤을 따름):

```css
.track {
  width: 100%;
  height: 6px;
  border-radius: 9999px;
  background: #eef1f5;
  overflow: hidden;
}

.fill {
  height: 100%;
  border-radius: 9999px;
  background: #35c8f4;
  transition: width 0.2s ease;
}
```

- [ ] **Step 4: 테스트 실행 후 통과 확인**

Run: `npx vitest run src/features/today-learning/ProgressBar.test.tsx`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/features/today-learning/ProgressBar.tsx src/features/today-learning/ProgressBar.module.css src/features/today-learning/ProgressBar.test.tsx
git commit -m "feat(frontend): add reusable ProgressBar component"
```

---

### Task 7: 프런트 — 목표 생성 페이지 분리 (`/today/goal`)

**Files:**
- Create: `src/features/today-learning/TodayLearningGoalPage.tsx`
- Modify: `src/features/today-learning/index.ts` (있다면 export 추가 — 없으면 생성 불필요, `router.tsx`에서 직접 파일 경로로 import)
- Modify: `src/app/router.tsx`

**Interfaces:**
- Produces: `export function TodayLearningGoalPage()` — 목표 생성 완료 시 `/today`로 `navigate`.

- [ ] **Step 1: `index.ts` 확인**

`src/features/today-learning/index.ts`를 읽어 `TodayLearningHub`가 어떻게 export되는지 확인한다. 같은 패턴으로 `TodayLearningGoalPage`도 추가할 수 있도록 구조를 파악한다 (barrel export 파일이면 항목 추가, 없으면 `router.tsx`에서 상대 경로로 직접 import).

- [ ] **Step 2: 페이지 컴포넌트 작성**

`src/features/today-learning/TodayLearningGoalPage.tsx` 신규 생성 — `TodayLearningHub.tsx`의 커리큘럼 생성 관련 상태·로직·JSX(현재 34-36번째 줄의 `CurriculumMode`/`GenerationStatus` 타입, 37번째 줄 `defaultCareerGoal`, 53-57번째 줄 `docsCurriculum`, 131-346번째 줄의 관련 훅·상태·`startCurriculumGeneration`/`handleGenerateCurriculum`/`handleFollowUpSubmit`/`handleResetGeneratedCurriculum` 함수, 404-589번째 줄의 `curriculumPanel` JSX)를 그대로 옮긴다. `TodayLearningHub.module.css`를 그대로 import해 동일한 스타일을 재사용한다 (Task 8에서 원본 파일에선 이 섹션을 제거하지만 CSS 클래스 정의는 남겨둔다). 완료 후 `/today`로 이동하는 버튼과 상단에 `/today`로 돌아가는 링크를 추가한다:

```tsx
import { type FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { shouldUseServerApi } from '../../app/icuApiMode'
import {
  createFallbackCurriculumPlan,
  recommendCurriculum,
  saveGeneratedCurriculumApi,
  resetGeneratedCurriculumApi,
} from '../curriculum/api/curriculumClient'
import { useLearningProfileStore } from '../profile/model/useLearningProfileStore'
import {
  resolveGeneratedCurriculumPlan,
  useGeneratedCurriculumStore,
} from '../curriculum/model/useGeneratedCurriculumStore'
import { CurriculumLoading } from './CurriculumLoading'
import styles from './TodayLearningHub.module.css'

type CurriculumMode = 'docs' | 'ai'
type GenerationStatus = 'idle' | 'generating' | 'ready'

const defaultCareerGoal = 'DEVOPS 엔지니어가 되고 싶어'

const docsCurriculum = [
  { title: 'React 공식 문서', detail: 'State: A Component Memory', progress: '62%' },
  { title: '이벤트 처리', detail: 'Responding to Events', progress: '38%' },
  { title: 'Counter.jsx 실습', detail: 'state와 onClick 연결', progress: '진행' },
]

function formatGeneratedAt(value: string | undefined) {
  if (!value) return '아직 저장 전'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '저장 시각 확인 필요'

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function TodayLearningGoalPage() {
  const navigate = useNavigate()
  const { profile } = useLearningProfileStore()
  const generatedCurriculum = useGeneratedCurriculumStore((state) => state.generatedCurriculum)
  const saveGeneratedCurriculum = useGeneratedCurriculumStore((state) => state.saveGeneratedCurriculum)
  const resetGeneratedCurriculum = useGeneratedCurriculumStore((state) => state.resetGeneratedCurriculum)
  const profileGoal = profile?.learningGoal ?? defaultCareerGoal
  const fallbackGeneratedPlan = useMemo(() => createFallbackCurriculumPlan(profileGoal), [profileGoal])
  const generatedPlan = useMemo(
    () => resolveGeneratedCurriculumPlan(generatedCurriculum, fallbackGeneratedPlan),
    [fallbackGeneratedPlan, generatedCurriculum],
  )
  const [curriculumMode, setCurriculumMode] = useState<CurriculumMode>('ai')
  const [careerGoal, setCareerGoal] = useState(generatedCurriculum?.goal ?? profileGoal)
  const [followUpText, setFollowUpText] = useState('')
  const [goalError, setGoalError] = useState('')
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('ready')
  const savedGoal = generatedCurriculum?.goal ?? generatedPlan.goal
  const isGoalDraftChanged = careerGoal.trim().length > 0 && careerGoal.trim() !== savedGoal
  const isGenerating = generationStatus === 'generating'
  const generatedAtLabel = formatGeneratedAt(generatedCurriculum?.generatedAt)
  const generatedStateLabel = generatedCurriculum ? '최근 생성한 커리큘럼' : '프로필 기준 기본 커리큘럼'

  function startCurriculumGeneration(goal: string, followUpInstruction?: string) {
    const trimmedGoal = goal.trim()
    const trimmedFollowUp = followUpInstruction?.trim()

    if (!trimmedGoal) {
      setGoalError('목표를 입력하면 AI가 학습 순서를 제안합니다.')
      setGenerationStatus('idle')
      return
    }

    setGoalError('')
    setGenerationStatus('generating')

    void recommendCurriculum(
      { goal: trimmedGoal, followUpInstruction: trimmedFollowUp || undefined, previousPlan: generatedCurriculum?.plan },
      { mode: shouldUseServerApi() ? 'server' : 'mock' },
    )
      .then(({ plan }) => {
        setCareerGoal(trimmedGoal)
        saveGeneratedCurriculum(trimmedGoal, plan)
        if (shouldUseServerApi()) {
          void saveGeneratedCurriculumApi(
            { goal: trimmedGoal, plan, generatedAt: new Date().toISOString() },
            { mode: 'server' },
          ).catch(() => {})
        }
        setGenerationStatus('ready')
      })
      .catch(() => {
        setGoalError('커리큘럼을 생성하지 못했습니다. 잠시 후 다시 시도해보세요.')
        setGenerationStatus('idle')
      })
  }

  function handleGenerateCurriculum(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startCurriculumGeneration(careerGoal)
  }

  function handleFollowUpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!followUpText.trim()) return
    startCurriculumGeneration(careerGoal, followUpText)
    setFollowUpText('')
  }

  function handleResetGeneratedCurriculum() {
    resetGeneratedCurriculum()
    if (shouldUseServerApi()) {
      void resetGeneratedCurriculumApi({ mode: 'server' }).catch(() => {})
    }
    setCareerGoal(profileGoal)
    setGoalError('')
    setGenerationStatus('ready')
  }

  return (
    <main className={styles.page} aria-labelledby="today-goal-title">
      <section className={styles.content}>
        <header className={styles.topbar}>
          <div>
            <h1 id="today-goal-title">새 목표 만들기</h1>
            <p>목표를 입력하면 코듀가 학습 순서를 제안합니다.</p>
          </div>
          <Link className={styles.profileLink} to="/today">
            오늘 학습으로 돌아가기
          </Link>
        </header>

        <section className={styles.curriculumPanel} aria-labelledby="curriculum-title">
          <div className={styles.panelTitleRow}>
            <div>
              <h2 id="curriculum-title">커리큘럼 만들기</h2>
              <p>문서를 따라가거나, 목표를 입력해 코듀가 학습 순서를 짜게 합니다.</p>
            </div>
            <div className={styles.tabs} role="tablist" aria-label="커리큘럼 작성 방식">
              <button
                type="button"
                role="tab"
                aria-selected={curriculumMode === 'docs'}
                className={curriculumMode === 'docs' ? styles.activeTab : undefined}
                onClick={() => setCurriculumMode('docs')}
              >
                문서 기반
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={curriculumMode === 'ai'}
                className={curriculumMode === 'ai' ? styles.activeTab : undefined}
                onClick={() => setCurriculumMode('ai')}
              >
                AI 커리큘럼 작성하기
              </button>
              <Link to="/curriculum/history" className={styles.historyTabLink}>
                보관함 관리
              </Link>
            </div>
          </div>

          {curriculumMode === 'docs' ? (
            <div className={styles.docsCurriculum} role="tabpanel">
              {docsCurriculum.map((item) => (
                <article key={item.title}>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.detail}</p>
                  </div>
                  <strong>{item.progress}</strong>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.aiCurriculum} role="tabpanel" aria-busy={generationStatus === 'generating'}>
              <form className={styles.goalInputRow} onSubmit={handleGenerateCurriculum}>
                <label>
                  <span>되고 싶은 목표</span>
                  <input
                    value={careerGoal}
                    aria-invalid={Boolean(goalError)}
                    aria-describedby={goalError ? 'curriculum-goal-error' : undefined}
                    onChange={(event) => setCareerGoal(event.target.value)}
                  />
                </label>
                <button type="submit" disabled={generationStatus === 'generating'}>
                  {generationStatus === 'generating' ? '작성 중' : '코듀로 작성'}
                </button>
              </form>
              {goalError ? (
                <p className={styles.validationMessage} id="curriculum-goal-error">
                  {goalError}
                </p>
              ) : null}
              {generationStatus === 'generating' ? (
                <CurriculumLoading />
              ) : (
                <>
                  <section className={styles.generatedSummary} aria-label="최근 생성한 커리큘럼">
                    <div>
                      <span>{generatedStateLabel}</span>
                      <strong>{generatedPlan.title}</strong>
                      <p>
                        {generatedAtLabel} · {generatedPlan.todayMission.fileName}
                      </p>
                    </div>
                    <div className={styles.generatedActions}>
                      <button
                        type="button"
                        className={styles.generatedStartLink}
                        onClick={() => navigate('/today')}
                      >
                        오늘 학습으로 이동
                      </button>
                      {isGoalDraftChanged ? (
                        <span className={styles.pendingNotice}>입력한 목표가 아직 적용되지 않았습니다.</span>
                      ) : null}
                      <button type="button" onClick={() => startCurriculumGeneration(careerGoal)}>
                        다시 생성
                      </button>
                      <button type="button" disabled={!generatedCurriculum} onClick={handleResetGeneratedCurriculum}>
                        초기화
                      </button>
                    </div>
                  </section>
                  <div className={styles.followUpSection}>
                    <div className={styles.quickChips} aria-label="추천 후속 질문">
                      <button type="button" onClick={() => startCurriculumGeneration(careerGoal, '3주 커리큘럼으로 수정해줘')}>
                        3주 코스로 변경
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          startCurriculumGeneration(careerGoal, '어제 공부한 내용에 이어서 다음 단계를 추천해줘')
                        }
                      >
                        어제 내용 이어서
                      </button>
                      <button type="button" onClick={() => startCurriculumGeneration(careerGoal, '실습 30분 위주로 구성해줘')}>
                        실습 중심 구성
                      </button>
                    </div>
                    <form className={styles.followUpRow} onSubmit={handleFollowUpSubmit}>
                      <input
                        type="text"
                        placeholder="후속 요청 입력 (예: 3주 과정으로 수정, 어제 내용 이어서)"
                        value={followUpText}
                        onChange={(event) => setFollowUpText(event.target.value)}
                      />
                      <button type="submit" disabled={isGenerating || !followUpText.trim()}>
                        {isGenerating ? '수정 중' : '후속 요청'}
                      </button>
                    </form>
                  </div>
                  <div className={styles.aiPlanHeader} data-status={generationStatus}>
                    <strong>{generatedPlan.title}</strong>
                    <span>{generatedPlan.summary}</span>
                    <small>
                      {generatedPlan.estimatedDuration} / {generatedPlan.focusRole}
                    </small>
                  </div>
                  <ol className={styles.aiPlanList}>
                    {generatedPlan.steps.map((item, index) => (
                      <li key={item.id}>
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.detail}</p>
                          <small>
                            {item.durationLabel} · {item.outcome}
                          </small>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className={styles.sourceList} aria-label="추천 문서">
                    {generatedPlan.sources.map((source) => (
                      <article key={source.title}>
                        <strong>{source.title}</strong>
                        <span>{source.urlLabel}</span>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  )
}
```

- [ ] **Step 3: 라우트 추가**

`src/app/router.tsx`에 import와 라우트 항목 추가:

```tsx
import { TodayLearningGoalPage } from '../features/today-learning/TodayLearningGoalPage'
```

`/today` 라우트 객체 바로 다음에 추가:

```tsx
      {
        path: '/today/goal',
        element: <TodayLearningGoalPage />,
      },
```

- [ ] **Step 4: 타입체크**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: 브라우저로 수동 확인**

`npm run dev`로 개발 서버를 띄우고 `/today/goal`에 접속해 목표 입력 → 생성 → "오늘 학습으로 이동" 클릭 시 `/today`로 이동하는지 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add src/features/today-learning/TodayLearningGoalPage.tsx src/app/router.tsx
git commit -m "feat(frontend): extract goal generation flow into /today/goal page"
```

---

### Task 8: 프런트 — `TodayLearningHub`에서 커리큘럼 패널 제거, 새 목표 만들기 링크 추가

**Files:**
- Modify: `src/features/today-learning/TodayLearningHub.tsx`

**Interfaces:**
- Consumes: Task 7의 `/today/goal` 라우트

- [ ] **Step 1: 커리큘럼 패널 관련 코드 제거**

`TodayLearningHub.tsx`에서 다음을 제거한다:
- import 중 더 이상 쓰이지 않는 것: `recommendCurriculum`, `resetGeneratedCurriculumApi`, `saveGeneratedCurriculumApi`, `CurriculumLoading` import. **주의**: `createFallbackCurriculumPlan`과 `getGeneratedCurriculum`은 제거하지 않는다 — `createFallbackCurriculumPlan`은 `fallbackGeneratedPlan`/`generatedPlan` 계산에 계속 쓰이고(welcomeCard와 Task 10의 워크스페이스 미리보기가 `generatedPlan`에 의존), `getGeneratedCurriculum`은 서버 하이드레이션 `useEffect`에서 계속 쓰인다.
- 타입 `CurriculumMode`, `GenerationStatus`
- 상수 `docsCurriculum`
- 상태: `curriculumMode`, `careerGoal`, `followUpText`, `goalError`, `generationStatus`
- 파생값: `savedGoal`, `isGoalDraftChanged`, `isGenerating`, `generatedAtLabel`, `generatedStateLabel` (단, `generatedPlan`/`fallbackGeneratedPlan`은 `welcomeCard`와 워크스페이스 미리보기에서 계속 필요하므로 유지)
- 함수: `startCurriculumGeneration`, `handleGenerateCurriculum`, `handleFollowUpSubmit`, `handleResetGeneratedCurriculum`
- JSX: 404-589번째 줄의 `<section className={styles.curriculumPanel} ...>` 전체 블록

- [ ] **Step 2: 새 목표 만들기 링크 추가**

`topbar`(351-363번째 줄)에 링크 추가 — `profileLink` 앞에 배치:

```tsx
        <header className={styles.topbar}>
          <div>
            <h1 id="today-title">Dashboard</h1>
            <p>{todayLabel}</p>
          </div>
          <label className={styles.search}>
            <span aria-hidden="true">Search</span>
            <input type="search" placeholder="학습 검색" />
          </label>
          <Link className={styles.historyTabLink} to="/today/goal">
            새 목표 만들기
          </Link>
          <Link className={styles.profileLink} to="/profile">
            프로필 조정
          </Link>
        </header>
```

- [ ] **Step 3: 타입체크로 미사용 항목 확인**

Run: `npm run typecheck`
Expected: 처음엔 미사용 변수/import에 대한 오류가 날 수 있다. 오류가 가리키는 항목을 모두 제거한 뒤 다시 실행해 PASS를 확인한다.

- [ ] **Step 4: 브라우저로 수동 확인**

`/today`에서 커리큘럼 패널이 사라지고 "새 목표 만들기" 링크가 `/today/goal`로 이동하는지 확인한다. welcomeCard의 "학습 시작" 링크와 워크스페이스 관련 기능이 여전히 동작하는지 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add src/features/today-learning/TodayLearningHub.tsx
git commit -m "refactor(frontend): remove inline curriculum panel from today hub"
```

---

### Task 9: 프런트 — 미션 진행바 + React 실습 현황 카드

**Files:**
- Modify: `src/features/today-learning/TodayLearningHub.tsx`
- Modify: `src/features/today-learning/TodayLearningHub.module.css`

**Interfaces:**
- Consumes: `ProgressBar` (Task 6), `trackStats.formatTestResultLabel`/`findTopWeakConcept` (Task 5), `missionProgress` (기존 `useLearningProgressStore` 셀렉터), `mistakeNotes` (기존 `useMistakeNoteStore` 셀렉터)

- [ ] **Step 1: import 추가**

```tsx
import { ProgressBar } from './ProgressBar'
import { findTopWeakConcept, formatTestResultLabel } from './model/trackStats'
```

- [ ] **Step 2: 파생 데이터 계산**

컴포넌트 본문에 추가 (기존 `reviewMistakeItems` 계산부 근처):

```tsx
  const activeMissionId = displayQueue.find((item) => item.status === 'current')?.id ?? 'generated-first-mission'
  const activeMissionTestResult = missionProgress[activeMissionId]?.lastTestResult ?? null
  const topWeakConcept = useMemo(() => findTopWeakConcept(mistakeNotes), [mistakeNotes])
```

설계 문서 2.4절의 "진행 중인 미션이 없을 때" 빈 상태는 이 컴포넌트에서 별도로 구현하지 않는다 — `generatedPlan`이 항상 `fallbackGeneratedPlan`(프로필 목표 기반 기본 커리큘럼)으로 폴백하므로 `activeMissionId`가 비는 경우가 실제로 발생하지 않는다(기존 `welcomeCard`도 같은 이유로 빈 상태를 다루지 않는다). 테스트 미실행 빈 상태(`formatTestResultLabel`의 "아직 실행 안함")만 구현한다.

- [ ] **Step 3: 미션 카드에 진행바 추가**

`welcomeCard` 섹션(377-392번째 줄)의 `welcomeCopy` div 안, `학습 시작` 링크 앞에 추가:

```tsx
                <ProgressBar
                  percent={completionPercent}
                  label={`오늘 학습 진행률 ${completionPercent}퍼센트`}
                />
```

- [ ] **Step 4: React 실습 현황 카드 추가**

`statsGrid` 섹션(394-402번째 줄) 바로 다음에 새 섹션 삽입:

```tsx
            <section className={styles.trackStatusCard} aria-labelledby="track-status-title">
              <div className={styles.panelTitleRow}>
                <h2 id="track-status-title">React 실습 현황</h2>
              </div>
              <strong className={styles.trackStatusPercent}>{completionPercent}%</strong>
              <ProgressBar percent={completionPercent} label={`React 실습 진행률 ${completionPercent}퍼센트`} />
              <p className={styles.trackStatusTestResult}>
                테스트 통과: {formatTestResultLabel(activeMissionTestResult)}
              </p>
              {topWeakConcept ? (
                <p className={styles.trackStatusWeakConcept}>취약 개념 · {topWeakConcept}</p>
              ) : null}
            </section>
```

- [ ] **Step 5: CSS 추가**

`TodayLearningHub.module.css` 파일 끝에 추가 (기존 톤 재사용):

```css
.trackStatusCard {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 14px 28px rgb(15 23 42 / 8%);
}

.trackStatusPercent {
  display: block;
  margin: 8px 0;
  font-size: 28px;
  color: #07003d;
}

.trackStatusTestResult {
  margin: 10px 0 0;
  font-size: 13px;
  color: #667085;
}

.trackStatusWeakConcept {
  margin: 4px 0 0;
  font-size: 13px;
  color: #993c1d;
}
```

- [ ] **Step 6: 타입체크 및 수동 확인**

Run: `npm run typecheck`
Expected: PASS

브라우저에서 `/today`를 열어 진행바와 React 실습 현황 카드가 렌더링되는지, 미션 진행 후 값이 바뀌는지 확인한다.

- [ ] **Step 7: 커밋**

```bash
git add src/features/today-learning/TodayLearningHub.tsx src/features/today-learning/TodayLearningHub.module.css
git commit -m "feat(frontend): add mission progress bar and react track status card"
```

---

### Task 10: 프런트 — 워크스페이스 미리보기 + 테스트 결과 배너

**Files:**
- Modify: `src/features/today-learning/TodayLearningHub.tsx`
- Modify: `src/features/today-learning/TodayLearningHub.module.css`

**Interfaces:**
- Consumes: Task 4에서 export한 `resolveWorkspaceMission`, `resolveActiveGeneratedStep`, `createActiveMissionPresentation`, `createWorkspaceEditorFiles` (`../learning-workspace/LearningWorkspace`), `getInitialStepOffset` (`../learning-workspace/workspaceInteraction`)

- [ ] **Step 1: import 추가**

```tsx
import {
  createActiveMissionPresentation,
  createWorkspaceEditorFiles,
  resolveActiveGeneratedStep,
  resolveWorkspaceMission,
} from '../learning-workspace/LearningWorkspace'
import { getInitialStepOffset } from '../learning-workspace/workspaceInteraction'
```

- [ ] **Step 2: 미리보기 데이터 계산**

컴포넌트 본문에 추가 (Task 9의 `activeMissionId` 계산 다음):

```tsx
  const activeStepOffset =
    missionProgress[activeMissionId]?.activeStepOffset ?? getInitialStepOffset(activeMissionId)
  const previewMission = useMemo(
    () => resolveWorkspaceMission(activeMissionId, generatedPlan),
    [activeMissionId, generatedPlan],
  )
  const previewActiveStep = useMemo(
    () => resolveActiveGeneratedStep(generatedPlan, activeStepOffset),
    [activeStepOffset, generatedPlan],
  )
  const previewActiveMission = useMemo(
    () => createActiveMissionPresentation(previewMission, previewActiveStep),
    [previewActiveStep, previewMission],
  )
  const previewFile = useMemo(
    () => createWorkspaceEditorFiles(previewActiveMission)[0],
    [previewActiveMission],
  )
```

- [ ] **Step 3: 섹션 JSX 추가**

`analyticsGrid` 섹션(591-623번째 줄) 바로 다음에 새 섹션 삽입:

```tsx
            <section className={styles.workspacePreviewCard} aria-labelledby="workspace-preview-title">
              <div className={styles.panelTitleRow}>
                <h2 id="workspace-preview-title">학습 워크스페이스 미리보기</h2>
                <Link to={`/workspace?mission=${activeMissionId}`}>워크스페이스로 이동</Link>
              </div>
              <div className={styles.workspacePreviewGrid}>
                <div className={styles.workspacePreviewHint}>
                  <span>AI 힌트</span>
                  <p>{previewActiveMission.hint}</p>
                </div>
                <pre className={styles.workspacePreviewCode}>
                  <code>{previewFile?.value ?? ''}</code>
                </pre>
              </div>
              {activeMissionTestResult ? (
                <p className={styles.workspacePreviewBanner} data-passed={activeMissionTestResult.passed === activeMissionTestResult.total}>
                  {activeMissionTestResult.passed} / {activeMissionTestResult.total} 테스트 통과
                  {activeMissionTestResult.passed < activeMissionTestResult.total
                    ? ' · 아직 통과하지 못한 항목이 있습니다.'
                    : ''}
                </p>
              ) : (
                <p className={styles.workspacePreviewBanner} data-passed="false">
                  아직 실행한 테스트가 없습니다.
                </p>
              )}
            </section>
```

- [ ] **Step 4: CSS 추가**

`TodayLearningHub.module.css` 파일 끝에 추가:

```css
.workspacePreviewCard {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 14px 28px rgb(15 23 42 / 8%);
}

.workspacePreviewGrid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  margin-top: 12px;
}

.workspacePreviewHint {
  background: #eef5ff;
  border-radius: 8px;
  padding: 12px 14px;
}

.workspacePreviewHint span {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 900;
  color: #07003d;
}

.workspacePreviewHint p {
  margin: 0;
  font-size: 12px;
  color: #667085;
  line-height: 1.6;
}

.workspacePreviewCode {
  margin: 0;
  background: #f8fafc;
  color: #111827;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 11px;
  line-height: 1.6;
  overflow-x: auto;
}

.workspacePreviewBanner {
  margin: 12px 0 0;
  padding: 8px 12px;
  border: 1px solid #ff8a1c;
  border-radius: 8px;
  font-size: 12px;
  background: #ffffff;
  color: #c24c00;
}

.workspacePreviewBanner[data-passed='true'] {
  border-color: #eef1f5;
  background: #eef5ff;
  color: #07003d;
}
```

- [ ] **Step 5: 타입체크 및 수동 확인**

Run: `npm run typecheck`
Expected: PASS

브라우저에서 `/today`의 워크스페이스 미리보기가 현재 미션의 힌트/코드를 보여주는지, 테스트 실행 여부에 따라 배너가 바뀌는지 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add src/features/today-learning/TodayLearningHub.tsx src/features/today-learning/TodayLearningHub.module.css
git commit -m "feat(frontend): add real workspace preview and test result banner to today hub"
```

---

### Task 11: 프런트 — 학습 목록을 실데이터 3개 트랙(Git/React/Docker)으로 교체

**Files:**
- Modify: `src/features/today-learning/TodayLearningHub.tsx`
- Modify: `src/features/today-learning/TodayLearningHub.module.css`
- Modify: `src/features/today-learning/data/todayLearning.ts`

**Interfaces:**
- Consumes: `ProgressBar` (Task 6), `getTrackStatus`/`getGitLabTrackProgress`/`formatTestResultLabel` (Task 5)

- [ ] **Step 1: mock 트랙 데이터 제거**

`src/features/today-learning/data/todayLearning.ts`에서 `LearningTrackStatus`, `LearningTrackPreview`, `learningTracks`를 제거한다 (58-91번째 줄). 다른 export(`TodayQueueStatus`, `TodayQueueItem`, `todayQueue`, `ReviewSummaryItem`, `reviewSummaryItems`, `recentMistakes`)는 그대로 둔다.

- [ ] **Step 2: `TodayLearningHub.tsx`에서 관련 import/타입 정리**

`import { learningTracks, ..., type LearningTrackStatus, ... } from './data/todayLearning'`에서 `learningTracks`와 `LearningTrackStatus`를 제거한다. `trackStatusLabels` 상수(39-44번째 줄)를 제거하고 아래로 교체:

Task 9에서 이미 `import { findTopWeakConcept, formatTestResultLabel } from './model/trackStats'`를 추가했다면, 새 이름을 같은 import 문에 합친다 (`import { findTopWeakConcept, formatTestResultLabel, getGitLabTrackProgress, getTrackStatus, type TrackStatus } from './model/trackStats'`). 별도 파일 상태에서 이 태스크만 적용하는 경우 아래처럼 새로 추가한다:

```tsx
import { getGitLabTrackProgress, getTrackStatus, type TrackStatus } from './model/trackStats'

const trackStatusLabels: Record<TrackStatus, string> = {
  in_progress: '진행 중',
  completed: '완료',
  not_started: '시작 전',
  unavailable: '준비 중',
}
```

- [ ] **Step 3: 트랙 목록 계산**

컴포넌트 본문에 추가 (Task 9/10의 파생값들 근처):

```tsx
  const gitLabProgress = useMemo(() => getGitLabTrackProgress(), [])
  const trackRows = useMemo(
    () => [
      {
        id: 'git-lab',
        title: '깃 시뮬레이터',
        percent: gitLabProgress.percent,
        testResultLabel: `${gitLabProgress.percent}%`,
        actionLabel: '레벨 이어하기',
        actionHref: '/git-lab',
      },
      {
        id: 'react-practice',
        title: 'React 실습',
        percent: completionPercent,
        testResultLabel: formatTestResultLabel(activeMissionTestResult),
        actionLabel: '이어서 학습하기',
        actionHref: `/workspace?mission=${activeMissionId}`,
      },
      {
        id: 'docker-practice',
        title: 'Docker 실습',
        percent: null as number | null,
        testResultLabel: '준비 중',
        actionLabel: null,
        actionHref: null,
      },
    ],
    [activeMissionId, activeMissionTestResult, completionPercent, gitLabProgress.percent],
  )
```

- [ ] **Step 4: `trackSection` JSX 교체**

625-642번째 줄의 `trackSection` 블록 전체를 교체:

```tsx
            <section className={styles.trackSection} aria-labelledby="tracks-title">
              <div className={styles.panelTitleRow}>
                <h2 id="tracks-title">학습 목록</h2>
              </div>
              <div className={styles.trackTable} role="table" aria-label="트랙별 진행률과 테스트 통과율">
                <div className={styles.trackTableHeader} role="row">
                  <span role="columnheader">트랙</span>
                  <span role="columnheader">진행률</span>
                  <span role="columnheader">테스트 통과율</span>
                </div>
                {trackRows.map((track) => {
                  const status = getTrackStatus(track.percent)

                  return (
                    <div className={styles.trackTableRow} role="row" key={track.id} data-status={status}>
                      <div role="cell">
                        <span className={styles.trackTableStatus} data-status={status}>
                          {trackStatusLabels[status]}
                        </span>
                        <h3>{track.title}</h3>
                        {track.percent !== null ? (
                          <ProgressBar percent={track.percent} label={`${track.title} 진행률 ${track.percent}퍼센트`} />
                        ) : null}
                        {track.actionHref ? (
                          <Link to={track.actionHref}>{track.actionLabel}</Link>
                        ) : null}
                      </div>
                      <span role="cell">{track.percent !== null ? `${track.percent}%` : '준비 중'}</span>
                      <span role="cell">{track.testResultLabel}</span>
                    </div>
                  )
                })}
              </div>
            </section>
```

- [ ] **Step 5: CSS 추가**

`TodayLearningHub.module.css` 파일 끝에 추가:

```css
.trackTable {
  display: flex;
  flex-direction: column;
}

.trackTableHeader {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 90px 120px;
  gap: 12px;
  padding: 8px 0;
  font-size: 12px;
  color: #667085;
}

.trackTableRow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 90px 120px;
  gap: 12px;
  align-items: center;
  padding: 14px 0;
  border-top: 1px solid #eef1f5;
}

.trackTableRow h3 {
  margin: 6px 0 8px;
  font-size: 15px;
  color: #111827;
}

.trackTableRow a {
  display: inline-block;
  margin-top: 8px;
  font-size: 12px;
  color: #07003d;
  font-weight: 900;
  text-decoration: none;
}

.trackTableStatus {
  display: inline-flex;
  padding: 2px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 900;
  background: #eef5ff;
  color: #07003d;
}

.trackTableStatus[data-status='unavailable'] {
  background: #f8fafc;
  color: #667085;
}
```

- [ ] **Step 6: 타입체크 및 수동 확인**

Run: `npm run typecheck`
Expected: PASS

브라우저에서 `/today`의 학습 목록이 Git 시뮬레이터/React 실습/Docker 실습 3행으로 표시되는지, Docker 행이 "준비 중"으로 표시되는지, `/git-lab`에서 레벨을 클리어한 뒤 새로고침하면 Git 진행률이 바뀌는지 확인한다.

- [ ] **Step 7: 관련 테스트 전체 실행**

Run: `npx vitest run src/features/today-learning`
Expected: PASS (참조하는 유닛 테스트가 모두 통과 — `TodayLearningHub.tsx` 자체는 컴포넌트 테스트가 없으므로 이 태스크에서 새로 추가하지 않는다)

- [ ] **Step 8: 커밋**

```bash
git add src/features/today-learning/TodayLearningHub.tsx src/features/today-learning/TodayLearningHub.module.css src/features/today-learning/data/todayLearning.ts
git commit -m "feat(frontend): replace mock track list with real Git/React/Docker data"
```

---

### Task 12: 최종 검증

**Files:** 없음 (검증만 수행)

- [ ] **Step 1: 전체 테스트 스위트 실행**

Run: `npm run test`
Expected: PASS (백엔드 `.mjs` + 프런트 `.ts`/`.tsx` 전체)

- [ ] **Step 2: 타입체크**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: 린트**

Run: `npm run lint`
Expected: PASS (기존에 실패하던 규칙이 없었다면, 새로 추가한 파일도 통과해야 함)

- [ ] **Step 4: 브라우저 종단 확인**

`npm run dev:server`로 프런트+백엔드를 함께 띄우고:
1. `/today`에서 미션 진행바, React 실습 현황, 워크스페이스 미리보기, 학습 목록(Git/React/Docker) 렌더링 확인
2. `/today/goal`에서 목표 생성 후 `/today`로 정상 복귀 확인
3. `/workspace?mission=counter-mission`에서 코드 실행 후 `/today`로 돌아와 React 실습 테스트 통과율이 갱신되는지 확인
4. `/git-lab`에서 레벨 클리어 후 `/today`의 Git 시뮬레이터 진행률이 갱신되는지 확인
5. `ICU_REPOSITORY_MODE=sqlite npm run start`로 백엔드를 SQLite 모드로 띄우고 위 시나리오가 서버 재기동 후에도 유지되는지 확인 (선택 — 로컬에 sqlite 모드 설정이 되어 있는 경우)

- [ ] **Step 5: 커밋 없음 (검증 전용 태스크)**
