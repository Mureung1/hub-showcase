# 아맞다 P0 앱 셸 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 아맞다 MVP의 기본 앱 구조, 하단 탭 내비게이션, 핵심 화면 골격, 공통 UI 컴포넌트, 테스트 환경을 만든다.

**Architecture:** 이 계획은 Supabase 인증/DB를 붙이기 전 단계의 프론트엔드 앱 셸만 다룬다. `src/domain`에는 앱 탭 같은 화면 상태 모델을 두고, `src/app`은 전체 레이아웃을, `src/pages`는 홈/보관함/저장 화면 골격을, `src/components`는 재사용 UI를 담당한다.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, React Testing Library, Testing Library jest-dom, lucide-react

---

## 범위

이 문서는 `docs/checklist.md`의 `P0. 프로젝트 기반` 항목을 구현 가능한 작업 지시서로 바꾼다.

포함 범위:

- 앱 라우팅 대신 MVP 초기 단계에 맞는 탭 상태 기반 화면 전환
- 하단 탭 `보관함 / 홈 / 저장`
- 홈 탭을 가운데에 배치
- 상단 프로필 메뉴 진입점의 최소 UI
- 공통 버튼, 입력창, 카드, 칩 컴포넌트
- 데스크톱/태블릿/모바일에서 깨지지 않는 기본 레이아웃
- Vitest 기반 컴포넌트 테스트 환경

제외 범위:

- Supabase Auth
- Google OAuth
- 실제 DB 연동
- 인사이트 저장 API
- 검색/꺼내보기 추천 알고리즘
- Chrome Extension

## 파일 구조

- Modify: `package.json`
  - 테스트 스크립트와 UI 의존성을 추가한다.
- Create: `vitest.config.ts`
  - Vitest, jsdom, alias, React 플러그인을 설정한다.
- Modify: `tsconfig.node.json`
  - `vitest.config.ts`가 타입 체크 대상에 포함되도록 한다.
- Create: `src/test/setup.ts`
  - Testing Library jest-dom matcher를 Vitest에 연결한다.
- Create: `src/domain/navigation.ts`
  - 앱 탭 도메인 모델과 기본 탭을 정의한다.
- Create: `src/domain/navigation.test.ts`
  - 탭 순서와 기본 탭을 검증한다.
- Create: `src/components/ui/Button.tsx`
  - 공통 버튼 컴포넌트를 만든다.
- Create: `src/components/ui/TextInput.tsx`
  - 라벨이 있는 공통 입력 컴포넌트를 만든다.
- Create: `src/components/ui/Chip.tsx`
  - 카테고리/추천 상황에 쓸 칩 컴포넌트를 만든다.
- Create: `src/components/ui/InsightCard.tsx`
  - 인사이트 카드의 최소 표시 구조를 만든다.
- Create: `src/components/ui/ui.test.tsx`
  - 공통 UI의 접근성과 조건부 렌더링을 검증한다.
- Create: `src/components/navigation/BottomNavigation.tsx`
  - 하단 중앙 내비게이션을 만든다.
- Create: `src/components/navigation/BottomNavigation.test.tsx`
  - 탭 순서, 활성 상태, 클릭 동작을 검증한다.
- Create: `src/app/AppShell.tsx`
  - 상단 헤더, 본문, 하단 내비게이션을 조합한다.
- Create: `src/app/AppShell.test.tsx`
  - 앱 셸이 현재 탭 화면과 프로필 진입점을 렌더링하는지 검증한다.
- Create: `src/pages/HomePage.tsx`
  - 꺼내보기 중심의 홈 화면 골격을 만든다.
- Create: `src/pages/LibraryPage.tsx`
  - 보관함 화면 골격을 만든다.
- Create: `src/pages/SavePage.tsx`
  - 저장 화면 골격을 만든다.
- Modify: `src/App.tsx`
  - 기본 탭 상태와 화면 전환을 연결한다.
