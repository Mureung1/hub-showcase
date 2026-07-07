# 아맞다 카테고리 관리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 카테고리를 생성, 수정, 삭제하고 보관함 필터에 즉시 반영할 수 있게 한다.

**Architecture:** 카테고리 이름 정규화는 `src/domain/category.ts`를 재사용한다. Supabase 작업은 `src/categories/categoryRepository.ts`에 모으고, 화면 조작은 `CategoryManager` 컴포넌트로 분리해 보관함 화면에 붙인다.

**Tech Stack:** React 19, TypeScript, Supabase, Vitest, React Testing Library

---

## 범위

포함 범위:

- 카테고리 목록 조회
- 카테고리 생성
- 카테고리 이름 수정
- 카테고리 삭제
- 카테고리 삭제 시 인사이트 유지
- 사용자별 카테고리 이름 중복 검증
- 색상 기본 배정
- 생성순 정렬
- `All`과 `미분류`는 실제 카테고리가 아니라 시스템 필터로 유지

제외 범위:

- 카테고리 직접 정렬 UI
- 이모지 기반 카테고리 꾸미기
- 협업 카테고리
- 카테고리 외 별도 분류 체계

## 파일 구조

- Modify: `src/categories/categoryRepository.ts`
  - 단일 카테고리 생성, 이름 수정, 삭제 함수를 추가한다.
- Create: `src/categories/categoryUseCases.ts`
  - 이름 검증과 중복 방지 유스케이스를 둔다.
- Create: `src/categories/categoryUseCases.test.ts`
  - 공백, 중복, 생성 payload를 검증한다.
- Create: `src/components/categories/CategoryManager.tsx`
  - 카테고리 생성/수정/삭제 UI를 만든다.
- Create: `src/components/categories/CategoryManager.test.tsx`
  - 생성 입력과 삭제 액션을 검증한다.
- Modify: `src/pages/LibraryPage.tsx`
  - 보관함 필터 영역에 카테고리 관리 진입점을 연결한다.

---

### Task 1: 카테고리 관리 유스케이스 작성

**Files:**

- Create: `src/categories/categoryUseCases.ts`
- Create: `src/categories/categoryUseCases.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/categories/categoryUseCases.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createCategoryForUser, renameCategoryForUser } from './categoryUseCases';

describe('category use cases', () => {
  it('creates a category with trimmed name and default color', async () => {
    const createCategory = vi.fn().mockResolvedValue({ id: 'category-id' });

    await createCategoryForUser({
      createCategory,
      existingNames: ['개발'],
      name: ' 디자인 ',
      nextSortOrder: 1,
      userId: 'user-id',
    });

    expect(createCategory).toHaveBeenCalledWith({
      color: '#2F6FDB',
      name: '디자인',
      sort_order: 1,
      user_id: 'user-id',
    });
  });

  it('rejects duplicate category names case-insensitively', async () => {
    const createCategory = vi.fn();

    await expect(
      createCategoryForUser({
        createCategory,
        existingNames: ['UI/UX'],
        name: ' ui/ux ',
        nextSortOrder: 0,
        userId: 'user-id',
      })
    ).rejects.toThrow('이미 존재하는 카테고리입니다.');
  });

  it('renames category with trimmed name', async () => {
    const updateCategoryName = vi.fn().mockResolvedValue(undefined);

    await renameCategoryForUser({
      categoryId: 'category-id',
      existingNames: ['개발'],
      name: ' 디자인 ',
      updateCategoryName,
    });

    expect(updateCategoryName).toHaveBeenCalledWith('category-id', '디자인');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
npm test -- src/categories/categoryUseCases.test.ts
```

Expected:

```text
FAIL src/categories/categoryUseCases.test.ts
Cannot find module './categoryUseCases'
```

- [ ] **Step 3: 유스케이스 구현**

Create `src/categories/categoryUseCases.ts`:

