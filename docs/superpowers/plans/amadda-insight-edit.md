# 아맞다 인사이트 수정과 삭제 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 저장한 인사이트의 제목, 메모, 카테고리 연결을 수정하고, 잘못 저장한 인사이트를 삭제할 수 있게 한다.

**Architecture:** URL은 수정하지 않고, 수정 가능한 필드만 `src/insights/editInsight.ts` 유스케이스로 제한한다. 카테고리 연결은 기존 연결을 지운 뒤 새 연결을 삽입하는 방식으로 단순화하고, 삭제는 보관함 목록에서 즉시 반영한다.

**Tech Stack:** React 19, TypeScript, Supabase, Vitest, React Testing Library

---

## 범위

포함 범위:

- 인사이트 제목 수정
- 인사이트 메모 수정
- 인사이트 카테고리 연결 수정
- 하나의 인사이트에 여러 카테고리 지정
- URL 수정 불가
- 인사이트 삭제
- 삭제 전 확인 UI
- 삭제 후 보관함 목록 갱신

제외 범위:

- 인사이트 URL 수정
- 휴지통/복구
- 30일 복구 후 완전 삭제
- 별도 상세 화면 필수화

## 파일 구조

- Modify: `src/insights/insightQueries.ts`
  - 수정 가능한 필드 업데이트와 카테고리 연결 교체 함수를 추가한다.
- Create: `src/insights/editInsight.ts`
  - URL을 제외한 인사이트 수정 유스케이스를 만든다.
- Create: `src/insights/editInsight.test.ts`
  - 제목/메모 trim, URL 수정 금지, 카테고리 연결 교체를 검증한다.
- Create: `src/components/insights/InsightEditor.tsx`
  - 제목, 메모, 카테고리 선택, 삭제 확인 UI를 만든다.
- Create: `src/components/insights/InsightEditor.test.tsx`
  - 저장과 삭제 액션을 검증한다.
- Modify: `src/pages/LibraryPage.tsx`
  - 보관함 카드에서 편집 UI를 열고 저장/삭제 후 목록을 갱신한다.

---

### Task 1: 인사이트 수정 유스케이스 작성

**Files:**

- Create: `src/insights/editInsight.ts`
- Create: `src/insights/editInsight.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/insights/editInsight.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { editInsight } from './editInsight';

describe('editInsight', () => {
  it('updates title, memo, and category links without URL fields', async () => {
    const updateInsight = vi.fn().mockResolvedValue(undefined);
    const replaceCategories = vi.fn().mockResolvedValue(undefined);

    await editInsight({
      categoryIds: ['c1', 'c2'],
      insightId: 'insight-id',
      memo: ' 다시 볼 것 ',
      replaceCategories,
      title: ' React 문서 ',
      updateInsight,
      userId: 'user-id',
    });

    expect(updateInsight).toHaveBeenCalledWith('insight-id', {
      memo: '다시 볼 것',
      title: 'React 문서',
    });
    expect(replaceCategories).toHaveBeenCalledWith('user-id', 'insight-id', [
      'c1',
      'c2',
    ]);
  });

  it('stores empty memo as null', async () => {
    const updateInsight = vi.fn().mockResolvedValue(undefined);
    const replaceCategories = vi.fn().mockResolvedValue(undefined);

    await editInsight({
      categoryIds: [],
      insightId: 'insight-id',
      memo: '   ',
      replaceCategories,
      title: '제목',
      updateInsight,
      userId: 'user-id',
    });

    expect(updateInsight).toHaveBeenCalledWith('insight-id', {
      memo: null,
      title: '제목',
    });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
npm test -- src/insights/editInsight.test.ts
```

Expected:

```text
FAIL src/insights/editInsight.test.ts
Cannot find module './editInsight'
```

- [ ] **Step 3: 수정 유스케이스 구현**

Create `src/insights/editInsight.ts`:

```ts
type EditableInsightFields = {
  memo: string | null;
  title: string;
};

type EditInsightInput = {
  categoryIds: string[];
  insightId: string;
  memo: string;
  replaceCategories: (
    userId: string,
    insightId: string,
    categoryIds: string[]
  ) => Promise<void>;
  title: string;
  updateInsight: (
    insightId: string,
    fields: EditableInsightFields
  ) => Promise<void>;
  userId: string;
};

export async function editInsight({
  categoryIds,
  insightId,
  memo,
  replaceCategories,
  title,
  updateInsight,
  userId,
}: EditInsightInput) {
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    throw new Error('제목을 입력하세요.');
  }

  await updateInsight(insightId, {
    memo: memo.trim() || null,
    title: trimmedTitle,
  });
  await replaceCategories(userId, insightId, categoryIds);
}
```