- Modify: `src/main.tsx`
  - 글로벌 스타일을 불러온다.
- Create: `src/styles/global.css`
  - 기본 색상, 레이아웃, 반응형 스타일을 정의한다.

---

### Task 1: 테스트 환경 구성

**Files:**

- Modify: `package.json`
- Create: `vitest.config.ts`
- Modify: `tsconfig.node.json`
- Create: `src/test/setup.ts`
- Create: `src/test/smoke.test.ts`

- [ ] **Step 1: 테스트와 UI 의존성 설치**

Run:

```bash
npm install lucide-react
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected:

```text
added ... packages
found 0 vulnerabilities
```

- [ ] **Step 2: `package.json` 스크립트 수정**

`package.json`의 `scripts`를 아래처럼 바꾼다.

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: Vitest 설정 파일 작성**

Create `vitest.config.ts`:

```ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: '@components',
        replacement: path.resolve(dirname, 'src/components'),
      },
      { find: '@', replacement: path.resolve(dirname, 'src') },
    ],
  },
  test: {
    css: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

- [ ] **Step 4: Node tsconfig 수정**

Modify `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ESNext",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "types": ["node"],
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 5: 테스트 setup 작성**

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 6: smoke test 작성**

Create `src/test/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('test environment', () => {
  it('runs a basic assertion', () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 7: 테스트 실행**

Run:

```bash
npm test -- src/test/smoke.test.ts
```

Expected:

```text
1 passed
```

- [ ] **Step 8: 빌드 실행**

Run:

```bash
npm run build
```

Expected:

```text
✓ built in
```

- [ ] **Step 9: 커밋**

Run:

```bash
git add package.json package-lock.json vitest.config.ts tsconfig.node.json src/test/setup.ts src/test/smoke.test.ts
git commit -m "test: Vitest 테스트 환경 설정"
```

---

### Task 2: 앱 탭 도메인 모델 작성

**Files:**

- Create: `src/domain/navigation.ts`
- Create: `src/domain/navigation.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/domain/navigation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  APP_TABS,
  DEFAULT_APP_TAB,
  getAppTabLabel,
  isAppTab,
} from './navigation';

describe('navigation domain', () => {
  it('keeps the bottom tab order as library, home, save', () => {
    expect(APP_TABS.map((tab) => tab.id)).toEqual(['library', 'home', 'save']);
  });

  it('uses home as the default tab', () => {
    expect(DEFAULT_APP_TAB).toBe('home');
  });

  it('checks whether a value is an app tab', () => {
    expect(isAppTab('library')).toBe(true);
    expect(isAppTab('home')).toBe(true);
    expect(isAppTab('save')).toBe(true);
    expect(isAppTab('more')).toBe(false);
  });

  it('returns the Korean label of an app tab', () => {
    expect(getAppTabLabel('library')).toBe('보관함');
    expect(getAppTabLabel('home')).toBe('홈');
    expect(getAppTabLabel('save')).toBe('저장');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
npm test -- src/domain/navigation.test.ts
```

Expected:

```text
FAIL src/domain/navigation.test.ts
Cannot find module './navigation'
```

- [ ] **Step 3: 최소 구현 작성**

Create `src/domain/navigation.ts`:

```ts
export type AppTab = 'library' | 'home' | 'save';

export type AppTabItem = {
  id: AppTab;
  label: string;
  description: string;
};

export const APP_TABS = [
  {
    id: 'library',
    label: '보관함',
    description: '저장한 인사이트를 탐색합니다.',
  },
  {
    id: 'home',
    label: '홈',
    description: '상황에 맞게 인사이트를 꺼내봅니다.',
  },
  {
    id: 'save',
    label: '저장',
    description: '새 인사이트를 저장합니다.',
  },
] as const satisfies readonly AppTabItem[];

export const DEFAULT_APP_TAB: AppTab = 'home';

export function isAppTab(value: string): value is AppTab {
  return APP_TABS.some((tab) => tab.id === value);
}

export function getAppTabLabel(tabId: AppTab): string {
  return APP_TABS.find((tab) => tab.id === tabId)?.label ?? '홈';
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run:

```bash
npm test -- src/domain/navigation.test.ts
```

Expected:

```text
4 passed
```

- [ ] **Step 5: 커밋**

Run:

```bash
git add src/domain/navigation.ts src/domain/navigation.test.ts
git commit -m "feat: 앱 탭 도메인 모델 추가"
```

---

### Task 3: 공통 UI 컴포넌트 작성

**Files:**

- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/TextInput.tsx`
- Create: `src/components/ui/Chip.tsx`
- Create: `src/components/ui/InsightCard.tsx`
- Create: `src/components/ui/ui.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/components/ui/ui.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { Chip } from './Chip';
import { InsightCard } from './InsightCard';
import { TextInput } from './TextInput';

describe('shared UI components', () => {
  it('renders a button with variant class and click handler', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button variant="primary" onClick={handleClick}>
        저장
      </Button>
    );

    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: '저장' })).toHaveClass(
      'button--primary'
    );
  });

  it('connects text input with its label and helper text', () => {
    render(
      <TextInput
        label="URL"
        helperText="저장할 링크를 입력하세요."
        placeholder="https://example.com"
      />
    );

    expect(screen.getByLabelText('URL')).toHaveAttribute(
      'placeholder',
      'https://example.com'
    );
    expect(screen.getByText('저장할 링크를 입력하세요.')).toBeInTheDocument();
  });

  it('renders selected chip state', () => {
    render(<Chip selected>UI/UX</Chip>);

    expect(screen.getByRole('button', { name: 'UI/UX' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('hides optional memo and category sections when not provided', () => {
    render(
      <InsightCard
        title="React 공식 문서"
        domain="react.dev"
        onOpen={() => undefined}
      />
    );

    expect(screen.getByText('React 공식 문서')).toBeInTheDocument();
    expect(screen.getByText('react.dev')).toBeInTheDocument();
    expect(screen.queryByLabelText('인사이트 메모')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('카테고리 목록')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
npm test -- src/components/ui/ui.test.tsx
```

Expected:

```text
FAIL src/components/ui/ui.test.tsx
Cannot find module './Button'
```

- [ ] **Step 3: Button 구현**

Create `src/components/ui/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

export function Button({
  children,
  className = '',
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={['button', `button--${variant}`, className]
        .filter(Boolean)
        .join(' ')}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 4: TextInput 구현**

Create `src/components/ui/TextInput.tsx`:

```tsx
import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  helperText?: string;
  label: string;
};

export function TextInput({ helperText, id, label, ...props }: TextInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label className="field" htmlFor={inputId}>
      <span className="field__label">{label}</span>
      <input className="field__input" id={inputId} {...props} />
      {helperText ? <span className="field__helper">{helperText}</span> : null}
    </label>
  );
}
```

- [ ] **Step 5: Chip 구현**

Create `src/components/ui/Chip.tsx`:

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  selected?: boolean;
};

export function Chip({
  children,
  className = '',
  selected = false,
  type = 'button',
  ...props
}: ChipProps) {
  return (
    <button
      aria-pressed={selected}
      className={['chip', selected ? 'chip--selected' : '', className]
        .filter(Boolean)
        .join(' ')}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 6: InsightCard 구현**

Create `src/components/ui/InsightCard.tsx`:

```tsx
import { ExternalLink } from 'lucide-react';
import { Button } from './Button';

type InsightCardProps = {
  categories?: readonly string[];
  domain: string;
  memo?: string;
  onOpen: () => void;
  thumbnailUrl?: string;
  title: string;
};

export function InsightCard({
  categories = [],
  domain,
  memo,
  onOpen,
  thumbnailUrl,
  title,
}: InsightCardProps) {
  return (
    <article className="insight-card">
      <div className="insight-card__thumbnail" aria-hidden="true">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" />
        ) : (
          <span className="insight-card__thumbnail-fallback">아맞다</span>
        )}
      </div>
      <div className="insight-card__body">
        <p className="insight-card__domain">{domain}</p>
        <h3 className="insight-card__title">{title}</h3>
        {memo ? (
          <p className="insight-card__memo" aria-label="인사이트 메모">
            {memo}
          </p>
        ) : null}
        {categories.length > 0 ? (
          <ul className="insight-card__categories" aria-label="카테고리 목록">
            {categories.map((category) => (
              <li key={category}>{category}</li>
            ))}
          </ul>
        ) : null}
        <Button
          aria-label={`${title} 원문 열기`}
          className="insight-card__open"
          onClick={onOpen}
          variant="secondary"
        >
          <ExternalLink aria-hidden="true" size={16} strokeWidth={2} />
          원문 열기
        </Button>
      </div>
    </article>
  );
}
```

- [ ] **Step 7: 테스트 통과 확인**

Run:

```bash
npm test -- src/components/ui/ui.test.tsx
```

Expected:

```text
4 passed
```

- [ ] **Step 8: 커밋**

Run:

```bash
git add src/components/ui/Button.tsx src/components/ui/TextInput.tsx src/components/ui/Chip.tsx src/components/ui/InsightCard.tsx src/components/ui/ui.test.tsx
git commit -m "feat: 공통 UI 컴포넌트 추가"
```

---

### Task 4: 하단 내비게이션 구현

**Files:**

- Create: `src/components/navigation/BottomNavigation.tsx`
- Create: `src/components/navigation/BottomNavigation.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/components/navigation/BottomNavigation.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BottomNavigation } from './BottomNavigation';

