# 아맞다 온보딩 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 최초 로그인 사용자가 관심 분야를 선택하거나 건너뛰고 시작할 수 있게 하고, 선택한 항목을 초기 카테고리로 생성한다.

**Architecture:** 온보딩은 `profiles.onboarding_completed`를 기준으로 한 번만 보여준다. 관심 분야 옵션과 완료 유스케이스는 `src/features/onboarding`에 두고, Supabase 읽기/쓰기 함수는 `src/entities/profile`과 `src/entities/category`에 분리한다.


**FSD note:** 파일 경로는 slice 내부 위치를 표기한다. 외부 import는 각 slice의 `index.ts` public API를 사용하며, 새 slice를 만들 때 필요한 `index.ts`도 함께 추가한다.

**Tech Stack:** React 19, TypeScript, Supabase, Vitest, React Testing Library

---

## 범위

포함 범위:

- 최초 로그인 여부 또는 온보딩 완료 여부 조회
- 관심 분야 기본 후보 목록
- 아무것도 선택하지 않고 시작
- 선택한 관심 분야를 카테고리로 생성
- 직접 카테고리 추가 입력
- 완료 후 홈 이동
- 완료한 사용자는 온보딩 미노출

제외 범위:

- 온보딩 다시 보기
- 추천 상황 개인화
- 카테고리 색상 커스터마이징
- 카테고리 정렬 UI

## 파일 구조

- Create: `src/entities/profile/api/profileRepository.ts`
  - 프로필 조회와 온보딩 완료 업데이트를 담당한다.
- Create: `src/entities/category/api/categoryRepository.ts`
  - 카테고리 생성과 목록 조회를 담당한다.
- Create: `src/features/onboarding/model/onboardingOptions.ts`
  - 기본 관심 분야 후보를 정의한다.
- Create: `src/features/onboarding/model/completeOnboarding.ts`
  - 선택 항목과 직접 입력을 카테고리로 만들고 프로필을 완료 처리한다.
- Create: `src/features/onboarding/model/completeOnboarding.test.ts`
  - 건너뛰기, 중복 제거, 직접 입력 처리를 검증한다.
- Create: `src/pages/onboarding/ui/OnboardingPage.tsx`
  - 온보딩 UI를 만든다.
- Create: `src/features/onboarding/ui/OnboardingGate.tsx`
  - 프로필 상태에 따라 온보딩과 앱 화면을 분기한다.
- Create: `src/features/onboarding/ui/OnboardingGate.test.tsx`
  - 온보딩 완료 여부 분기를 검증한다.
- Modify: `src/app/App.tsx`
  - 인증 이후 온보딩 게이트를 연결한다.

---

### Task 1: 온보딩 옵션과 완료 유스케이스 작성

**Files:**

- Create: `src/features/onboarding/model/onboardingOptions.ts`
- Create: `src/features/onboarding/model/completeOnboarding.ts`
- Create: `src/features/onboarding/model/completeOnboarding.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/features/onboarding/model/completeOnboarding.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { completeOnboarding } from './completeOnboarding';

describe('completeOnboarding', () => {
  it('creates categories from selected interests and custom names', async () => {
    const createCategories = vi.fn().mockResolvedValue(undefined);
    const markCompleted = vi.fn().mockResolvedValue(undefined);

    await completeOnboarding({
      createCategories,
      customCategoryNames: [' 팀프로젝트 ', 'UI/UX'],
      markCompleted,
      selectedInterestNames: ['개발', 'UI/UX'],
      userId: 'user-id',
    });

    expect(createCategories).toHaveBeenCalledWith('user-id', [
      '개발',
      'UI/UX',
      '팀프로젝트',
    ]);
    expect(markCompleted).toHaveBeenCalledWith('user-id');
  });

  it('allows users to skip category creation', async () => {
    const createCategories = vi.fn().mockResolvedValue(undefined);
    const markCompleted = vi.fn().mockResolvedValue(undefined);

    await completeOnboarding({
      createCategories,
      customCategoryNames: [],
      markCompleted,
      selectedInterestNames: [],
      userId: 'user-id',
    });

    expect(createCategories).not.toHaveBeenCalled();
    expect(markCompleted).toHaveBeenCalledWith('user-id');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
npm test -- src/features/onboarding/model/completeOnboarding.test.ts
```