- [ ] **Step 4: 테스트 확인**

Run:

```bash
npm test -- src/insights/editInsight.test.ts
```

Expected:

```text
2 passed
```

- [ ] **Step 5: 커밋**

Run:

```bash
git add src/insights/editInsight.ts src/insights/editInsight.test.ts
git commit -m "feat: 인사이트 수정 유스케이스 추가"
```

---

### Task 2: 인사이트 Repository 수정 함수 추가

**Files:**

- Modify: `src/insights/insightQueries.ts`

- [ ] **Step 1: 수정 함수 추가**

Add to `src/insights/insightQueries.ts`:

```ts
export async function updateInsightEditableFields(
  insightId: string,
  fields: { memo: string | null; title: string }
) {
  const { error } = await supabase
    .from('insights')
    .update(fields)
    .eq('id', insightId);

  if (error) {
    throw error;
  }
}

export async function replaceInsightCategories(
  userId: string,
  insightId: string,
  categoryIds: string[]
) {
  const deleteResult = await supabase
    .from('insight_categories')
    .delete()
    .eq('insight_id', insightId)
    .eq('user_id', userId);

  if (deleteResult.error) {
    throw deleteResult.error;
  }

  if (categoryIds.length === 0) {
    return;
  }

  const insertResult = await supabase.from('insight_categories').insert(
    categoryIds.map((categoryId) => ({
      category_id: categoryId,
      insight_id: insightId,
      user_id: userId,
    }))
  );

  if (insertResult.error) {
    throw insertResult.error;
  }
}
```

- [ ] **Step 2: 빌드 확인**

Run:

```bash
npm run build
```

Expected:

```text
✓ built in
```

- [ ] **Step 3: 커밋**

Run:

```bash
git add src/insights/insightQueries.ts
git commit -m "feat: 인사이트 수정 Repository 함수 추가"
```

---

### Task 3: 인사이트 편집 UI 작성

**Files:**

- Create: `src/components/insights/InsightEditor.tsx`
- Create: `src/components/insights/InsightEditor.test.tsx`

- [ ] **Step 1: 실패하는 UI 테스트 작성**

Create `src/components/insights/InsightEditor.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InsightEditor } from './InsightEditor';

describe('InsightEditor', () => {
  it('submits edited title and memo', async () => {
    const handleSave = vi.fn();
    const user = userEvent.setup();

    render(
      <InsightEditor
        categories={[]}
        insight={{
          categories: [],
          createdAt: '',
          domain: 'react.dev',
          id: 'i1',
          memo: '기존 메모',
          originalUrl: 'https://react.dev',
          thumbnailUrl: null,
          title: '기존 제목',
        }}
        onDelete={() => undefined}
        onSave={handleSave}
      />
    );

    await user.clear(screen.getByLabelText('제목'));
    await user.type(screen.getByLabelText('제목'), '새 제목');
    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(handleSave).toHaveBeenCalledWith({
      categoryIds: [],
      memo: '기존 메모',
      title: '새 제목',
    });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
npm test -- src/components/insights/InsightEditor.test.tsx
```

Expected:

```text
FAIL src/components/insights/InsightEditor.test.tsx
Cannot find module './InsightEditor'
```

- [ ] **Step 3: InsightEditor 구현**

Create `src/components/insights/InsightEditor.tsx`:

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TextInput } from '@/components/ui/TextInput';
import type { CategoryRow } from '@/types/database';
import type { InsightView } from '@/insights/insightView';

type InsightEditorProps = {
  categories: CategoryRow[];
  insight: InsightView;
  onDelete: () => void | Promise<void>;
  onSave: (input: {
    categoryIds: string[];
    memo: string;
    title: string;
  }) => void | Promise<void>;
};

