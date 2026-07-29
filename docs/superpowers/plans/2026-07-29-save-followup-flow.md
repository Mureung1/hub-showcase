# 저장 완료 후 선택 입력 종료 흐름 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 선택 정보를 저장한 뒤 불필요한 건너뛰기 행동을 제거하고, 다음 저장 진입에서 새 저장 화면을 제공한다.

**Architecture:** `SavePage`는 선택 정보 저장 완료 여부에 따라 폼 행동의 노출과 활성 상태만 결정한다. `AuthenticatedWorkspace`는 화면 전환을 한 곳에서 처리하며, 완료된 저장 세션에 한해서 사용자가 저장 화면에 다시 들어올 때 상태를 초기화한다.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

## Task 1: 완료 상태 회귀 테스트 추가

**Files:**

- Modify: `src/app/authenticated_workspace.test.tsx:1400-1480`

- [ ] **Step 1: 기존 선택 정보 저장 테스트에 완료 상태 기대값 추가**

선택 정보를 저장한 직후 건너뛰기 버튼이 없고 변경 저장 버튼이 비활성화되는지 확인한다. 보관함을 확인한 뒤 저장 화면에 다시 들어오면 URL 입력과 선택 정보 화면이 초기화되는지도 같은 사용자 흐름에서 확인한다.

```tsx
expect(
  screen.queryByRole('button', { name: '지금은 건너뛰기' })
).toBeNull();
expect(
  screen.getByRole('button', { name: '변경 내용 저장하기' })
).toBeDisabled();

await user.click(screen.getByRole('button', { name: '보관함' }));
await user.click(screen.getByRole('button', { name: '저장' }));

expect(
  (screen.getByRole('textbox', { name: 'URL' }) as HTMLInputElement).value
).toBe('');
expect(
  screen.queryByRole('heading', { name: '언제 다시 쓰고 싶은가요?' })
).toBeNull();
```

- [ ] **Step 2: 대상 테스트만 실행해 실패 확인**

Run:

```bash
npx vitest run src/app/authenticated_workspace.test.tsx -t "saves optional personal context and shows it in the library immediately" --maxWorkers=1
```

Expected: `지금은 건너뛰기`가 남아 있거나 변경 저장 버튼이 활성화되어 실패한다.

## Task 2: 완료 상태 행동과 재진입 초기화 구현

**Files:**

- Modify: `src/pages/save/ui/save_page.tsx:260-288`
- Modify: `src/app/authenticated_workspace.tsx:386-458`
- Modify: `src/app/authenticated_workspace.tsx:492-588`

- [ ] **Step 1: 선택 정보 저장 직후 폼 행동 정리**

선택 정보 저장이 완료되면 저장 버튼을 비활성화하고 건너뛰기 버튼을 렌더링하지 않는다.

```tsx
<Button
  disabled={isContextSaving || contextSaveComplete}
  hierarchy="primary"
  loading={isContextSaving}
  size="medium"
  type="submit"
>
  {/* 기존 상태 문구 유지 */}
</Button>
{contextSaveComplete ? null : (
  <Button
    disabled={isContextSaving}
    hierarchy="secondary"
    onClick={onContextSkip}
    size="medium"
    type="button"
  >
    지금은 건너뛰기
  </Button>
)}
```

- [ ] **Step 2: 완료된 저장 화면의 재진입 상태 초기화**

전역 화면 변경 함수를 추가한다. 선택 정보 저장을 완료한 뒤 다른 화면에서 저장 화면으로 다시 들어올 때만 URL 초안과 완료 피드백을 초기화한다.

```tsx
function handleTabChange(tab: WorkspaceTab) {
  if (tab === 'save' && activeTab !== 'save' && contextSaveComplete) {
    saveDraftRevisionRef.current += 1;
    setSaveDraft({ source: 'web', url: '' });
    resetSaveFeedback();
  }

  setActiveTab(tab);
}
```

`AppNavigation`, `HomePage`, `LibraryPage`의 화면 이동 callback에서 직접 `setActiveTab`을 호출하지 않고 `handleTabChange`를 사용한다.

- [ ] **Step 3: 대상 테스트만 실행해 통과 확인**

Run:

```bash
npx vitest run src/app/authenticated_workspace.test.tsx -t "saves optional personal context and shows it in the library immediately" --maxWorkers=1
```

Expected: 1 test passed.

- [ ] **Step 4: 변경 파일 정적 검사**

Run:

```bash
npx eslint src/app/authenticated_workspace.tsx src/app/authenticated_workspace.test.tsx src/pages/save/ui/save_page.tsx
npx prettier --check src/app/authenticated_workspace.tsx src/app/authenticated_workspace.test.tsx src/pages/save/ui/save_page.tsx
```

Expected: 오류 없이 종료한다.

- [ ] **Step 5: 변경 사항 커밋**

```bash
git add src/app/authenticated_workspace.tsx src/app/authenticated_workspace.test.tsx src/pages/save/ui/save_page.tsx
git commit -m "fix: 인사이트 정보 저장 후 건너뛰기 제거와 새 저장 화면 초기화"
```