```ts
import { getDefaultCategoryColor, normalizeCategoryName } from '@/domain/category';
import type { CategoryInsert } from '@/types/database';

type CreateCategoryForUserInput = {
  createCategory: (input: CategoryInsert) => Promise<{ id: string }>;
  existingNames: string[];
  name: string;
  nextSortOrder: number;
  userId: string;
};

type RenameCategoryForUserInput = {
  categoryId: string;
  existingNames: string[];
  name: string;
  updateCategoryName: (categoryId: string, name: string) => Promise<void>;
};

function assertCategoryNameAvailable(name: string, existingNames: string[]) {
  const normalizedName = normalizeCategoryName(name);
  const duplicated = existingNames.some(
    (existingName) => normalizeCategoryName(existingName) === normalizedName
  );

  if (duplicated) {
    throw new Error('이미 존재하는 카테고리입니다.');
  }
}

function normalizeRequiredName(name: string) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error('카테고리 이름을 입력하세요.');
  }

  return trimmedName;
}

export async function createCategoryForUser({
  createCategory,
  existingNames,
  name,
  nextSortOrder,
  userId,
}: CreateCategoryForUserInput) {
  const trimmedName = normalizeRequiredName(name);
  assertCategoryNameAvailable(trimmedName, existingNames);

  return createCategory({
    color: getDefaultCategoryColor(nextSortOrder),
    name: trimmedName,
    sort_order: nextSortOrder,
    user_id: userId,
  });
}

export async function renameCategoryForUser({
  categoryId,
  existingNames,
  name,
  updateCategoryName,
}: RenameCategoryForUserInput) {
  const trimmedName = normalizeRequiredName(name);
  assertCategoryNameAvailable(trimmedName, existingNames);

  await updateCategoryName(categoryId, trimmedName);
}
```

- [ ] **Step 4: 테스트 확인**

Run:

```bash
npm test -- src/categories/categoryUseCases.test.ts
```

Expected:

```text
3 passed
```

- [ ] **Step 5: 커밋**

Run:

```bash
git add src/categories/categoryUseCases.ts src/categories/categoryUseCases.test.ts
git commit -m "feat: 카테고리 관리 유스케이스 추가"
```

---

### Task 2: 카테고리 Repository 확장

**Files:**

- Modify: `src/categories/categoryRepository.ts`

- [ ] **Step 1: Repository 함수 추가**

Modify `src/categories/categoryRepository.ts` by adding:

```ts
import type { CategoryInsert } from '@/types/database';

export async function createCategory(input: CategoryInsert) {
  const { data, error } = await supabase
    .from('categories')
    .insert(input)
    .select('id')
    .single<{ id: string }>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateCategoryName(categoryId: string, name: string) {
  const { error } = await supabase
    .from('categories')
    .update({ name })
    .eq('id', categoryId);

  if (error) {
    throw error;
  }
}

export async function deleteCategory(categoryId: string) {
  const { error } = await supabase.from('categories').delete().eq('id', categoryId);

  if (error) {
    throw error;
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
git add src/categories/categoryRepository.ts
git commit -m "feat: 카테고리 Repository 관리 함수 추가"
```

---

### Task 3: 카테고리 관리 UI 작성

**Files:**

- Create: `src/components/categories/CategoryManager.tsx`
- Create: `src/components/categories/CategoryManager.test.tsx`

- [ ] **Step 1: 실패하는 UI 테스트 작성**

Create `src/components/categories/CategoryManager.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CategoryManager } from './CategoryManager';

describe('CategoryManager', () => {
  it('submits a new category name', async () => {
    const handleCreate = vi.fn();
    const user = userEvent.setup();

    render(
      <CategoryManager
        categories={[]}
        onCreate={handleCreate}
        onDelete={() => undefined}
        onRename={() => undefined}
      />
    );

    await user.type(screen.getByLabelText('새 카테고리'), '디자인');
    await user.click(screen.getByRole('button', { name: '추가' }));

    expect(handleCreate).toHaveBeenCalledWith('디자인');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
npm test -- src/components/categories/CategoryManager.test.tsx
```

Expected:

```text
FAIL src/components/categories/CategoryManager.test.tsx
Cannot find module './CategoryManager'
```

- [ ] **Step 3: CategoryManager 구현**

Create `src/components/categories/CategoryManager.tsx`:

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import type { CategoryRow } from '@/types/database';

type CategoryManagerProps = {
  categories: CategoryRow[];
  onCreate: (name: string) => void | Promise<void>;
  onDelete: (categoryId: string) => void | Promise<void>;
  onRename: (categoryId: string, name: string) => void | Promise<void>;
};