export function InsightEditor({
  categories,
  insight,
  onDelete,
  onSave,
}: InsightEditorProps) {
  const [title, setTitle] = useState(insight.title);
  const [memo, setMemo] = useState(insight.memo ?? '');
  const [categoryIds, setCategoryIds] = useState(
    insight.categories.map((category) => category.id)
  );

  const toggleCategory = (categoryId: string) => {
    setCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId]
    );
  };

  return (
    <section className="insight-editor" aria-label="인사이트 편집">
      <TextInput
        label="제목"
        onChange={(event) => setTitle(event.target.value)}
        value={title}
      />
      <TextInput
        label="메모"
        onChange={(event) => setMemo(event.target.value)}
        value={memo}
      />
      <p className="field__helper">URL은 수정할 수 없습니다.</p>
      <div className="chip-row" aria-label="카테고리 선택">
        {categories.map((category) => (
          <Chip
            key={category.id}
            onClick={() => toggleCategory(category.id)}
            selected={categoryIds.includes(category.id)}
          >
            {category.name}
          </Chip>
        ))}
      </div>
      <Button onClick={() => void onSave({ categoryIds, memo, title })}>
        저장
      </Button>
      <Button
        onClick={() => {
          if (window.confirm('인사이트를 삭제할까요?')) {
            void onDelete();
          }
        }}
        variant="ghost"
      >
        삭제
      </Button>
    </section>
  );
}
```

- [ ] **Step 4: 테스트 확인**

Run:

```bash
npm test -- src/components/insights/InsightEditor.test.tsx
```

Expected:

```text
1 passed
```

- [ ] **Step 5: 커밋**

Run:

```bash
git add src/components/insights/InsightEditor.tsx src/components/insights/InsightEditor.test.tsx
git commit -m "feat: 인사이트 편집 UI 추가"
```

---

### Task 4: 보관함에 편집 흐름 연결

**Files:**

- Modify: `src/pages/LibraryPage.tsx`
- Modify: `src/components/ui/InsightCard.tsx`

- [ ] **Step 1: 카드에 편집 액션 추가**

Extend `InsightCardProps` in `src/components/ui/InsightCard.tsx`:

```tsx
onEdit?: () => void;
```

Render edit button next to the open action:

```tsx
{onEdit ? (
  <Button onClick={onEdit} variant="ghost">
    편집
  </Button>
) : null}
```

- [ ] **Step 2: 보관함 상태와 handler 추가**

Add to `src/pages/LibraryPage.tsx`:

```tsx
import { InsightEditor } from '@/components/insights/InsightEditor';
import { editInsight } from '@/insights/editInsight';
import {
  replaceInsightCategories,
  updateInsightEditableFields,
} from '@/insights/insightQueries';
```

Add state:

```tsx
const [editingInsight, setEditingInsight] = useState<InsightView | null>(null);
```

Add handlers:

```tsx
const refreshInsights = async () => {
  if (!userId) {
    return;
  }

  setInsights(await getMyInsights(userId));
};

const handleSaveInsight = async (input: {
  categoryIds: string[];
  memo: string;
  title: string;
}) => {
  if (!userId || !editingInsight) {
    return;
  }

  await editInsight({
    ...input,
    insightId: editingInsight.id,
    replaceCategories: replaceInsightCategories,
    updateInsight: updateInsightEditableFields,
    userId,
  });
  setEditingInsight(null);
  await refreshInsights();
};

const handleDeleteEditingInsight = async () => {
  if (!editingInsight) {
    return;
  }

  await deleteInsight(editingInsight.id);
  setEditingInsight(null);
  await refreshInsights();
};
```

- [ ] **Step 3: 카드와 편집 UI 연결**

Pass edit action to each card:

```tsx
onEdit={() => setEditingInsight(insight)}
```

Render editor below the list:

```tsx
{editingInsight ? (
  <InsightEditor
    categories={categories}
    insight={editingInsight}
    onDelete={handleDeleteEditingInsight}
    onSave={handleSaveInsight}
  />
) : null}
```

- [ ] **Step 4: 빌드 확인**

Run:

```bash
npm run build
```

Expected:

```text
✓ built in
```

- [ ] **Step 5: 커밋**

Run:

```bash
git add src/pages/LibraryPage.tsx src/components/ui/InsightCard.tsx
git commit -m "feat: 보관함 인사이트 편집 흐름 연결"
```

---

## Self-Review

**Spec coverage:**

- 제목, 메모, 카테고리 연결 수정이 포함된다.
- 하나의 인사이트에 여러 카테고리를 지정할 수 있다.
- URL 수정은 명시적으로 불가능하게 유지한다.
- 삭제 전 확인 UI와 삭제 후 목록 갱신을 포함한다.

**Placeholder scan:**

- 금지된 자리표시자 표현은 본문에 사용하지 않았다.
- 각 단계는 파일 경로, 코드, 실행 명령을 포함한다.

**Type consistency:**

- `InsightView`는 보관함 카드와 편집 UI에서 같은 타입으로 사용한다.
- 수정 가능한 필드는 `title`, `memo`, `categoryIds`로 제한되어 있다.

## Execution Handoff

계획 작성이 완료되었고 `docs/superpowers/plans/amadda-insight-edit.md`에 저장되었다. 실행 방식은 두 가지다.

**1. Subagent-Driven (recommended)** - 태스크마다 새 subagent를 투입하고, 각 태스크 사이에 리뷰하며 빠르게 반복한다.

**2. Inline Execution** - 현재 세션에서 `executing-plans` 방식으로 실행하고, 중간 체크포인트마다 검토한다.

어떤 방식으로 실행할지 선택한다.