Expected:

```text
FAIL src/features/onboarding/model/completeOnboarding.test.ts
Cannot find module './completeOnboarding'
```

- [ ] **Step 3: 관심 분야 옵션 작성**

Create `src/features/onboarding/model/onboardingOptions.ts`:

```ts
export const ONBOARDING_INTERESTS = [
  '개발',
  '디자인',
  '공부',
  '취업',
  '대외활동',
  '팀프로젝트',
  '포트폴리오',
  'UI/UX',
] as const;
```

- [ ] **Step 4: 온보딩 완료 유스케이스 구현**

Create `src/features/onboarding/model/completeOnboarding.ts`:

```ts
import { normalizeCategoryName } from '@/entities/category';

type CompleteOnboardingInput = {
  createCategories: (userId: string, names: string[]) => Promise<void>;
  customCategoryNames: string[];
  markCompleted: (userId: string) => Promise<void>;
  selectedInterestNames: string[];
  userId: string;
};

function mergeCategoryNames(names: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const name of names) {
    const trimmed = name.trim();
    const key = normalizeCategoryName(trimmed);

    if (!trimmed || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

export async function completeOnboarding({
  createCategories,
  customCategoryNames,
  markCompleted,
  selectedInterestNames,
  userId,
}: CompleteOnboardingInput) {
  const categoryNames = mergeCategoryNames([
    ...selectedInterestNames,
    ...customCategoryNames,
  ]);

  if (categoryNames.length > 0) {
    await createCategories(userId, categoryNames);
  }

  await markCompleted(userId);
}
```

- [ ] **Step 5: 테스트 확인**

Run:

```bash
npm test -- src/features/onboarding/model/completeOnboarding.test.ts
```

Expected:

```text
2 passed
```

- [ ] **Step 6: 커밋**

Run:

```bash
git add src/features/onboarding/model/onboardingOptions.ts src/features/onboarding/model/completeOnboarding.ts src/features/onboarding/model/completeOnboarding.test.ts
git commit -m "feat: 온보딩 완료 유스케이스 추가"
```

---

### Task 2: 프로필과 카테고리 Repository 작성

**Files:**

- Create: `src/entities/profile/api/profileRepository.ts`
- Create: `src/entities/category/api/categoryRepository.ts`

- [ ] **Step 1: 프로필 Repository 작성**

Create `src/entities/profile/api/profileRepository.ts`:

```ts
import { supabase } from '@/shared/api';
import type { ProfileRow } from '@/shared/api';

export async function getMyProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single<ProfileRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markOnboardingCompleted(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('id', userId);

  if (error) {
    throw error;
  }
}
```

- [ ] **Step 2: 카테고리 Repository 작성**

Create `src/entities/category/api/categoryRepository.ts`:

```ts
import { getDefaultCategoryColor } from '@/entities/category';
import { supabase } from '@/shared/api';
import type { CategoryRow } from '@/shared/api';

export async function getMyCategories(userId: string) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .returns<CategoryRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createCategories(userId: string, names: string[]) {
  const { error } = await supabase.from('categories').insert(
    names.map((name, index) => ({
      color: getDefaultCategoryColor(index),
      name,
      sort_order: index,
      user_id: userId,
    }))
  );

  if (error) {
    throw error;
  }
}
```

- [ ] **Step 3: 빌드 확인**

Run:

```bash
npm run build
```

Expected:

```text
✓ built in
```

- [ ] **Step 4: 커밋**

Run:

