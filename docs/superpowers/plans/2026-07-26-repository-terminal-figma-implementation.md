# Repository 분석 터미널 Figma Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 작업실 PC에서 열리는 Repository 분석 UI를 Figma `1:2`의 게임 대화창 형태로 교체한다.

**Architecture:** `WorkspacePage`와 Phaser 이벤트 연결은 유지한다. `RepositoryTerminal`은 화면 overlay와 대화창 shell을 담당하고 `RepositoryAnalyzer`는 기존 입력·API·회고 상태를 재사용한다. Figma의 시각 규칙은 Tailwind 유틸리티와 기존 PtoP 토큰으로 표현한다.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Phaser 3, Node test runner

## Global Constraints

- API 호출은 기존 `RepositoryAnalyzer`에서만 수행한다.
- Phaser Scene은 React 모달이나 분석 API를 직접 호출하지 않는다.
- 외부 UI 라이브러리를 추가하지 않는다.
- 기존 Poppy 로컬 에셋을 사용하고 Figma 원격 에셋은 저장하지 않는다.
- 분석 완료 시 자동으로 결과 페이지로 전환하지 않는다.
- 모달 focus, Escape, backdrop click, reduced motion을 유지한다.

### Task 1: Figma 분석 터미널의 상태 계약 테스트

**Files:**
- Create: `apps/web/src/features/workspace/components/repositoryTerminalViewModel.test.ts`
- Create: `apps/web/src/features/workspace/components/repositoryTerminalViewModel.ts`

**Interfaces:**
- Produces: `getRepositoryTerminalStatus(status, hasResult)`와 `getRepositoryTerminalStatus`가 반환하는 `label`, `description`, `tone`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { getRepositoryTerminalStatus } from "./repositoryTerminalViewModel";

test("returns the Figma terminal copy for the idle state", () => {
  assert.deepEqual(getRepositoryTerminalStatus("idle", false), {
    label: "Repository를 분석해볼까?",
    description: "분석하고 싶은 GitHub 주소를 입력해 주세요.",
    tone: "idle",
  });
});

test("keeps analysis completion in the terminal until the user confirms", () => {
  assert.deepEqual(getRepositoryTerminalStatus("success", true), {
    label: "분석 준비가 끝났어요.",
    description: "회고를 마무리한 뒤 결과 확인하기를 눌러 주세요.",
    tone: "success",
  });
});

test("exposes an actionable error message without closing the terminal", () => {
  assert.deepEqual(getRepositoryTerminalStatus("error", false), {
    label: "분석을 시작할 수 없어요.",
    description: "입력값을 확인한 뒤 다시 시도해 주세요.",
    tone: "error",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace @ptop/web -- src/features/workspace/components/repositoryTerminalViewModel.test.ts`

Expected: FAIL because `repositoryTerminalViewModel.ts` and `getRepositoryTerminalStatus` do not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export type RepositoryTerminalTone = "idle" | "success" | "error";

export type RepositoryTerminalStatus = {
  label: string;
  description: string;
  tone: RepositoryTerminalTone;
};

export function getRepositoryTerminalStatus(
  status: "idle" | "loading" | "success" | "error",
  hasResult: boolean,
): RepositoryTerminalStatus {
  if (status === "loading") {
    return { label: "Repository를 살펴보고 있어요.", description: "참여자와 작업 흐름을 확인하는 중입니다.", tone: "idle" };
  }
  if (status === "success" && hasResult) {
    return { label: "분석 준비가 끝났어요.", description: "회고를 마무리한 뒤 결과 확인하기를 눌러 주세요.", tone: "success" };
  }
  if (status === "error") {
    return { label: "분석을 시작할 수 없어요.", description: "입력값을 확인한 뒤 다시 시도해 주세요.", tone: "error" };
  }
  return { label: "Repository를 분석해볼까?", description: "분석하고 싶은 GitHub 주소를 입력해 주세요.", tone: "idle" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace @ptop/web -- src/features/workspace/components/repositoryTerminalViewModel.test.ts`

Expected: PASS.

### Task 2: Figma 스타일 RepositoryTerminal UI 교체

**Files:**
- Modify: `apps/web/src/features/workspace/components/RepositoryTerminal.tsx`
- Modify: `apps/web/src/features/workspace/components/repositoryTerminalViewModel.ts`

**Interfaces:**
- Consumes: `RepositoryAnalyzer` existing props and `getRepositoryTerminalStatus`.
- Produces: Figma-styled modal with unchanged `onClose` and `onAnalysisComplete` behavior.

- [ ] **Step 1: Write the failing test**

Add to `repositoryTerminalViewModel.test.ts`:

```ts
test("uses a loading status that tells the user the terminal remains open", () => {
  assert.deepEqual(getRepositoryTerminalStatus("loading", false), {
    label: "Repository를 살펴보고 있어요.",
    description: "참여자와 작업 흐름을 확인하는 중입니다.",
    tone: "idle",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace @ptop/web -- src/features/workspace/components/repositoryTerminalViewModel.test.ts`

Expected: PASS if the state contract is already complete; if it fails, correct only the status mapping before UI edits.

- [ ] **Step 3: Write minimal implementation**

Replace only the terminal shell classes and copy. Preserve these existing behaviors:

```tsx
<div className="fixed inset-0 z-[80] grid place-items-center bg-[#050b12]/80 p-4 backdrop-blur-[2px]">
  <section className="w-full max-w-4xl border-4 border-[#2b3544] bg-[#091421] p-1 text-[#f2f5f7] shadow-2xl">
    <div className="border-2 border-[#2b3544] p-6 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
        <aside className="grid place-items-center gap-3">
          <img className="h-36 w-36 object-contain" src={mascotUrl} alt="포피" />
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#6bfb9a]">Poppy assistant</span>
        </aside>
        <div className="grid gap-6">
          <h2 className="text-2xl font-bold leading-[1.3] sm:text-3xl">Repository를 분석해볼까?</h2>
          <RepositoryAnalyzer onAnalysisComplete={onAnalysisComplete} />
        </div>
      </div>
    </div>
  </section>
</div>
```

The final implementation must use the actual `RepositoryAnalyzer` output inside the Figma shell rather than duplicate its form or API state.

- [ ] **Step 4: Run focused tests**

Run: `npm run test --workspace @ptop/web -- src/features/repository-analysis/repositoryAnalysis.test.ts src/features/repository-analysis/repositoryAnalysisApi.test.ts src/features/workspace/components/repositoryTerminalViewModel.test.ts`

Expected: PASS.

### Task 3: Responsive and accessibility verification

**Files:**
- Modify: `apps/web/src/features/workspace/components/RepositoryTerminal.tsx`

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck:web`

Expected: PASS with no TypeScript errors.

- [ ] **Step 2: Run production build**

Run: `npm run build:web`

Expected: PASS; the existing Phaser chunk size warning may remain.

- [ ] **Step 3: Check repository diff formatting**

Run: `git diff --check`

Expected: no output.

- [ ] **Step 4: Manually verify the user flow**

Run: `npm run dev:web`

Verify:

1. Open the workspace preview and approach the new-analysis PC.
2. Press `E`; the dark Figma-style terminal appears above the workspace.
3. Focus starts inside the dialog and `Escape` closes it.
4. While open, arrow keys do not move the player.
5. Submit a valid URL; loading and error states remain inside the same dialog.
6. On completion, the user can finish reflection and explicitly choose the result action.
7. At a narrow viewport, Poppy, text, inputs, and buttons remain visible without horizontal overflow.