export function CategoryManager({
  categories,
  onCreate,
  onDelete,
  onRename,
}: CategoryManagerProps) {
  const [newName, setNewName] = useState('');

  return (
    <section className="category-manager" aria-label="카테고리 관리">
      <div className="save-form">
        <TextInput
          label="새 카테고리"
          onChange={(event) => setNewName(event.target.value)}
          placeholder="예: UI/UX"
          value={newName}
        />
        <Button
          onClick={() => {
            void onCreate(newName);
            setNewName('');
          }}
        >
          추가
        </Button>
      </div>
      <ul className="category-manager__list">
        {categories.map((category) => (
          <li key={category.id}>
            <span>{category.name}</span>
            <Button
              onClick={() => {
                const nextName = window.prompt('카테고리 이름', category.name);

                if (nextName) {
                  void onRename(category.id, nextName);
                }
              }}
              variant="ghost"
            >
              수정
            </Button>
            <Button onClick={() => void onDelete(category.id)} variant="ghost">
              삭제
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: 테스트 확인**

Run:

```bash
npm test -- src/components/categories/CategoryManager.test.tsx
```

Expected:

```text
1 passed
```

- [ ] **Step 5: 커밋**

Run:

```bash
git add src/components/categories/CategoryManager.tsx src/components/categories/CategoryManager.test.tsx
git commit -m "feat: 카테고리 관리 UI 추가"
```

---

### Task 4: 보관함에 카테고리 관리 연결

**Files:**

- Modify: `src/pages/LibraryPage.tsx`

- [ ] **Step 1: 카테고리 관리 import 추가**

Modify imports in `src/pages/LibraryPage.tsx`:

```tsx
import { CategoryManager } from '@/components/categories/CategoryManager';
import {
  createCategory,
  deleteCategory,
  getMyCategories,
  updateCategoryName,
} from '@/categories/categoryRepository';
import {
  createCategoryForUser,
  renameCategoryForUser,
} from '@/categories/categoryUseCases';
```

- [ ] **Step 2: 카테고리 관리 handler 추가**

Add inside `LibraryPage`:

```tsx
const refreshCategories = async () => {
  if (!userId) {
    return;
  }

  setCategories(await getMyCategories(userId));
};

const handleCreateCategory = async (name: string) => {
  if (!userId) {
    return;
  }

  await createCategoryForUser({
    createCategory,
    existingNames: categories.map((category) => category.name),
    name,
    nextSortOrder: categories.length,
    userId,
  });
  await refreshCategories();
};

const handleRenameCategory = async (categoryId: string, name: string) => {
  await renameCategoryForUser({
    categoryId,
    existingNames: categories
      .filter((category) => category.id !== categoryId)
      .map((category) => category.name),
    name,
    updateCategoryName,
  });
  await refreshCategories();
};

const handleDeleteCategory = async (categoryId: string) => {
  await deleteCategory(categoryId);
  await refreshCategories();
};
```

- [ ] **Step 3: 필터 영역 아래에 관리 UI 추가**

Add below the category filter chip row:

```tsx
<CategoryManager
  categories={categories}
  onCreate={handleCreateCategory}
  onDelete={handleDeleteCategory}
  onRename={handleRenameCategory}
/>
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
git add src/pages/LibraryPage.tsx
git commit -m "feat: 보관함 카테고리 관리 연결"
```

---

## Self-Review

**Spec coverage:**

- 카테고리 생성, 이름 수정, 삭제를 포함한다.
- 삭제 시 인사이트는 유지되고 연결만 사라지는 데이터 모델 전제와 일치한다.
- `All`과 `미분류`는 실제 카테고리가 아니라 필터로 유지한다.
- 카테고리 직접 정렬 UI와 카테고리 외 별도 분류 체계는 제외 범위로 명시했다.

**Placeholder scan:**

- 금지된 자리표시자 표현은 본문에 사용하지 않았다.
- 각 단계는 파일 경로, 코드, 실행 명령을 포함한다.

**Type consistency:**

- `CategoryRow`, `CategoryInsert`, `CategoryFilter`의 역할이 분리되어 있다.
- `normalizeCategoryName`은 생성과 수정에서 같은 중복 판단 기준으로 사용된다.

## Execution Handoff

계획 작성이 완료되었고 `docs/superpowers/plans/amadda-category.md`에 저장되었다. 실행 방식은 두 가지다.

**1. Subagent-Driven (recommended)** - 태스크마다 새 subagent를 투입하고, 각 태스크 사이에 리뷰하며 빠르게 반복한다.

**2. Inline Execution** - 현재 세션에서 `executing-plans` 방식으로 실행하고, 중간 체크포인트마다 검토한다.

어떤 방식으로 실행할지 선택한다.