```bash
git add src/entities/profile/api/profileRepository.ts src/entities/category/api/categoryRepository.ts
git commit -m "feat: 프로필과 카테고리 Repository 추가"
```

---

### Task 3: 온보딩 화면과 게이트 작성

**Files:**

- Create: `src/pages/onboarding/ui/OnboardingPage.tsx`
- Create: `src/features/onboarding/ui/OnboardingGate.tsx`
- Create: `src/features/onboarding/ui/OnboardingGate.test.tsx`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: 온보딩 게이트 테스트 작성**

Create `src/features/onboarding/ui/OnboardingGate.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OnboardingGate } from './OnboardingGate';

describe('OnboardingGate', () => {
  it('renders onboarding page when profile is not completed', () => {
    render(
      <OnboardingGate
        profile={{
          avatar_url: null,
          created_at: '',
          display_name: '최재원',
          email: 'jaewon@example.com',
          id: 'user-id',
          onboarding_completed: false,
          updated_at: '',
        }}
      >
        <p>앱 화면</p>
      </OnboardingGate>
    );

    expect(screen.getByRole('heading', { name: '관심 분야 선택' })).toBeInTheDocument();
    expect(screen.queryByText('앱 화면')).not.toBeInTheDocument();
  });

  it('renders app when onboarding is completed', () => {
    render(
      <OnboardingGate
        profile={{
          avatar_url: null,
          created_at: '',
          display_name: '최재원',
          email: 'jaewon@example.com',
          id: 'user-id',
          onboarding_completed: true,
          updated_at: '',
        }}
      >
        <p>앱 화면</p>
      </OnboardingGate>
    );

    expect(screen.getByText('앱 화면')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
npm test -- src/features/onboarding/ui/OnboardingGate.test.tsx
```

Expected:

```text
FAIL src/features/onboarding/ui/OnboardingGate.test.tsx
Cannot find module './OnboardingGate'
```

- [ ] **Step 3: 온보딩 화면 구현**

Create `src/pages/onboarding/ui/OnboardingPage.tsx`:

```tsx
import { useState } from 'react';
import { Button } from '@/shared/ui';
import { Chip } from '@/shared/ui';
import { TextInput } from '@/shared/ui';
import { ONBOARDING_INTERESTS } from '@/features/onboarding';

type OnboardingPageProps = {
  onComplete: (selected: string[], custom: string[]) => Promise<void> | void;
};

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [customName, setCustomName] = useState('');

  const toggleInterest = (interest: string) => {
    setSelected((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest]
    );
  };

  const custom = customName.trim() ? [customName] : [];

  return (
    <main className="onboarding-page">
      <section className="save-panel">
        <p className="section-kicker">처음 설정</p>
        <h1>관심 분야 선택</h1>
        <p>선택한 항목은 초기 카테고리로 만들어집니다.</p>
        <div className="chip-row" aria-label="관심 분야">
          {ONBOARDING_INTERESTS.map((interest) => (
            <Chip
              key={interest}
              onClick={() => toggleInterest(interest)}
              selected={selected.includes(interest)}
            >
              {interest}
            </Chip>
          ))}
        </div>
        <div className="save-form">
          <TextInput
            label="직접 추가"
            onChange={(event) => setCustomName(event.target.value)}
            placeholder="예: 프론트엔드"
            value={customName}
          />
          <Button onClick={() => void onComplete(selected, custom)}>
            시작하기
          </Button>
          <Button onClick={() => void onComplete([], [])} variant="ghost">
            건너뛰기
          </Button>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: 온보딩 게이트 구현**

Create `src/features/onboarding/ui/OnboardingGate.tsx`:

```tsx
import { useState } from 'react';
import type { ReactNode } from 'react';
import { createCategories } from '@/entities/category';
import { markOnboardingCompleted } from '@/entities/profile';
import type { ProfileRow } from '@/shared/api';
import { OnboardingPage } from '@/pages/onboarding';
import { completeOnboarding } from './completeOnboarding';