describe('BottomNavigation', () => {
  it('renders library, home, save tabs in order', () => {
    render(<BottomNavigation activeTab="home" onTabChange={() => undefined} />);

    const tabs = screen.getAllByRole('button');

    expect(tabs.map((tab) => tab.textContent)).toEqual([
      '보관함',
      '홈',
      '저장',
    ]);
  });

  it('marks the active tab', () => {
    render(<BottomNavigation activeTab="home" onTabChange={() => undefined} />);

    expect(screen.getByRole('button', { name: '홈' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('calls onTabChange when another tab is clicked', async () => {
    const handleTabChange = vi.fn();
    const user = userEvent.setup();

    render(<BottomNavigation activeTab="home" onTabChange={handleTabChange} />);

    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(handleTabChange).toHaveBeenCalledWith('save');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
npm test -- src/components/navigation/BottomNavigation.test.tsx
```

Expected:

```text
FAIL src/components/navigation/BottomNavigation.test.tsx
Cannot find module './BottomNavigation'
```

- [ ] **Step 3: BottomNavigation 구현**

Create `src/components/navigation/BottomNavigation.tsx`:

```tsx
import { Archive, Home, PlusCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppTab } from '@/domain/navigation';
import { APP_TABS } from '@/domain/navigation';

type BottomNavigationProps = {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
};

const tabIconMap: Record<AppTab, LucideIcon> = {
  library: Archive,
  home: Home,
  save: PlusCircle,
};

export function BottomNavigation({
  activeTab,
  onTabChange,
}: BottomNavigationProps) {
  return (
    <nav aria-label="주요 화면" className="bottom-navigation">
      {APP_TABS.map((tab) => {
        const Icon = tabIconMap[tab.id];
        const isActive = activeTab === tab.id;

        return (
          <button
            aria-current={isActive ? 'page' : undefined}
            className={[
              'bottom-navigation__item',
              isActive ? 'bottom-navigation__item--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            type="button"
          >
            <Icon aria-hidden="true" size={20} strokeWidth={2} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run:

```bash
npm test -- src/components/navigation/BottomNavigation.test.tsx
```

Expected:

```text
3 passed
```

- [ ] **Step 5: 커밋**

Run:

```bash
git add src/components/navigation/BottomNavigation.tsx src/components/navigation/BottomNavigation.test.tsx
git commit -m "feat: 하단 탭 내비게이션 구현"
```

---

### Task 5: 앱 셸과 화면 골격 구현

**Files:**

- Create: `src/app/AppShell.tsx`
- Create: `src/app/AppShell.test.tsx`
- Create: `src/pages/HomePage.tsx`
- Create: `src/pages/LibraryPage.tsx`
- Create: `src/pages/SavePage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 실패하는 앱 셸 테스트 작성**

Create `src/app/AppShell.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('renders the current screen title and content', () => {
    render(
      <AppShell activeTab="home" onTabChange={() => undefined}>
        <p>꺼내보기 화면</p>
      </AppShell>
    );

    expect(screen.getByRole('heading', { name: '홈' })).toBeInTheDocument();
    expect(screen.getByText('꺼내보기 화면')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '프로필 메뉴 열기' })
    ).toBeInTheDocument();
  });

  it('passes tab changes from bottom navigation', async () => {
    const handleTabChange = vi.fn();
    const user = userEvent.setup();

    render(
      <AppShell activeTab="home" onTabChange={handleTabChange}>
        <p>꺼내보기 화면</p>
      </AppShell>
    );

    await user.click(screen.getByRole('button', { name: '보관함' }));

    expect(handleTabChange).toHaveBeenCalledWith('library');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
npm test -- src/app/AppShell.test.tsx
```

Expected:

```text
FAIL src/app/AppShell.test.tsx
Cannot find module './AppShell'
```

- [ ] **Step 3: AppShell 구현**

Create `src/app/AppShell.tsx`:

```tsx
import type { ReactNode } from 'react';
import { BottomNavigation } from '@/components/navigation/BottomNavigation';
import type { AppTab } from '@/domain/navigation';
import { getAppTabLabel } from '@/domain/navigation';

type AppShellProps = {
  activeTab: AppTab;
  children: ReactNode;
  onTabChange: (tab: AppTab) => void;
};

export function AppShell({ activeTab, children, onTabChange }: AppShellProps) {
  const activeLabel = getAppTabLabel(activeTab);

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div>
          <p className="app-shell__eyebrow">아맞다</p>
          <h1>{activeLabel}</h1>
        </div>
        <button
          aria-label="프로필 메뉴 열기"
          className="profile-button"
          type="button"
        >
          최
        </button>
      </header>
      <main aria-label={`${activeLabel} 화면`} className="app-shell__main">
        {children}
      </main>
      <BottomNavigation activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}
```

- [ ] **Step 4: 화면 컴포넌트 작성**

Create `src/pages/HomePage.tsx`:

```tsx
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { InsightCard } from '@/components/ui/InsightCard';
import { TextInput } from '@/components/ui/TextInput';

const recommendedSituations = ['팀 프로젝트', '개발 공부', 'UI 레퍼런스'];

export function HomePage() {
  return (
    <div className="page-stack">
      <section className="hero-panel" aria-labelledby="retrieve-title">
        <p className="section-kicker">꺼내보기</p>
        <h2 id="retrieve-title">지금 필요한 인사이트를 다시 꺼내보세요.</h2>
        <div className="retrieve-form">
          <TextInput
            label="상황 또는 용도"
            placeholder="예: 팀 프로젝트 앱 디자인 참고"
          />
          <Button>추천 보기</Button>
        </div>
        <div className="chip-row" aria-label="추천 상황">
          {recommendedSituations.map((situation) => (
            <Chip key={situation}>{situation}</Chip>
          ))}
        </div>
      </section>

      <section aria-labelledby="recent-insights-title">
        <div className="section-heading">
          <p className="section-kicker">최근 보관</p>
          <h2 id="recent-insights-title">최근 보관한 인사이트</h2>
        </div>
        <div className="card-grid">
          <InsightCard
            categories={['UI/UX', '팀프로젝트']}
            domain="example.com"
            memo="앱 첫 화면 구성 참고"
            onOpen={() =>
              window.open('https://example.com', '_blank', 'noopener')
            }
            title="모바일 온보딩 UX 레퍼런스"
          />
        </div>
      </section>
    </div>
  );
}
```

Create `src/pages/LibraryPage.tsx`:

```tsx
import { Chip } from '@/components/ui/Chip';
import { InsightCard } from '@/components/ui/InsightCard';
import { TextInput } from '@/components/ui/TextInput';

const categories = ['All', '개발', '디자인', '공부', '미분류'];

export function LibraryPage() {
  return (
    <div className="page-stack">
      <section className="toolbar" aria-label="보관함 필터">
        <TextInput label="검색" placeholder="제목, 메모, 카테고리 검색" />
        <div className="chip-row" aria-label="카테고리 필터">
          {categories.map((category) => (
            <Chip key={category} selected={category === 'All'}>
              {category}
            </Chip>
          ))}
        </div>
      </section>

      <section aria-labelledby="library-title">
        <div className="section-heading">
          <p className="section-kicker">보관함</p>
          <h2 id="library-title">저장한 인사이트</h2>
        </div>
        <div className="card-grid">
          <InsightCard
            categories={['개발']}
            domain="developer.mozilla.org"
            memo="폼 접근성 구현할 때 다시 보기"
            onOpen={() =>
              window.open('https://developer.mozilla.org', '_blank', 'noopener')
            }
            title="MDN Web Docs"
          />
        </div>
      </section>
    </div>
  );
}
```

Create `src/pages/SavePage.tsx`:

```tsx
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TextInput } from '@/components/ui/TextInput';

const suggestedCategories = ['개발', '디자인', '공부'];

export function SavePage() {
  return (
    <div className="page-stack">
      <section className="save-panel" aria-labelledby="save-title">
        <p className="section-kicker">저장</p>
        <h2 id="save-title">나중에 꺼내볼 인사이트를 저장하세요.</h2>
        <form className="save-form">
          <TextInput
            helperText="카테고리와 메모는 저장 후 선택해도 됩니다."
            label="URL"
            placeholder="https://example.com"
            type="url"
          />
          <div className="chip-row" aria-label="추천 카테고리">
            {suggestedCategories.map((category) => (
              <Chip key={category}>{category}</Chip>
            ))}
          </div>
          <Button type="submit">저장</Button>
        </form>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: App 연결**

Modify `src/App.tsx`:

```tsx
import { useState } from 'react';
import { AppShell } from '@/app/AppShell';
import type { AppTab } from '@/domain/navigation';
import { DEFAULT_APP_TAB } from '@/domain/navigation';
import { HomePage } from '@/pages/HomePage';
import { LibraryPage } from '@/pages/LibraryPage';
import { SavePage } from '@/pages/SavePage';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>(DEFAULT_APP_TAB);

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'library' ? <LibraryPage /> : null}
      {activeTab === 'home' ? <HomePage /> : null}
      {activeTab === 'save' ? <SavePage /> : null}
    </AppShell>
  );
}
```

- [ ] **Step 6: 앱 셸 테스트 통과 확인**

Run:

```bash
npm test -- src/app/AppShell.test.tsx
```

Expected:

```text
2 passed
```

- [ ] **Step 7: 전체 테스트 실행**

Run:

```bash
npm test
```

Expected:

```text
14 passed
```

- [ ] **Step 8: 커밋**

Run:

```bash
git add src/app/AppShell.tsx src/app/AppShell.test.tsx src/pages/HomePage.tsx src/pages/LibraryPage.tsx src/pages/SavePage.tsx src/App.tsx
git commit -m "feat: 앱 셸과 핵심 화면 골격 구현"
```

---

### Task 6: 글로벌 스타일과 반응형 레이아웃 적용

**Files:**

- Create: `src/styles/global.css`
- Modify: `src/main.tsx`

- [ ] **Step 1: 글로벌 스타일 파일 작성**

Create `src/styles/global.css`:

```css
:root {
  color: #17201a;
  background: #f7f8f5;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

button,
input {
  font: inherit;
}

button {
  cursor: pointer;
}

#root {
  min-height: 100vh;
}

.app-shell {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
  padding: 20px 20px 96px;
}

.app-shell__header {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin: 0 auto;
  max-width: 1180px;
  width: 100%;
}

.app-shell__eyebrow,
.section-kicker,
.insight-card__domain {
  color: #60736a;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0;
  margin: 0 0 6px;
}

.app-shell__header h1,
.section-heading h2,
.hero-panel h2,
.save-panel h2 {
  letter-spacing: 0;
  margin: 0;
}

.profile-button {
  align-items: center;
  background: #17201a;
  border: 0;
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  height: 40px;
  justify-content: center;
  width: 40px;
}

.app-shell__main {
  margin: 24px auto 0;
  max-width: 1180px;
  width: 100%;
}

.page-stack {
  display: grid;
  gap: 24px;
}

.hero-panel,
.save-panel,
.toolbar {
  background: #ffffff;
  border: 1px solid #dfe6df;
  border-radius: 8px;
  padding: 24px;
}

.retrieve-form,
.save-form {
  display: grid;
  gap: 14px;
  margin-top: 20px;
}

.field {
  display: grid;
  gap: 8px;
}

.field__label {
  color: #26352c;
  font-size: 0.9rem;
  font-weight: 700;
}

.field__input {
  border: 1px solid #cfd9d2;
  border-radius: 8px;
  color: #17201a;
  min-height: 46px;
  padding: 0 14px;
  width: 100%;
}

.field__helper {
  color: #60736a;
  font-size: 0.84rem;
}

.button {
  align-items: center;
  border: 1px solid transparent;
  border-radius: 8px;
  display: inline-flex;
  font-weight: 700;
  gap: 8px;
  justify-content: center;
  min-height: 44px;
  padding: 0 16px;
}

.button--primary {
  background: #1f7a4d;
  color: #ffffff;
}

.button--secondary {
  background: #ecf4ee;
  color: #1d5f3d;
}

.button--ghost {
  background: transparent;
  color: #26352c;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.chip {
  background: #ffffff;
  border: 1px solid #cfd9d2;
  border-radius: 999px;
  color: #26352c;
  min-height: 36px;
  padding: 0 14px;
}

.chip--selected {
  background: #17201a;
  border-color: #17201a;
  color: #ffffff;
}

.section-heading {
  margin-bottom: 16px;
}

.card-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.insight-card {
  background: #ffffff;
  border: 1px solid #dfe6df;
  border-radius: 8px;
  overflow: hidden;
}

.insight-card__thumbnail {
  align-items: center;
  aspect-ratio: 16 / 9;
  background: #e8efe9;
  color: #60736a;
  display: flex;
  font-weight: 800;
  justify-content: center;
}

.insight-card__thumbnail img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.insight-card__body {
  display: grid;
  gap: 10px;
  padding: 16px;
}

.insight-card__title {
  font-size: 1rem;
  letter-spacing: 0;
  margin: 0;
}

.insight-card__memo {
  color: #405248;
  font-size: 0.9rem;
  margin: 0;
}

.insight-card__categories {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.insight-card__categories li {
  background: #f1f5f2;
  border-radius: 999px;
  color: #405248;
  font-size: 0.78rem;
  padding: 5px 9px;
}

.insight-card__open {
  width: fit-content;
}

.bottom-navigation {
  align-items: center;
  background: #ffffff;
  border: 1px solid #dfe6df;
  border-radius: 999px;
  bottom: 20px;
  box-shadow: 0 10px 30px rgb(23 32 26 / 12%);
  display: grid;
  gap: 4px;
  grid-template-columns: repeat(3, 1fr);
  left: 50%;
  max-width: 420px;
  padding: 8px;
  position: fixed;
  transform: translateX(-50%);
  width: calc(100% - 40px);
  z-index: 10;
}

.bottom-navigation__item {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 999px;
  color: #60736a;
  display: inline-flex;
  flex-direction: column;
  font-size: 0.78rem;
  font-weight: 700;
  gap: 4px;
  justify-content: center;
  min-height: 58px;
}

.bottom-navigation__item--active {
  background: #17201a;
  color: #ffffff;
}

@media (max-width: 860px) {
  .card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .app-shell {
    padding: 16px 16px 92px;
  }

  .hero-panel,
  .save-panel,
  .toolbar {
    padding: 18px;
  }

  .card-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: 글로벌 스타일 import**

Modify `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App.tsx';
import '@/styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 3: 전체 테스트 실행**

Run:

```bash
npm test
```

Expected:

```text
14 passed
```

- [ ] **Step 4: 빌드 실행**

Run:

```bash
npm run build
```

Expected:

```text
✓ built in
```

- [ ] **Step 5: 로컬 실행 확인**

Run:

```bash
npm run dev
```

Expected:

```text
Local: http://localhost:5173/
```

브라우저에서 확인할 화면:

- 하단 중앙에 `보관함 / 홈 / 저장`이 보인다.
- 기본 진입 화면은 `홈`이다.
- `보관함`, `홈`, `저장`을 클릭하면 화면 제목과 본문이 바뀐다.
- 모바일 폭에서 카드가 1열로 보인다.

- [ ] **Step 6: 커밋**

Run:

```bash
git add src/styles/global.css src/main.tsx
git commit -m "style: 아맞다 앱 셸 기본 스타일 적용"
```

---

## Self-Review

**Spec coverage:**

- `P0. 프로젝트 기반`의 앱 라우팅 구조는 탭 상태 기반 화면 전환으로 처리했다.
- 공통 레이아웃은 `AppShell`에서 처리했다.
- 하단 중앙 내비게이션과 `보관함 / 홈 / 저장` 순서는 `BottomNavigation`과 `APP_TABS`에서 처리했다.
- 홈 탭 가운데 배치는 `APP_TABS` 순서 테스트로 검증했다.
- 상단 프로필 메뉴 영역은 `profile-button` 최소 UI로 처리했다.
- 공통 버튼, 입력창, 카드, 칩은 `src/components/ui`에 분리했다.
- 반응형 레이아웃 기준은 `src/styles/global.css`의 3열/2열/1열 그리드로 처리했다.
- 환경 변수 구조 설정은 Supabase 인증 계획에서 다루는 것이 더 적절하므로 이 계획에서는 제외했다.

**Placeholder scan:**

- 금지된 자리표시자 표현은 본문에 사용하지 않았다.
- 각 코드 변경 단계에는 실제 파일 내용 또는 실행 명령을 포함했다.

**Type consistency:**

- 앱 탭 타입은 모든 파일에서 `AppTab = 'library' | 'home' | 'save'`를 사용한다.
- 기본 탭은 모든 파일에서 `DEFAULT_APP_TAB = 'home'`을 사용한다.
- `BottomNavigation`, `AppShell`, `App`의 `onTabChange` 시그니처는 `(tab: AppTab) => void`로 일치한다.

## Execution Handoff

계획 작성이 완료되었고 `docs/superpowers/plans/amadda-p0-app-shell.md`에 저장되었다. 실행 방식은 두 가지다.

**1. Subagent-Driven (recommended)** - 태스크마다 새 subagent를 투입하고, 각 태스크 사이에 리뷰하며 빠르게 반복한다.

**2. Inline Execution** - 현재 세션에서 `executing-plans` 방식으로 실행하고, 중간 체크포인트마다 검토한다.

어떤 방식으로 실행할지 선택한다.