type OnboardingGateProps = {
  children: ReactNode;
  onCompleted?: () => void;
  profile: ProfileRow;
};

export function OnboardingGate({
  children,
  onCompleted,
  profile,
}: OnboardingGateProps) {
  const [completed, setCompleted] = useState(profile.onboarding_completed);

  if (completed) {
    return <>{children}</>;
  }

  return (
    <OnboardingPage
      onComplete={async (selectedInterestNames, customCategoryNames) => {
        await completeOnboarding({
          createCategories,
          customCategoryNames,
          markCompleted: markOnboardingCompleted,
          selectedInterestNames,
          userId: profile.id,
        });
        setCompleted(true);
        onCompleted?.();
      }}
    />
  );
}
```

- [ ] **Step 5: App에 온보딩 게이트 연결**

Modify `AuthenticatedApp` in `src/app/App.tsx` to load profile:

```tsx
function AuthenticatedApp() {
  const [activeTab, setActiveTab] = useState<AppTab>(DEFAULT_APP_TAB);
  const { authState } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  useEffect(() => {
    if (authState.status !== 'signed-in') {
      return;
    }

    void getMyProfile(authState.user.id).then(setProfile);
  }, [authState]);

  if (authState.status !== 'signed-in' || !profile) {
    return <p className="loading-message">프로필을 불러오고 있습니다.</p>;
  }

  return (
    <OnboardingGate
      onCompleted={() =>
        setProfile((current) =>
          current ? { ...current, onboarding_completed: true } : current
        )
      }
      profile={profile}
    >
      <AppShell activeTab={activeTab} onTabChange={setActiveTab} user={authState.user}>
        {activeTab === 'library' ? <LibraryPage /> : null}
        {activeTab === 'home' ? <HomePage /> : null}
        {activeTab === 'save' ? <SavePage /> : null}
      </AppShell>
    </OnboardingGate>
  );
}
```

Add imports:

```ts
import { useEffect, useState } from 'react';
import { OnboardingGate } from '@/features/onboarding';
import { getMyProfile } from '@/entities/profile';
import type { ProfileRow } from '@/shared/api';
```

- [ ] **Step 6: 테스트와 빌드 확인**

Run:

```bash
npm test -- src/features/onboarding/ui/OnboardingGate.test.tsx
npm run build
```

Expected:

```text
2 passed
✓ built in
```

- [ ] **Step 7: 커밋**

Run:

```bash
git add src/pages/onboarding/ui/OnboardingPage.tsx src/features/onboarding/ui/OnboardingGate.tsx src/features/onboarding/ui/OnboardingGate.test.tsx src/app/App.tsx
git commit -m "feat: 최초 관심 분야 온보딩 구현"
```

---

## Self-Review

**Spec coverage:**

- 최초 1회 온보딩과 완료 여부 저장 흐름을 포함했다.
- 관심 분야 후보와 직접 입력을 모두 지원한다.
- 아무것도 선택하지 않고 시작할 수 있다.
- 선택한 관심 분야는 카테고리로 생성된다.

**Placeholder scan:**

- 금지된 자리표시자 표현은 본문에 사용하지 않았다.
- 테스트, 구현, 실행 명령을 모두 포함했다.

**Type consistency:**

- `ProfileRow.onboarding_completed`를 온보딩 분기 기준으로 일관되게 사용한다.
- 온보딩 완료 함수의 카테고리 생성 시그니처는 Repository 함수와 일치한다.

## Execution Handoff

계획 작성이 완료되었고 `docs/superpowers/plans/amadda-onboarding.md`에 저장되었다. 실행 방식은 두 가지다.

**1. Subagent-Driven (recommended)** - 태스크마다 새 subagent를 투입하고, 각 태스크 사이에 리뷰하며 빠르게 반복한다.

**2. Inline Execution** - 현재 세션에서 `executing-plans` 방식으로 실행하고, 중간 체크포인트마다 검토한다.

어떤 방식으로 실행할지 선택한다.
