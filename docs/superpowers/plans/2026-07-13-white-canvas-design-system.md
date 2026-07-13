# White Canvas 디자인 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 온보딩, 로그인, 로그인 후 작업 공간을 TypeScript 디자인 토큰과 제품 소유 UI 어댑터를 사용하는 하나의 White Canvas 디자인 시스템으로 통합한다.

**Architecture:** `tokens.ts`를 런타임 토큰의 단일 원천으로 두고 `apply_design_tokens.ts`가 CSS custom property를 문서 루트에 주입한다. 외부 UI 라이브러리는 `shared/ui` 어댑터와 provider 뒤에 격리하고, 비대해진 앱 파일은 점진적 FSD 기준에 따라 app, pages, widgets, entities로 분리한다. 인증·검색·필터·저장 동작은 유지한 채 정적 UI를 먼저 완성하고 온보딩의 단일 GSAP 장면을 마지막에 연결한다.

**Tech Stack:** TypeScript 6, React 19, Vite 8, Vitest, Testing Library, WDS 3.11 어댑터, GSAP 3.15, CSS custom properties

---

## 기준 문서와 범위

- 설계 기준: `docs/superpowers/specs/2026-07-13-white-canvas-design-system-design.md`
- 코드와 커밋: `docs/coding-commit-conventions.md`
- 레이어와 import: `docs/development-architecture.md`
- 시각 규칙: 구현 중 갱신할 `DESIGN.md`
- 관련 이슈: GitHub #26
- 작업 브랜치: `feat/26-design-system-refactor`

`docs/onboarding.md`는 구형 시각 스펙이 아니라 로그인 전 진입 흐름, 문구, 로그인 경계를 정의하는 활성 제품 계약이다. 삭제하지 않고 새 화면의 동작과 모션 경계에 맞게 갱신한다. 과거 `docs/superpowers/specs/*onboarding*`과 `docs/superpowers/plans/*onboarding*`은 당시 의사결정을 담은 이력 문서이므로 이 구현 계획에서는 삭제하지 않는다. 별도 삭제 승인이 오면 문서 참조를 먼저 제거한 독립 `docs` 커밋으로 정리한다.

## 최종 파일 구조

```text
src/
  app/
    app.tsx
    app.test.tsx
    authenticated_workspace.tsx
    authenticated_workspace.test.tsx
    index.ts
    model/
      workspace_seed.ts
    styles/
      global.css
      authenticated_workspace.css
  entities/
    insight/
      index.ts
      model/
        insight.ts
        insight.test.ts
      ui/
        insight_grid.tsx
        insight_grid.test.tsx
        insight_grid.css
  pages/
    landing/
      index.ts
      ui/
        landing_page.tsx
        landing_page.test.tsx
        onboarding_motion_preview.tsx
        onboarding_motion_preview.test.tsx
        landing_page.css
    login/
      index.ts
      ui/
        login_page.tsx
        login_page.test.tsx
        login_page.css
    home/
      index.ts
      ui/
        home_page.tsx
        home_page.test.tsx
        home_page.css
    library/
      index.ts
      ui/
        library_page.tsx
        library_page.test.tsx
        library_page.css
    save/
      index.ts
      ui/
        save_page.tsx
        save_page.test.tsx
        save_page.css
  widgets/
    app-navigation/
      index.ts
      ui/
        app_navigation.tsx
        app_navigation.test.tsx
        app_navigation.css
  shared/
    config/
      design-system/
        index.ts
        tokens.ts
        tokens.test.ts
        apply_design_tokens.ts
        apply_design_tokens.test.ts
    ui/
      button/
      category-filter/
      chip/
      design-system-provider/
      empty-state/
      loading-state/
      inline-label/
      navigation-bar/
      status-message/
      text-field/
      index.ts
```

각 TypeScript/TSX 파일은 `snake_case`, FSD slice 디렉터리는 `kebab-case`, 컴포넌트와 타입은 `UpperCamelCase`, 함수와 변수는 `lowerCamelCase`, export는 named export만 사용한다.

## Task 1: TypeScript 디자인 토큰과 CSS 변수 적용 경계

**Files:**

- Create: `src/shared/config/design-system/tokens.ts`
- Create: `src/shared/config/design-system/tokens.test.ts`
- Create: `src/shared/config/design-system/apply_design_tokens.ts`
- Create: `src/shared/config/design-system/apply_design_tokens.test.ts`
- Create: `src/shared/config/design-system/index.ts`
- Modify: `src/main.tsx`

- [ ] **Step 1: 토큰 값과 CSS 변수 매핑의 실패 테스트 작성**

`src/shared/config/design-system/tokens.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { designTokens } from './tokens';

describe('designTokens', () => {
  it('defines the approved White Canvas foundations', () => {
    expect(designTokens.color.canvas).toBe('#FFFFFF');
    expect(designTokens.color.ink).toBe('#151619');
    expect(designTokens.color.charcoal).toBe('#25272D');
    expect(designTokens.color.electricBlue).toBe('#0560FD');
    expect(designTokens.color.signalGreen).toBe('#059669');
    expect(designTokens.radius.button).toBe('8px');
    expect(designTokens.radius.input).toBe('12px');
    expect(designTokens.radius.card).toBe('16px');
    expect(designTokens.layout.contentWidth).toBe('1200px');
  });
});
```

`src/shared/config/design-system/apply_design_tokens.test.ts`:

```ts
/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';

import {
  applyDesignTokens,
  createDesignTokenEntries,
} from './apply_design_tokens';

describe('applyDesignTokens', () => {
  it('maps camelCase token names to kebab-case CSS variables', () => {
    const entries = createDesignTokenEntries();

    expect(entries).toContain(['--color-electric-blue', '#0560FD']);
    expect(entries).toContain(['--motion-duration-standard', '200ms']);
    expect(entries).toContain(['--layout-content-width', '1200px']);
  });

  it('applies every token to the provided root element', () => {
    const root = document.createElement('div');

    applyDesignTokens(root);

    expect(root.style.getPropertyValue('--color-canvas')).toBe('#FFFFFF');
    expect(root.style.getPropertyValue('--radius-card')).toBe('16px');
  });
});
```

- [ ] **Step 2: 토큰 테스트가 모듈 부재로 실패하는지 확인**

Run:

```sh
npm test -- src/shared/config/design-system/tokens.test.ts src/shared/config/design-system/apply_design_tokens.test.ts
```

Expected: FAIL with module resolution errors for `tokens` and `apply_design_tokens`.

- [ ] **Step 3: 순수 토큰 모듈 구현**

`src/shared/config/design-system/tokens.ts`:

```ts
type ColorTokenName =
  | 'amber'
  | 'ash'
  | 'canvas'
  | 'charcoal'
  | 'coral'
  | 'electricBlue'
  | 'errorInk'
  | 'fog'
  | 'graphite'
  | 'ink'
  | 'lightBlue'
  | 'mist'
  | 'paleBlue'
  | 'pewter'
  | 'signalGreen'
  | 'smoke';
type GradientTokenName = 'electricBlue';
type LayoutTokenName =
  | 'contentWidth'
  | 'sectionGapDesktop'
  | 'sectionGapMobile'
  | 'sectionGapTablet';
type MotionTokenName = 'durationFast' | 'durationStandard' | 'easingStandard';
type RadiusTokenName = 'button' | 'card' | 'input' | 'label';
type SpacingTokenName =
  '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12' | '16' | '20';
type TypographyTokenName =
  | 'bodyLineHeight'
  | 'bodySize'
  | 'cardTitleLineHeight'
  | 'cardTitleSize'
  | 'fontFamily'
  | 'heroLineHeight'
  | 'heroSize'
  | 'labelLineHeight'
  | 'labelSize'
  | 'metaLineHeight'
  | 'metaSize'
  | 'screenTitleLineHeight'
  | 'screenTitleSize'
  | 'sectionTitleLineHeight'
  | 'sectionTitleSize';

type TokenGroup<TName extends string> = Readonly<Record<TName, string>>;

export type DesignTokens = Readonly<{
  color: TokenGroup<ColorTokenName>;
  gradient: TokenGroup<GradientTokenName>;
  layout: TokenGroup<LayoutTokenName>;
  motion: TokenGroup<MotionTokenName>;
  radius: TokenGroup<RadiusTokenName>;
  spacing: TokenGroup<SpacingTokenName>;
  typography: TokenGroup<TypographyTokenName>;
}>;

export const designTokens = {
  color: {
    amber: '#F59E0B',
    ash: '#E1E2E5',
    canvas: '#FFFFFF',
    charcoal: '#25272D',
    coral: '#F04438',
    electricBlue: '#0560FD',
    errorInk: '#D92D20',
    fog: '#C8CAD0',
    graphite: '#363940',
    ink: '#151619',
    lightBlue: '#3A8DFF',
    mist: '#F3F3F5',
    paleBlue: '#C3D9FF',
    pewter: '#B0B3BB',
    signalGreen: '#059669',
    smoke: '#7F8491',
  },
  gradient: {
    electricBlue:
      'linear-gradient(90deg, #0560FD 0%, #3A8DFF 50%, #C3D9FF 100%)',
  },
  layout: {
    contentWidth: '1200px',
    sectionGapDesktop: '80px',
    sectionGapMobile: '48px',
    sectionGapTablet: '64px',
  },
  motion: {
    durationFast: '150ms',
    durationStandard: '200ms',
    easingStandard: 'ease-out',
  },
  radius: {
    button: '8px',
    card: '16px',
    input: '12px',
    label: '0.16em',
  },
  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
  },
  typography: {
    bodyLineHeight: '26px',
    bodySize: '16px',
    cardTitleLineHeight: '24px',
    cardTitleSize: '17px',
    fontFamily:
      "Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    heroLineHeight: '0.98',
    heroSize: 'clamp(48px, 6vw, 80px)',
    labelLineHeight: '20px',
    labelSize: '14px',
    metaLineHeight: '18px',
    metaSize: '13px',
    screenTitleLineHeight: '40px',
    screenTitleSize: '32px',
    sectionTitleLineHeight: '32px',
    sectionTitleSize: '24px',
  },
} as const satisfies DesignTokens;
```

- [ ] **Step 4: DOM 적용 모듈과 public API 구현**

`src/shared/config/design-system/apply_design_tokens.ts`:

```ts
import { designTokens } from './tokens';
import type { DesignTokens } from './tokens';

function toKebabCase(value: string) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export function createDesignTokenEntries(
  tokens: DesignTokens = designTokens
): Array<[string, string]> {
  return Object.entries(tokens).flatMap(([groupName, group]) => {
    return Object.entries(group).map(([tokenName, value]) => [
      `--${toKebabCase(groupName)}-${toKebabCase(tokenName)}`,
      value,
    ]);
  });
}

export function applyDesignTokens(
  root: HTMLElement = document.documentElement
): void {
  createDesignTokenEntries().forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });
}
```

`src/shared/config/design-system/index.ts`:

```ts
export {
  applyDesignTokens,
  createDesignTokenEntries,
} from './apply_design_tokens';
export { designTokens } from './tokens';
export type { DesignTokens } from './tokens';
```

`src/main.tsx`에서는 `createRoot()` 전에 다음 호출을 추가한다.

```ts
import { applyDesignTokens } from '@/shared/config/design-system';

applyDesignTokens();
```

- [ ] **Step 5: 토큰 테스트와 빌드 확인**

Run:

```sh
npm test -- src/shared/config/design-system/tokens.test.ts src/shared/config/design-system/apply_design_tokens.test.ts
npm run build
```

Expected: both token test files PASS and TypeScript/Vite build succeeds.

- [ ] **Step 6: 토큰 경계 커밋**

```sh
git add src/shared/config/design-system src/main.tsx
git commit -m "feat: 디자인 토큰 런타임 적용"
```

## Task 2: Provider와 Button 어댑터로 외부 UI 경계 시작

**Files:**

- Create: `src/shared/ui/design-system-provider/design_system_provider.tsx`
- Create: `src/shared/ui/design-system-provider/index.ts`
- Create: `src/shared/ui/button/button.tsx`
- Create: `src/shared/ui/button/button.test.tsx`
- Create: `src/shared/ui/button/button.css`
- Create: `src/shared/ui/button/index.ts`
- Create: `src/shared/ui/index.ts`
- Modify: `src/main.tsx`

- [ ] **Step 1: 제품 Button 계약의 실패 테스트 작성**

`src/shared/ui/button/button.test.tsx`:

```tsx
/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DesignSystemProvider } from '@/shared/ui/design-system-provider';

import { Button } from './button';

describe('Button', () => {
  it('exposes a product hierarchy without leaking WDS color props', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <DesignSystemProvider>
        <Button hierarchy="primary" onClick={onClick}>
          계속하기
        </Button>
      </DesignSystemProvider>
    );

    const button = screen.getByRole('button', { name: '계속하기' });
    expect(button.classList.contains('ui-button--primary')).toBe(true);

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: 어댑터 부재로 실패하는지 확인**

Run:

```sh
npm test -- src/shared/ui/button/button.test.tsx
```

Expected: FAIL because `Button` and `DesignSystemProvider` do not exist.

- [ ] **Step 3: Provider와 Button 구현**

`src/shared/ui/design-system-provider/design_system_provider.tsx`:

```tsx
import type { PropsWithChildren } from 'react';
import { ThemeProvider } from '@wanteddev/wds';

export function DesignSystemProvider({ children }: PropsWithChildren) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
```

`src/shared/ui/button/button.tsx`:

```tsx
import type { ComponentProps } from 'react';
import { Button as WdsButton } from '@wanteddev/wds';
import clsx from 'clsx';

import './button.css';

type WdsButtonProps = ComponentProps<typeof WdsButton>;
export type ButtonHierarchy = 'ghost' | 'primary' | 'secondary';
export type ButtonProps = Omit<WdsButtonProps, 'color' | 'variant'> & {
  hierarchy?: ButtonHierarchy;
};

const APPEARANCE_BY_HIERARCHY = {
  ghost: { color: 'assistive', variant: 'outlined' },
  primary: { color: 'primary', variant: 'solid' },
  secondary: { color: 'primary', variant: 'outlined' },
} as const;

export function Button({
  className,
  hierarchy = 'secondary',
  ...props
}: ButtonProps) {
  const appearance = APPEARANCE_BY_HIERARCHY[hierarchy];

  return (
    <WdsButton
      {...props}
      className={clsx('ui-button', `ui-button--${hierarchy}`, className)}
      color={appearance.color}
      variant={appearance.variant}
    />
  );
}
```

`src/shared/ui/button/button.css`:

```css
.ui-button {
  min-height: 44px !important;
  border-radius: var(--radius-button) !important;
  transition:
    background var(--motion-duration-standard) var(--motion-easing-standard),
    border-color var(--motion-duration-standard) var(--motion-easing-standard),
    color var(--motion-duration-standard) var(--motion-easing-standard) !important;
}

.ui-button--primary {
  border-color: var(--color-charcoal) !important;
  background: var(--color-charcoal) !important;
  color: var(--color-canvas) !important;
}

.ui-button--primary:hover {
  background: var(--color-graphite) !important;
}

.ui-button--secondary {
  border-color: var(--color-ash) !important;
  background: var(--color-canvas) !important;
  color: var(--color-ink) !important;
}

.ui-button--ghost {
  border-color: transparent !important;
  background: transparent !important;
  color: var(--color-smoke) !important;
}
```

각 `index.ts`는 해당 모듈의 named export만 다시 내보낸다. `src/shared/ui/index.ts`는 다음 public API로 시작한다.

```ts
export { Button } from './button';
export type { ButtonHierarchy, ButtonProps } from './button';
export { DesignSystemProvider } from './design-system-provider';
```

- [ ] **Step 4: 앱 진입부의 WDS component import를 provider로 교체**

`src/main.tsx`는 default `App`과 WDS component import를 제거한다. CSS cascade를 보장하기 위해 WDS global CSS를 제품 global CSS보다 먼저 import한다.

```tsx
import '@wanteddev/wds/global.css';
import '@/app/styles/global.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app';
import { applyDesignTokens } from '@/shared/config/design-system';
import { DesignSystemProvider } from '@/shared/ui';

applyDesignTokens();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DesignSystemProvider>
      <App />
    </DesignSystemProvider>
  </StrictMode>
);
```

- [ ] **Step 5: Button 테스트와 앱 빌드 확인**

Run:

```sh
npm test -- src/shared/ui/button/button.test.tsx
npm run build
```

Expected: Button test PASS and build succeeds.

- [ ] **Step 6: UI provider와 Button 커밋**

```sh
git add src/main.tsx src/shared/ui
git commit -m "feat: 공통 버튼과 UI 경계 추가"
```

## Task 3: Field, Chip, InlineLabel 어댑터

**Files:**

- Create: `src/shared/ui/text-field/text_field.tsx`
- Create: `src/shared/ui/text-field/text_field.test.tsx`
- Create: `src/shared/ui/text-field/text_field.css`
- Create: `src/shared/ui/text-field/index.ts`
- Create: `src/shared/ui/chip/chip.tsx`
- Create: `src/shared/ui/chip/chip.test.tsx`
- Create: `src/shared/ui/chip/chip.css`
- Create: `src/shared/ui/chip/index.ts`
- Create: `src/shared/ui/inline-label/inline_label.tsx`
- Create: `src/shared/ui/inline-label/inline_label.test.tsx`
- Create: `src/shared/ui/inline-label/inline_label.css`
- Create: `src/shared/ui/inline-label/index.ts`
- Modify: `src/shared/ui/index.ts`

- [ ] **Step 1: 입력과 라벨의 제품 계약 테스트 작성**

```tsx
/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DesignSystemProvider } from '@/shared/ui/design-system-provider';
import { InlineLabel } from '@/shared/ui/inline-label';
import { TextField } from '@/shared/ui/text-field';

describe('field and inline label contracts', () => {
  it('forwards text input changes through the product field', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DesignSystemProvider>
        <TextField aria-label="검색" onChange={onChange} />
      </DesignSystemProvider>
    );

    await user.type(screen.getByRole('textbox', { name: '검색' }), '디자인');
    expect(onChange).toHaveBeenCalled();
  });

  it('hides decorative emoji while keeping label text readable', () => {
    const { container } = render(
      <InlineLabel emoji="🔖" tone="blue">
        링크
      </InlineLabel>
    );

    expect(screen.getByText('링크')).not.toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe(
      '🔖'
    );
  });
});
```

`chip.test.tsx`는 `ChoiceChip`을 클릭했을 때 callback이 호출되고 `aria-pressed`가 `selected`와 일치하는지 검증한다.

- [ ] **Step 2: 새 shared UI 모듈이 없어 실패하는지 확인**

Run:

```sh
npm test -- src/shared/ui/text-field/text_field.test.tsx src/shared/ui/chip/chip.test.tsx src/shared/ui/inline-label/inline_label.test.tsx
```

Expected: FAIL with unresolved modules.

- [ ] **Step 3: Field 어댑터 구현**

`src/shared/ui/text-field/text_field.tsx`:

```tsx
import type { ComponentProps } from 'react';
import {
  SearchField as WdsSearchField,
  TextArea as WdsTextArea,
  TextField as WdsTextField,
} from '@wanteddev/wds';
import clsx from 'clsx';

import './text_field.css';

export type TextFieldProps = ComponentProps<typeof WdsTextField>;
export type SearchFieldProps = ComponentProps<typeof WdsSearchField>;
export type TextAreaProps = ComponentProps<typeof WdsTextArea>;

export function TextField({ className, ...props }: TextFieldProps) {
  return <WdsTextField {...props} className={clsx('ui-field', className)} />;
}

export function SearchField({ className, ...props }: SearchFieldProps) {
  return <WdsSearchField {...props} className={clsx('ui-field', className)} />;
}

export function TextArea({ className, ...props }: TextAreaProps) {
  return <WdsTextArea {...props} className={clsx('ui-field', className)} />;
}
```

`text_field.css`는 `.ui-field`의 WDS wrapper에 `--radius-input`, `--color-ash`, `--color-canvas`를 적용하고 invalid 상태에는 `--color-error-ink`를 적용한다. focus-within은 `0 0 0 2px var(--color-electric-blue)`를 사용한다.

- [ ] **Step 4: ChoiceChip, CategoryTag, InlineLabel 구현**

`src/shared/ui/chip/chip.tsx`:

```tsx
import type { ComponentProps, ReactNode } from 'react';
import { Chip as WdsChip } from '@wanteddev/wds';
import clsx from 'clsx';

import './chip.css';

type WdsChipProps = ComponentProps<typeof WdsChip>;
export type CategoryTone = 'amber' | 'blue' | 'coral' | 'green' | 'slate';

export type ChoiceChipProps = Omit<WdsChipProps, 'active' | 'variant'> & {
  selected: boolean;
};

export function ChoiceChip({ className, selected, ...props }: ChoiceChipProps) {
  return (
    <WdsChip
      {...props}
      active={selected}
      aria-pressed={selected}
      className={clsx('choice-chip', className)}
      variant={selected ? 'solid' : 'outlined'}
    />
  );
}

export function CategoryTag({
  children,
  tone,
}: {
  children: ReactNode;
  tone: CategoryTone;
}) {
  return (
    <WdsChip
      as="span"
      className={`category-tag category-tag--${tone}`}
      disableInteraction
      size="xsmall"
      variant="solid"
    >
      {children}
    </WdsChip>
  );
}
```

`src/shared/ui/inline-label/inline_label.tsx`:

```tsx
import type { ReactNode } from 'react';

import './inline_label.css';

export type InlineLabelTone = 'amber' | 'blue' | 'coral' | 'green';

export function InlineLabel({
  children,
  emoji,
  tone,
}: {
  children: ReactNode;
  emoji?: string;
  tone: InlineLabelTone;
}) {
  return (
    <span className={`inline-label inline-label--${tone}`}>
      {emoji ? <span aria-hidden="true">{emoji}</span> : null}
      {children}
    </span>
  );
}
```

`inline_label.css`는 `display: inline-flex`, `border-radius: var(--radius-label)`, 흰색 텍스트, `0.05em 0.22em 0.08em` padding을 사용한다. 각 tone은 승인된 색 토큰만 사용한다. `chip.css`는 제품 제어용 chip을 중립 표면으로 유지하고 선택 상태를 차콜 경계와 weight로 구분한다.

- [ ] **Step 5: public API 갱신과 테스트 확인**

`src/shared/ui/index.ts`에 다음 export를 추가한다.

```ts
export { CategoryTag, ChoiceChip } from './chip';
export type { CategoryTone, ChoiceChipProps } from './chip';
export { InlineLabel } from './inline-label';
export type { InlineLabelTone } from './inline-label';
export { SearchField, TextArea, TextField } from './text-field';
export type {
  SearchFieldProps,
  TextAreaProps,
  TextFieldProps,
} from './text-field';
```

Run:

```sh
npm test -- src/shared/ui/text-field/text_field.test.tsx src/shared/ui/chip/chip.test.tsx src/shared/ui/inline-label/inline_label.test.tsx
npm run build
```

Expected: all shared UI tests PASS and build succeeds.

- [ ] **Step 6: 입력·chip·인라인 라벨 커밋**

```sh
git add src/shared/ui
git commit -m "feat: 입력과 라벨 UI 어댑터 추가"
```

## Task 4: CategoryFilter, NavigationBar, 상태 컴포넌트

**Files:**

- Create: `src/shared/ui/category-filter/category_filter.tsx`
- Create: `src/shared/ui/category-filter/category_filter.test.tsx`
- Create: `src/shared/ui/category-filter/category_filter.css`
- Create: `src/shared/ui/category-filter/index.ts`
- Create: `src/shared/ui/navigation-bar/navigation_bar.tsx`
- Create: `src/shared/ui/navigation-bar/navigation_bar.test.tsx`
- Create: `src/shared/ui/navigation-bar/navigation_bar.css`
- Create: `src/shared/ui/navigation-bar/index.ts`
- Create: `src/shared/ui/empty-state/empty_state.tsx`
- Create: `src/shared/ui/empty-state/empty_state.test.tsx`
- Create: `src/shared/ui/empty-state/empty_state.css`
- Create: `src/shared/ui/empty-state/index.ts`
- Create: `src/shared/ui/loading-state/loading_state.tsx`
- Create: `src/shared/ui/loading-state/loading_state.test.tsx`
- Create: `src/shared/ui/loading-state/loading_state.css`
- Create: `src/shared/ui/loading-state/index.ts`
- Create: `src/shared/ui/status-message/status_message.tsx`
- Create: `src/shared/ui/status-message/status_message.test.tsx`
- Create: `src/shared/ui/status-message/status_message.css`
- Create: `src/shared/ui/status-message/index.ts`
- Modify: `src/shared/ui/index.ts`

- [ ] **Step 1: 선택, 내비게이션, 상태 계약의 실패 테스트 작성**

`category_filter.test.tsx`는 `개발` option을 클릭하면 `onValueChange('개발')`가 한 번 호출되는지 검증한다. `navigation_bar.test.tsx`는 `보관함` 클릭 시 generic value `'library'`가 전달되고 활성 item에 `aria-current="page"`가 있는지 검증한다. `empty_state.test.tsx`는 제목, 이유, 하나의 주 행동을 role로 찾을 수 있는지 검증한다. `loading_state.test.tsx`는 `role="status"`와 접근 가능한 `불러오는 중` label, 장식용 정적 skeleton 세 개를 검증한다. `status_message.test.tsx`는 error variant가 `role="alert"`, success variant가 `role="status"`인지 검증한다.

```tsx
const items = [
  { icon: <span aria-hidden="true">H</span>, label: '홈', value: 'home' },
  {
    icon: <span aria-hidden="true">L</span>,
    label: '보관함',
    value: 'library',
  },
] as const;
```

- [ ] **Step 2: 테스트가 새 모듈 부재로 실패하는지 확인**

Run:

```sh
npm test -- src/shared/ui/category-filter/category_filter.test.tsx src/shared/ui/navigation-bar/navigation_bar.test.tsx src/shared/ui/empty-state/empty_state.test.tsx src/shared/ui/loading-state/loading_state.test.tsx src/shared/ui/status-message/status_message.test.tsx
```

Expected: FAIL with unresolved module errors.

- [ ] **Step 3: CategoryFilter와 generic NavigationBar 구현**

`src/shared/ui/category-filter/category_filter.tsx`:

```tsx
import { Category, CategoryList, CategoryListItem } from '@wanteddev/wds';

import type { CategoryTone } from '@/shared/ui/chip';

import './category_filter.css';

export type CategoryFilterOption = {
  label: string;
  tone: CategoryTone;
  value: string;
};

export function CategoryFilter({
  onValueChange,
  options,
  value,
}: {
  onValueChange: (value: string) => void;
  options: readonly CategoryFilterOption[];
  value: string;
}) {
  return (
    <Category onValueChange={onValueChange} value={value}>
      <nav className="category-filter" aria-label="카테고리 필터">
        <CategoryList
          horizontalPadding={false}
          size="small"
          verticalPadding={false}
        >
          {options.map((option) => (
            <CategoryListItem
              aria-label={`${option.label} 카테고리`}
              key={option.value}
              value={option.value}
            >
              <span
                aria-hidden="true"
                className={`category-filter__mark category-filter__mark--${option.tone}`}
              />
              {option.label}
            </CategoryListItem>
          ))}
        </CategoryList>
      </nav>
    </Category>
  );
}
```

`src/shared/ui/navigation-bar/navigation_bar.tsx`:

```tsx
import type { ReactNode } from 'react';
import { BottomNavigation, BottomNavigationItem } from '@wanteddev/wds';

import './navigation_bar.css';

export type NavigationItem<TValue extends string> = {
  icon: ReactNode;
  label: string;
  value: TValue;
};

export function NavigationBar<TValue extends string>({
  items,
  onValueChange,
  value,
}: {
  items: readonly NavigationItem<TValue>[];
  onValueChange: (value: TValue) => void;
  value: TValue;
}) {
  return (
    <BottomNavigation
      aria-label="주요 화면"
      className="navigation-bar"
      onValueChange={(nextValue) => onValueChange(nextValue as TValue)}
      value={value}
    >
      {items.map((item) => (
        <BottomNavigationItem
          icon={item.icon}
          key={item.value}
          label={item.label}
          value={item.value}
        />
      ))}
    </BottomNavigation>
  );
}
```

generic cast는 문자열만 받는 외부 컴포넌트 경계 안에 한 번만 남기며 페이지와 위젯에는 노출하지 않는다.

- [ ] **Step 4: EmptyState와 StatusMessage 구현**

`src/shared/ui/empty-state/empty_state.tsx`:

```tsx
import { Button } from '@/shared/ui/button';

import './empty_state.css';

export function EmptyState({
  actionLabel,
  description,
  onAction,
  title,
}: {
  actionLabel: string;
  description: string;
  onAction: () => void;
  title: string;
}) {
  return (
    <section className="empty-state" aria-labelledby="empty-state-title">
      <div className="empty-state__mark" aria-hidden="true" />
      <h2 id="empty-state-title">{title}</h2>
      <p>{description}</p>
      <Button hierarchy="secondary" onClick={onAction}>
        {actionLabel}
      </Button>
    </section>
  );
}
```

`src/shared/ui/status-message/status_message.tsx`:

```tsx
import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

import './status_message.css';

export type StatusMessageVariant = 'error' | 'success';

export function StatusMessage({
  children,
  id,
  title,
  variant,
}: {
  children: ReactNode;
  id?: string;
  title: string;
  variant: StatusMessageVariant;
}) {
  const StatusIcon = variant === 'error' ? AlertCircle : CheckCircle2;

  return (
    <section
      className={`status-message status-message--${variant}`}
      id={id}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <StatusIcon aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <div>{children}</div>
      </div>
    </section>
  );
}
```

`src/shared/ui/loading-state/loading_state.tsx`:

```tsx
import './loading_state.css';

export function LoadingState({ label = '불러오는 중' }: { label?: string }) {
  return (
    <section className="loading-state" role="status" aria-label={label}>
      <div className="loading-state__grid" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="loading-state__card" key={index}>
            <span />
            <i />
            <i />
          </div>
        ))}
      </div>
    </section>
  );
}
```

Empty, loading, status CSS는 1px border와 토큰 색만 사용한다. LoadingState는 Mist 정적 면만 사용하고 shimmer, pulse, 반복 애니메이션을 사용하지 않는다.

- [ ] **Step 5: public API와 테스트 갱신**

`src/shared/ui/index.ts`에 `CategoryFilter`, `NavigationBar`, `EmptyState`, `LoadingState`, `StatusMessage`와 관련 타입의 named export를 추가한다.

Run:

```sh
npm test -- src/shared/ui/category-filter/category_filter.test.tsx src/shared/ui/navigation-bar/navigation_bar.test.tsx src/shared/ui/empty-state/empty_state.test.tsx src/shared/ui/loading-state/loading_state.test.tsx src/shared/ui/status-message/status_message.test.tsx
npm run build
```

Expected: all tests PASS and build succeeds.

- [ ] **Step 6: 복합 UI 경계 커밋**

```sh
git add src/shared/ui
git commit -m "feat: 필터와 상태 UI 경계 추가"
```

## Task 5: 파일 네이밍 정규화와 named export 전환

**Files:**

- Rename: `src/app/App.tsx` → `src/app/app.tsx`
- Rename: `src/app/App.test.tsx` → `src/app/app.test.tsx`
- Rename: `src/pages/landing/ui/LandingPage.tsx` → `src/pages/landing/ui/landing_page.tsx`
- Rename: `src/pages/landing/ui/LandingPage.test.tsx` → `src/pages/landing/ui/landing_page.test.tsx`
- Rename: `src/pages/landing/ui/OnboardingMotionPreview.tsx` → `src/pages/landing/ui/onboarding_motion_preview.tsx`
- Rename: `src/pages/landing/ui/OnboardingMotionPreview.test.tsx` → `src/pages/landing/ui/onboarding_motion_preview.test.tsx`
- Rename: `src/pages/landing/ui/landing-page.css` → `src/pages/landing/ui/landing_page.css`
- Modify: `src/app/index.ts`
- Modify: `src/pages/landing/index.ts`
- Modify: relative imports in renamed files

- [ ] **Step 1: 현재 회귀 테스트를 기준선으로 실행**

Run:

```sh
npm test -- src/app/App.test.tsx src/pages/landing/ui/LandingPage.test.tsx src/pages/landing/ui/OnboardingMotionPreview.test.tsx
```

Expected: all existing test files PASS before the mechanical rename.

- [ ] **Step 2: Windows case-insensitive 파일 시스템을 고려해 두 단계 rename 수행**

각 명령은 개별 실행한다.

```sh
git mv src/app/App.tsx src/app/app_rename.tsx
git mv src/app/app_rename.tsx src/app/app.tsx
git mv src/app/App.test.tsx src/app/app_test_rename.tsx
git mv src/app/app_test_rename.tsx src/app/app.test.tsx
git mv src/pages/landing/ui/LandingPage.tsx src/pages/landing/ui/landing_page_rename.tsx
git mv src/pages/landing/ui/landing_page_rename.tsx src/pages/landing/ui/landing_page.tsx
git mv src/pages/landing/ui/LandingPage.test.tsx src/pages/landing/ui/landing_page_test_rename.tsx
git mv src/pages/landing/ui/landing_page_test_rename.tsx src/pages/landing/ui/landing_page.test.tsx
git mv src/pages/landing/ui/OnboardingMotionPreview.tsx src/pages/landing/ui/onboarding_motion_preview_rename.tsx
git mv src/pages/landing/ui/onboarding_motion_preview_rename.tsx src/pages/landing/ui/onboarding_motion_preview.tsx
git mv src/pages/landing/ui/OnboardingMotionPreview.test.tsx src/pages/landing/ui/onboarding_motion_preview_test_rename.tsx
git mv src/pages/landing/ui/onboarding_motion_preview_test_rename.tsx src/pages/landing/ui/onboarding_motion_preview.test.tsx
git mv src/pages/landing/ui/landing-page.css src/pages/landing/ui/landing_page.css
```

- [ ] **Step 3: 모든 import와 public API를 snake_case 파일명에 맞게 갱신**

`src/app/index.ts`:

```ts
export { App } from './app';
```

`src/pages/landing/index.ts`:

```ts
export { LandingPage } from './ui/landing_page';
```

`landing_page.tsx`와 motion test의 relative import는 `./onboarding_motion_preview`로 바꾸고 stylesheet import는 `./landing_page.css`로 바꾼다. `app.tsx`의 `export default App`을 삭제한다.

- [ ] **Step 4: rename 후 테스트와 default export 부재 확인**

Run:

```sh
npm test -- src/app/app.test.tsx src/pages/landing/ui/landing_page.test.tsx src/pages/landing/ui/onboarding_motion_preview.test.tsx
rg -n "export default|LandingPage\.tsx|OnboardingMotionPreview\.tsx|App\.tsx" src
```

Expected: tests PASS and `rg` returns no matches.

- [ ] **Step 5: 네이밍 정규화 커밋**

```sh
git add src/app src/pages/landing src/main.tsx
git commit -m "refactor: 프론트엔드 파일 네이밍 정리"
```

## Task 6: Insight entity와 필터 로직 추출

**Files:**

- Create: `src/entities/insight/model/insight.ts`
- Create: `src/entities/insight/model/insight.test.ts`
- Create: `src/entities/insight/index.ts`
- Modify: `src/app/app.tsx`

- [ ] **Step 1: 현재 필터 순서와 카테고리 의미를 고정하는 실패 테스트 작성**

`src/entities/insight/model/insight.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { filterInsights } from './insight';
import type { Insight } from './insight';

const INSIGHTS: Insight[] = [
  {
    categories: [{ name: '디자인', tone: 'blue' }],
    domain: 'example.com',
    id: 1,
    memo: '팀 프로젝트 첫 화면',
    thumbnail: 'UI',
    title: '카드 구조',
    url: '#',
  },
  {
    categories: [],
    domain: 'example.dev',
    id: 2,
    memo: '폼 검증',
    thumbnail: 'DEV',
    title: 'React 입력',
    url: '#',
  },
];

describe('filterInsights', () => {
  it('scores non-empty query tokens while preserving the category filter', () => {
    expect(filterInsights(INSIGHTS, '디자인', '팀 프로젝트')).toEqual([
      INSIGHTS[0],
    ]);
  });

  it('keeps uncategorized insight semantics', () => {
    expect(filterInsights(INSIGHTS, '미분류', '')).toEqual([INSIGHTS[1]]);
  });
});
```

- [ ] **Step 2: entity 모듈이 없어 실패하는지 확인**

Run:

```sh
npm test -- src/entities/insight/model/insight.test.ts
```

Expected: FAIL with unresolved module.

- [ ] **Step 3: 도메인 이름 충돌을 제거한 entity 구현**

`src/entities/insight/model/insight.ts`:

```ts
import type { CategoryTone } from '@/shared/ui';

export type InsightCategory = {
  name: string;
  tone: CategoryTone;
};

export type Insight = {
  categories: InsightCategory[];
  domain: string;
  id: number;
  memo?: string;
  thumbnail: string;
  title: string;
  url: string;
};

export function filterInsights(
  insights: Insight[],
  category: string,
  query: string
) {
  const queryTokens = Array.from(
    new Set(query.trim().toLowerCase().split(/\s+/).filter(Boolean))
  );

  return insights
    .map((insight, index) => {
      const matchesCategory =
        category === 'All' ||
        (category === '미분류' && insight.categories.length === 0) ||
        insight.categories.some((item) => item.name === category);
      const haystack = [
        insight.title,
        insight.domain,
        insight.memo ?? '',
        ...insight.categories.map((item) => item.name),
      ]
        .join(' ')
        .toLowerCase();
      const score = queryTokens.reduce(
        (total, token) => total + (haystack.includes(token) ? 1 : 0),
        0
      );

      return { index, insight, matchesCategory, score };
    })
    .filter(({ matchesCategory, score }) => {
      return matchesCategory && (queryTokens.length === 0 || score > 0);
    })
    .sort((current, next) => {
      if (queryTokens.length === 0) {
        return current.index - next.index;
      }

      return next.score - current.score || current.index - next.index;
    })
    .map(({ insight }) => insight);
}
```

`src/entities/insight/index.ts`:

```ts
export { filterInsights } from './model/insight';
export type { Insight, InsightCategory } from './model/insight';
```

`app.tsx`의 로컬 `Category`, `Insight`, `filterInsights` 선언을 제거하고 entity public API를 import한다. `rose` tone은 승인 토큰 이름인 `coral`로 바꾸되 카테고리명과 필터 의미는 유지한다.

- [ ] **Step 4: entity와 앱 회귀 테스트 확인**

Run:

```sh
npm test -- src/entities/insight/model/insight.test.ts src/app/app.test.tsx
npm run build
```

Expected: entity tests and app flow PASS; build succeeds.

- [ ] **Step 5: entity 추출 커밋**

```sh
git add src/entities src/app/app.tsx
git commit -m "refactor: 인사이트 모델과 필터 로직 분리"
```

## Task 7: app 조합과 pages/widgets FSD 분리

**Files:**

- Create: `src/app/authenticated_workspace.tsx`
- Create: `src/app/authenticated_workspace.test.tsx`
- Create: `src/app/model/workspace_seed.ts`
- Create: `src/pages/login/index.ts`
- Create: `src/pages/login/ui/login_page.tsx`
- Create: `src/pages/login/ui/login_page.test.tsx`
- Create: `src/pages/home/index.ts`
- Create: `src/pages/home/ui/home_page.tsx`
- Create: `src/pages/home/ui/home_page.test.tsx`
- Create: `src/pages/library/index.ts`
- Create: `src/pages/library/ui/library_page.tsx`
- Create: `src/pages/library/ui/library_page.test.tsx`
- Create: `src/pages/save/index.ts`
- Create: `src/pages/save/ui/save_page.tsx`
- Create: `src/pages/save/ui/save_page.test.tsx`
- Create: `src/widgets/app-navigation/index.ts`
- Create: `src/widgets/app-navigation/ui/app_navigation.tsx`
- Create: `src/widgets/app-navigation/ui/app_navigation.test.tsx`
- Create: `src/entities/insight/ui/insight_grid.tsx`
- Modify: `src/entities/insight/index.ts`
- Modify: `src/app/app.tsx`

- [ ] **Step 1: 분리된 페이지와 workspace의 실패 테스트 작성**

`login_page.test.tsx`는 `환영합니다!`, `Google로 시작하기`, `서비스 소개로`를 찾고 두 callback을 각각 검증한다. `home_page.test.tsx`는 추천 상황 클릭과 submit callback을 검증한다. `library_page.test.tsx`는 결과가 없을 때 이유와 `전체 보기` action을 검증한다. `save_page.test.tsx`는 URL 입력과 submit을 검증한다. `app_navigation.test.tsx`는 `보관함`, `홈`, `저장`의 label과 typed callback을 검증한다.

`src/app/authenticated_workspace.test.tsx`의 핵심 회귀 테스트:

```tsx
it('keeps navigation, filtering, retrieve, and save flows available', async () => {
  const user = userEvent.setup();
  renderWorkspace();

  await user.click(screen.getByRole('button', { name: '보관함' }));
  expect(screen.getByRole('heading', { name: '전체 인사이트' })).not.toBeNull();

  await user.click(screen.getByRole('button', { name: '저장' }));
  expect(
    screen.getByRole('heading', { name: 'URL만 넣고 바로 보관해요' })
  ).not.toBeNull();
});
```

- [ ] **Step 2: 새 slice 모듈 부재로 실패하는지 확인**

Run:

```sh
npm test -- src/pages/login/ui/login_page.test.tsx src/pages/home/ui/home_page.test.tsx src/pages/library/ui/library_page.test.tsx src/pages/save/ui/save_page.test.tsx src/widgets/app-navigation/ui/app_navigation.test.tsx src/app/authenticated_workspace.test.tsx
```

Expected: FAIL with unresolved page, widget, and workspace modules.

- [ ] **Step 3: LoginPage와 AppNavigation을 먼저 추출**

`src/pages/login/ui/login_page.tsx`:

```tsx
import { Button } from '@/shared/ui';

export function LoginPage({
  onBack,
  onLogin,
}: {
  onBack: () => void;
  onLogin: () => void;
}) {
  return (
    <main className="login-shell" aria-labelledby="login-title">
      <section className="login-panel">
        <Button hierarchy="ghost" onClick={onBack} type="button">
          서비스 소개로
        </Button>
        <p className="eyebrow">로그인</p>
        <h1 id="login-title">환영합니다!</h1>
        <p className="login-description">
          로그인 후 나만의 보관함과 꺼내보기를 사용할 수 있어요.
        </p>
        <Button
          fullWidth
          hierarchy="primary"
          onClick={onLogin}
          size="large"
          type="button"
        >
          Google로 시작하기
        </Button>
        <p className="terms-notice">
          로그인 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
        </p>
      </section>
    </main>
  );
}
```

`src/widgets/app-navigation/ui/app_navigation.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Bookmark, Home, PlusCircle } from 'lucide-react';

import { NavigationBar } from '@/shared/ui';

export type WorkspaceTab = 'home' | 'library' | 'save';

const NAVIGATION_ITEMS = [
  { icon: <Bookmark aria-hidden="true" />, label: '보관함', value: 'library' },
  { icon: <Home aria-hidden="true" />, label: '홈', value: 'home' },
  { icon: <PlusCircle aria-hidden="true" />, label: '저장', value: 'save' },
] satisfies Array<{
  icon: ReactNode;
  label: string;
  value: WorkspaceTab;
}>;

export function AppNavigation({
  onTabChange,
  tab,
}: {
  onTabChange: (tab: WorkspaceTab) => void;
  tab: WorkspaceTab;
}) {
  return (
    <NavigationBar
      items={NAVIGATION_ITEMS}
      onValueChange={onTabChange}
      value={tab}
    />
  );
}
```

- [ ] **Step 4: InsightGrid와 세 workspace page를 추출**

`InsightGrid`는 현재 `app.tsx:692-729`의 카드 마크업을 `src/entities/insight/ui/insight_grid.tsx`로 옮기고 WDS `Chip` 대신 `CategoryTag`를 사용한다. 공개 signature는 다음과 같다.

```tsx
import type { Insight } from '@/entities/insight';
import { CategoryTag } from '@/shared/ui';

export function InsightGrid({ insights }: { insights: Insight[] }) {
  return (
    <div className="insight-grid">
      {insights.map((insight) => (
        <article className="insight-card" key={insight.id}>
          <div className="insight-card__thumbnail" aria-hidden="true">
            {insight.thumbnail}
          </div>
          <div className="insight-card__body">
            <p className="insight-card__domain">{insight.domain}</p>
            <h3>{insight.title}</h3>
            {insight.memo ? <p>{insight.memo}</p> : null}
            <ul aria-label="카테고리 목록">
              {insight.categories.map((category) => (
                <li key={category.name}>
                  <CategoryTag tone={category.tone}>
                    {category.name}
                  </CategoryTag>
                </li>
              ))}
            </ul>
          </div>
          <a className="insight-card__link" href={insight.url}>
            원문 열기
          </a>
        </article>
      ))}
    </div>
  );
}
```

각 page는 현재 함수의 JSX와 문구를 유지하되 다음 제품 props만 공개한다.

```ts
export type HomePageProps = {
  onOpenLibrary: () => void;
  onQueryChange: (value: string) => void;
  onRetrieve: (event: FormEvent<HTMLFormElement>) => void;
  onSituationClick: (situation: SuggestedSituation) => void;
  query: string;
  results: Insight[];
  selectedSituation: string;
};

export type SuggestedSituation = {
  label: string;
  query: string;
};

export type LibraryPageProps = {
  activeCategory: string;
  insights: Insight[];
  loading?: boolean;
  onCategoryChange: (category: string) => void;
  onOpenSave: () => void;
};

export type SavePageProps = {
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onSaveCompleteChange: (value: boolean) => void;
  onUrlChange: (value: string) => void;
  saveComplete: boolean;
  saveUrl: string;
};
```

HomePage는 `Button`, `ChoiceChip`, `TextField`, `EmptyState`; LibraryPage는 `CategoryFilter`, `InsightGrid`, `EmptyState`, `LoadingState`; SavePage는 `Button`, `CategoryTag`, `TextArea`, `TextField`, `StatusMessage`만 public API에서 import한다. LibraryPage는 `loading`이 true면 결과와 빈 상태 대신 `LoadingState label="보관함을 불러오는 중"`을 렌더링한다. 화면 파일에는 `@wanteddev/*` import가 없어야 한다.

- [ ] **Step 5: workspace seed와 조합 컴포넌트 구현**

`workspace_seed.ts`로 현재 `app.tsx`의 `categoryFilters`, `initialInsights`, `suggestedCategories`, `suggestedSituations` literal을 항목 누락 없이 옮긴다. 각각 `CATEGORY_FILTERS`, `INITIAL_INSIGHTS`, `SUGGESTED_CATEGORIES`, `SUGGESTED_SITUATIONS`로 이름을 바꾸고 `CategoryFilterOption[]`, `Insight[]`, `InsightCategory[]`, `SuggestedSituation[]` 타입을 명시한다. `tabs`는 `AppNavigation`이 소유하므로 seed로 옮기지 않는다.

`AuthenticatedWorkspace`는 현재 state와 handler를 보존하되 page에는 의미 기반 callback을 전달한다. 탭 조합은 다음 구조로 고정한다.

```tsx
{
  activeTab === 'library' ? <LibraryPage {...libraryProps} /> : null;
}
{
  activeTab === 'home' ? <HomePage {...homeProps} /> : null;
}
{
  activeTab === 'save' ? <SavePage {...saveProps} /> : null;
}
<AppNavigation onTabChange={setActiveTab} tab={activeTab} />;
```

`app.tsx`는 인증 진입 상태만 소유한다.

```tsx
import { useState } from 'react';

import { LandingPage } from '@/pages/landing';
import { LoginPage } from '@/pages/login';

import { AuthenticatedWorkspace } from './authenticated_workspace';

type AuthEntryView = 'login' | 'onboarding' | 'workspace';

export function App() {
  const [view, setView] = useState<AuthEntryView>('onboarding');

  if (view === 'onboarding') {
    return <LandingPage onStart={() => setView('login')} />;
  }

  if (view === 'login') {
    return (
      <LoginPage
        onBack={() => setView('onboarding')}
        onLogin={() => setView('workspace')}
      />
    );
  }

  return <AuthenticatedWorkspace />;
}
```

- [ ] **Step 6: public API와 FSD import 검증**

각 page/widget/entity `index.ts`는 필요한 컴포넌트와 타입만 named export한다. 그런 다음 실행한다.

```sh
npm test -- src/pages/login/ui/login_page.test.tsx src/pages/home/ui/home_page.test.tsx src/pages/library/ui/library_page.test.tsx src/pages/save/ui/save_page.test.tsx src/widgets/app-navigation/ui/app_navigation.test.tsx src/app/authenticated_workspace.test.tsx src/app/app.test.tsx
rg -n "@wanteddev/wds|@wanteddev/wds-icon" src/app src/pages src/widgets src/entities
npm run build
```

Expected: all tests PASS; `rg` returns no matches outside `src/shared/ui`; build succeeds.

- [ ] **Step 7: FSD 분리 커밋**

```sh
git add src/app src/entities src/pages src/widgets
git commit -m "refactor: 화면과 작업 공간 구조 분리"
```

## Task 8: 전역 White Canvas 기반과 로그인 화면

**Files:**

- Modify: `index.html`
- Modify: `src/app/styles/global.css`
- Create: `src/pages/login/ui/login_page.css`
- Modify: `src/pages/login/ui/login_page.tsx`
- Modify: `src/pages/login/ui/login_page.test.tsx`

- [ ] **Step 1: 로그인 화면의 시각·접근성 계약 테스트 추가**

```tsx
it('keeps one clear login action and the terms notice', () => {
  renderLoginPage();

  expect(screen.getAllByRole('button')).toHaveLength(2);
  expect(
    screen
      .getByRole('button', { name: 'Google로 시작하기' })
      .classList.contains('ui-button--primary')
  ).toBe(true);
  expect(screen.getByText(/이용약관 및 개인정보처리방침/)).not.toBeNull();
});
```

- [ ] **Step 2: 기존 화면에서 새 class 계약이 실패하는지 확인**

Run:

```sh
npm test -- src/pages/login/ui/login_page.test.tsx
```

Expected: FAIL until the page imports its new stylesheet and uses the final structure.

- [ ] **Step 3: 전역 CSS를 토큰 소비 전용 기반으로 교체**

`global.css`의 `:root` 원시 토큰을 제거하고 reset, body, heading/paragraph margin, link, visible focus, visually-hidden을 새 토큰으로 바꾼다. 이 Task에서는 새 `login_page.css`로 옮긴 로그인 selector만 제거한다. 아직 slice CSS가 준비되지 않은 workspace selector는 Task 11~13까지 그대로 유지해 중간 커밋의 화면이 무너지지 않게 한다. 핵심 전역 규칙은 다음과 같다.

```css
:root {
  color: var(--color-ink);
  background: var(--color-canvas);
  font-family: var(--typography-font-family);
  font-variant-numeric: tabular-nums;
}

* {
  box-sizing: border-box;
}

html {
  background: var(--color-canvas);
}

body {
  min-width: 320px;
  margin: 0;
  background: var(--color-canvas);
}

button,
input,
textarea {
  font: inherit;
}

button:focus-visible,
a:focus-visible,
input:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--color-electric-blue);
  outline-offset: 2px;
}
```

기존 `:root` hex 토큰, 로그인 selector, shadow 변수 정의를 제거한다. 남아 있는 workspace selector의 원시값은 각 화면 Task에서 CSS를 이동하면서 제거하고, 최종적으로 승인된 custom property만 남긴다.

- [ ] **Step 4: 로그인 White Canvas CSS 적용과 구형 폰트 제거**

`login_page.tsx`에서 `./login_page.css`를 import한다. CSS는 430px 폼 폭, 흰 캔버스, 1px `--color-ash` 경계, 16px radius, 그림자 없음, 32/40 제목, 16/26 본문, 모바일 16px 좌우 여백을 사용한다.

`index.html`에서 Google Fonts preconnect와 `DM Mono`, `Gowun Batang` stylesheet를 삭제한다. favicon은 signal green 또는 charcoal의 자체 data URI로 바꾸고 외부 레퍼런스 텍스트는 추가하지 않는다.

- [ ] **Step 5: 로그인과 전체 회귀 검증**

Run:

```sh
npm test -- src/pages/login/ui/login_page.test.tsx src/app/app.test.tsx
npm run lint
npm run build
```

Expected: tests, lint, and build PASS.

- [ ] **Step 6: 전역 기반과 로그인 커밋**

```sh
git add index.html src/app/styles/global.css src/pages/login
git commit -m "feat: 화이트 캔버스 로그인 화면 적용"
```

## Task 9: 온보딩 정적 White Canvas 화면과 Signature Inline Label

**Files:**

- Modify: `src/pages/landing/ui/landing_page.tsx`
- Modify: `src/pages/landing/ui/landing_page.test.tsx`
- Replace: `src/pages/landing/ui/landing_page.css`

- [ ] **Step 1: 새 Hero와 인라인 라벨 사용 한계 테스트 작성**

```tsx
it('renders two signature labels in the hero without changing its meaning', () => {
  renderLandingPage();

  expect(
    screen.getByRole('heading', {
      name: /저장한 링크를 필요한 순간 다시 꺼내보세요/,
    })
  ).not.toBeNull();
  expect(document.querySelectorAll('.landing-hero .inline-label')).toHaveLength(
    2
  );
});

it('does not use signature labels for product controls', () => {
  renderLandingPage();

  screen.getAllByRole('button').forEach((button) => {
    expect(button.querySelector('.inline-label')).toBeNull();
  });
});
```

- [ ] **Step 2: 기존 Hero에서 라벨 테스트가 실패하는지 확인**

Run:

```sh
npm test -- src/pages/landing/ui/landing_page.test.tsx
```

Expected: FAIL because the Hero has no `.inline-label` elements.

- [ ] **Step 3: Hero와 일반 섹션 마크업을 White Canvas 구조로 정리**

Hero 제목은 다음 exact structure를 사용한다.

```tsx
<h1 id="onboarding-title">
  저장한{' '}
  <InlineLabel emoji="🔖" tone="blue">
    링크
  </InlineLabel>
  를
  <br />
  필요한 순간{' '}
  <InlineLabel emoji="✨" tone="green">
    다시 꺼내보세요
  </InlineLabel>
</h1>
```

상단 brand mark는 signal green 작은 사각형과 `아맞다` 텍스트로 구성한다. Primary CTA는 `Button hierarchy="primary"`, 보조 설명은 Smoke 텍스트로 둔다. 우측 preview는 그림자나 회전 없이 1px 경계 카드 3개가 상황 문장 아래에 정렬된 정적 최종 상태를 기본 DOM으로 사용한다.

문제·저장·장점 섹션은 기존 문구와 순서를 유지하되 다음 공통 구조를 사용한다.

```tsx
<section className="landing-section" aria-labelledby="onboarding-problem-title">
  <div className="landing-section__heading">
    <p className="landing-section__eyebrow">01 · 문제</p>
    <h2 id="onboarding-problem-title">저장해도 다시 찾기 어려웠던 이유</h2>
    <p>
      유용한 링크는 많이 저장하지만, 필요한 순간에는 제목과 저장 위치가 잘
      떠오르지 않습니다.
    </p>
  </div>
  <div className="landing-card-grid">
    {problemItems.map((item) => (
      <article className="landing-card" key={item.number}>
        <span>{item.number}</span>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </article>
    ))}
  </div>
</section>
```

Hero 이외에는 섹션 제목 하나에만 InlineLabel을 최대 1개 허용한다. `Button`, filter, category, 상태 UI에는 사용하지 않는다.

- [ ] **Step 4: landing CSS를 승인 수치로 전면 교체**

필수 CSS 계약:

```css
.landing-page {
  min-height: 100vh;
  overflow: clip;
  background: var(--color-canvas);
  color: var(--color-ink);
}

.landing-hero,
.landing-section,
.motion-chapter {
  width: min(var(--layout-content-width), calc(100% - 40px));
  margin: 0 auto;
}

.landing-hero__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(420px, 0.95fr);
  gap: var(--spacing-12);
  align-items: center;
  min-height: calc(100vh - 72px);
}

.landing-hero h1 {
  font-size: var(--typography-hero-size);
  line-height: var(--typography-hero-line-height);
  letter-spacing: -0.055em;
}

.landing-card,
.landing-preview {
  border: 1px solid var(--color-ash);
  border-radius: var(--radius-card);
  background: var(--color-canvas);
}
```

1200px 이상 Hero 2열, 768~1199px Hero 1열·카드 2열, 767px 이하 카드 1열·CTA 전체 너비를 구현한다. 격자 배경, 종이 질감, serif/mono font, 오프셋 shadow, 회전, pill형 archive index, 대면적 coral/yellow 배경을 모두 제거한다.

- [ ] **Step 5: 온보딩 정적 화면 검증**

Run:

```sh
npm test -- src/pages/landing/ui/landing_page.test.tsx src/app/app.test.tsx
rg -n "Gowun Batang|DM Mono|shadow-paper|color-paper|color-cobalt|color-yellow|color-leaf" src index.html
npm run build
```

Expected: tests PASS, legacy visual terms return no matches, build succeeds.

- [ ] **Step 6: 온보딩 정적 디자인 커밋**

```sh
git add src/pages/landing index.html
git commit -m "feat: 화이트 캔버스 온보딩 적용"
```

## Task 10: 온보딩 단일 GSAP 장면 절제

**Files:**

- Modify: `src/pages/landing/ui/onboarding_motion_preview.tsx`
- Modify: `src/pages/landing/ui/onboarding_motion_preview.test.tsx`
- Modify: `src/pages/landing/ui/landing_page.css`

- [ ] **Step 1: reduced motion과 desktop-only pin 계약 테스트 작성**

기존 reduced motion test를 유지하고 일반 motion test를 추가한다.

```tsx
it('creates one desktop media timeline without a mobile pin timeline', () => {
  const add = vi.fn();
  const revert = vi.fn();
  gsapMocks.matchMedia.mockReturnValue({ add, revert });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    }),
  });

  render(<OnboardingMotionPreview />);

  expect(add).toHaveBeenCalledTimes(1);
  expect(add).toHaveBeenCalledWith('(min-width: 768px)', expect.any(Function));
});
```

- [ ] **Step 2: 현재 desktop/mobile 두 timeline 때문에 실패하는지 확인**

Run:

```sh
npm test -- src/pages/landing/ui/onboarding_motion_preview.test.tsx
```

Expected: FAIL because the current implementation registers two media branches.

- [ ] **Step 3: timeline을 한 desktop 장면으로 축소**

motion setup은 다음 수치만 사용한다.

```ts
const timeline = gsap.timeline({
  scrollTrigger: {
    anticipatePin: 1,
    end: '+=100%',
    invalidateOnRefresh: true,
    pin: true,
    scrub: 0.65,
    start: 'top top',
    trigger: root,
  },
});

timeline
  .from('.motion-query', {
    autoAlpha: 0,
    duration: 0.2,
    y: 12,
  })
  .from(
    '.motion-source-card',
    {
      autoAlpha: 0,
      duration: 0.2,
      stagger: 0.06,
      y: 12,
    },
    0.08
  )
  .from('.motion-connector', {
    autoAlpha: 0,
    duration: 0.18,
    stagger: 0.05,
    y: 8,
  })
  .from('.motion-pack', {
    autoAlpha: 0,
    duration: 0.2,
    y: 12,
  });
```

rotation, scale, x 이동, 모바일 timeline을 제거한다. DOM은 animation 전에도 최종 상태로 읽히게 유지한다. `prefers-reduced-motion`이면 `gsap.matchMedia()`를 호출하지 않는다.

- [ ] **Step 4: CSS fallback과 모바일 non-pin 확인**

기본 CSS에 `opacity: 1`과 최종 위치를 선언하고 GSAP만 inline style을 일시 적용하게 한다. `@media (max-width: 767px)`에서는 sticky/pin 전제 높이를 제거한다. `@media (prefers-reduced-motion: reduce)`에서는 transition과 animation duration을 최소화한다.

- [ ] **Step 5: 모션 회귀 검증**

Run:

```sh
npm test -- src/pages/landing/ui/onboarding_motion_preview.test.tsx src/pages/landing/ui/landing_page.test.tsx
rg -n "rotation|scale: 0\.96|\+=140%|max-width: 767px.*timeline" src/pages/landing/ui/onboarding_motion_preview.tsx
npm run build
```

Expected: tests PASS, legacy motion values return no matches, build succeeds.

- [ ] **Step 6: 절제된 온보딩 모션 커밋**

```sh
git add src/pages/landing/ui/onboarding_motion_preview.tsx src/pages/landing/ui/onboarding_motion_preview.test.tsx src/pages/landing/ui/landing_page.css
git commit -m "feat: 온보딩 연결 모션 절제"
```

## Task 11: 작업 공간 shell과 AppNavigation 시각 통합

**Files:**

- Create: `src/app/styles/authenticated_workspace.css`
- Modify: `src/app/styles/global.css`
- Modify: `src/app/authenticated_workspace.tsx`
- Modify: `src/app/authenticated_workspace.test.tsx`
- Create: `src/widgets/app-navigation/ui/app_navigation.css`
- Modify: `src/widgets/app-navigation/ui/app_navigation.tsx`
- Modify: `src/widgets/app-navigation/ui/app_navigation.test.tsx`
- Modify: `src/shared/ui/navigation-bar/navigation_bar.css`

- [ ] **Step 1: workspace header와 navigation 상태 테스트 추가**

```tsx
it('uses semantic workspace navigation and exposes the active page', async () => {
  const user = userEvent.setup();
  renderWorkspace();

  expect(screen.getByRole('navigation', { name: '주요 화면' })).not.toBeNull();
  expect(
    screen.getByRole('button', { name: '홈' }).getAttribute('aria-current')
  ).toBe('page');

  await user.click(screen.getByRole('button', { name: '보관함' }));
  expect(screen.getByRole('heading', { name: '보관함' })).not.toBeNull();
});
```

- [ ] **Step 2: 현재 shell class와 활성 상태가 새 계약을 만족하지 않아 실패하는지 확인**

Run:

```sh
npm test -- src/app/authenticated_workspace.test.tsx src/widgets/app-navigation/ui/app_navigation.test.tsx
```

Expected: FAIL until shell and navigation structure are updated.

- [ ] **Step 3: 1200px 작업 공간 shell 구현**

`AuthenticatedWorkspace` root는 `.workspace-shell`, header는 `.workspace-header`, page container는 `.workspace-main`을 사용한다. 브랜드 마크는 signal green 사각형과 텍스트로 구성하고, 연결 상태는 product status text로만 표시한다.

```css
.workspace-shell {
  width: min(var(--layout-content-width), calc(100% - 32px));
  min-height: 100vh;
  margin: 0 auto;
  padding: var(--spacing-4) 0 calc(88px + var(--spacing-6));
}

.workspace-main {
  min-height: 680px;
  border-top: 1px solid var(--color-ash);
  padding: var(--spacing-8) 0 var(--spacing-20);
}
```

기존 `.avatar` 원형 그라데이션, `.pro-button` pill, `.board` 둥근 상단 카드, tip banner 그림자를 제거한다. 화면 안내가 필요하면 `.workspace-note`의 얇은 Mist 표면으로 표현한다.

새 shell/navigation CSS를 import한 뒤 `global.css`에서 `.workspace`, `.workspace-header`, `.identity`, `.avatar`, `.pro-button`, `.board`, `.bottom-nav`, `.tip-banner`와 해당 responsive override를 제거한다. Home, Library, Insight, Save selector는 다음 Task까지 유지한다.

- [ ] **Step 4: AppNavigation을 평평한 고정 내비게이션으로 구현**

NavigationBar는 1px Ash 경계, 흰 배경, 최대 420px, 16px outer radius를 사용한다. backdrop blur와 shadow를 제거한다. active item은 차콜 텍스트·Mist 배경·`aria-current="page"`를 함께 사용하고 최소 높이 48px을 확보한다.

- [ ] **Step 5: shell과 navigation 검증**

Run:

```sh
npm test -- src/app/authenticated_workspace.test.tsx src/widgets/app-navigation/ui/app_navigation.test.tsx
npm run build
```

Expected: tests PASS and build succeeds.

- [ ] **Step 6: workspace shell 커밋**

```sh
git add src/app/authenticated_workspace.tsx src/app/authenticated_workspace.test.tsx src/app/styles/authenticated_workspace.css src/app/styles/global.css src/widgets/app-navigation src/shared/ui/navigation-bar
git commit -m "feat: 작업 공간과 내비게이션 통합"
```

## Task 12: Home, Library, Insight 카드 White Canvas 적용

**Files:**

- Modify: `src/app/styles/global.css`
- Create: `src/pages/home/ui/home_page.css`
- Modify: `src/pages/home/ui/home_page.tsx`
- Modify: `src/pages/home/ui/home_page.test.tsx`
- Create: `src/pages/library/ui/library_page.css`
- Modify: `src/pages/library/ui/library_page.tsx`
- Modify: `src/pages/library/ui/library_page.test.tsx`
- Create: `src/entities/insight/ui/insight_grid.css`
- Modify: `src/entities/insight/ui/insight_grid.tsx`
- Create: `src/entities/insight/ui/insight_grid.test.tsx`

- [ ] **Step 1: 검색, filter, card, empty 상태 테스트 작성**

HomePage test는 visible label `지금 꺼내보고 싶은 상황`, Primary `꺼내보기`, 선택 chip의 `aria-pressed`를 검증한다. LibraryPage test는 `CategoryFilter`가 category callback을 전달하고 empty state가 이유와 다음 행동 하나만 보여주는지 검증한다. `loading: true` fixture에서는 `role="status"`의 `보관함을 불러오는 중`과 정적 skeleton을 렌더링하고 InsightGrid를 숨기는지 검증한다.

`insight_grid.test.tsx`:

```tsx
it('renders a flat card with metadata, categories, and one source action', () => {
  render(<InsightGrid insights={[INSIGHT]} />);

  const card = screen.getByRole('article');
  expect(card.classList.contains('insight-card')).toBe(true);
  expect(screen.getByRole('link', { name: '원문 열기' })).not.toBeNull();
  expect(screen.getByRole('list', { name: '카테고리 목록' })).not.toBeNull();
});
```

- [ ] **Step 2: 화면 전용 CSS와 새 empty action 계약이 없어 실패하는지 확인**

Run:

```sh
npm test -- src/pages/home/ui/home_page.test.tsx src/pages/library/ui/library_page.test.tsx src/entities/insight/ui/insight_grid.test.tsx
```

Expected: FAIL until final markup and tests align.

- [ ] **Step 3: HomePage 계층 구현**

Home Hero는 left-aligned max-width 820px, 32/40 screen title, 16/26 body를 사용한다. 검색 row는 desktop에서 input+CTA, 767px 이하에서 1열·전체 너비 CTA로 바꾼다. 추천 상황은 Signature Inline Label이 아니라 중립 `ChoiceChip` grid로 유지한다.

결과 heading은 title과 count를 같은 baseline에 놓고 3/2/1열 InsightGrid를 사용한다. 결과가 없으면 이유와 `보관함 보기` 하나만 제공한다.

- [ ] **Step 4: LibraryPage와 InsightCard 구현**

Library는 검색과 category filter를 page 상단 작업 영역에 정렬한다. active filter는 색상뿐 아니라 `aria-pressed` 또는 외부 category active 상태, weight, 차콜 경계로 구분한다.

```css
.insight-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-4);
}

.insight-card {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 280px;
  overflow: hidden;
  border: 1px solid var(--color-ash);
  border-radius: var(--radius-card);
  background: var(--color-canvas);
}

.insight-card__thumbnail {
  display: grid;
  min-height: 104px;
  place-items: center;
  border-bottom: 1px solid var(--color-ash);
  background: var(--color-mist);
  color: var(--color-electric-blue);
}
```

카드 hover는 border-color만 Fog로 바꾸며 translate와 shadow를 사용하지 않는다. 1199px 이하 2열, 767px 이하 1열을 적용한다.

각 slice/entity CSS를 import한 뒤 `global.css`에서 `.home-board`, `.retrieve-*`, `.situation-grid`, `.library-*`, `.category-*`, `.insight-*`, `.empty-*`와 해당 responsive override를 제거한다. Save selector는 Task 13까지 유지한다.

- [ ] **Step 5: Home/Library/card 검증**

Run:

```sh
npm test -- src/pages/home/ui/home_page.test.tsx src/pages/library/ui/library_page.test.tsx src/entities/insight/ui/insight_grid.test.tsx src/app/authenticated_workspace.test.tsx
npm run build
```

Expected: tests PASS and build succeeds.

- [ ] **Step 6: 조회 화면 디자인 커밋**

```sh
git add src/pages/home src/pages/library src/entities/insight/ui src/app/authenticated_workspace.test.tsx src/app/styles/global.css
git commit -m "feat: 홈과 보관함 디자인 통합"
```

## Task 13: Save 화면의 error/success 상태와 최종 문서·QA

**Files:**

- Modify: `src/app/styles/global.css`
- Create: `src/pages/save/ui/save_page.css`
- Modify: `src/pages/save/ui/save_page.tsx`
- Modify: `src/pages/save/ui/save_page.test.tsx`
- Modify: `src/app/authenticated_workspace.tsx`
- Modify: `src/app/authenticated_workspace.test.tsx`
- Replace: `DESIGN.md`
- Modify: `docs/onboarding.md`
- Modify: `docs/development-architecture.md`
- Modify: `docs/wds-adoption.md`

- [ ] **Step 1: URL 오류와 성공 상태 테스트 작성**

`SavePageProps`에 `errorMessage?: string`을 추가한다.

```tsx
it('connects a visible URL error to the field', () => {
  renderSavePage({ errorMessage: '올바른 URL을 입력해주세요.' });

  expect(screen.getByRole('alert').textContent).toContain(
    '올바른 URL을 입력해주세요.'
  );
  expect(
    screen.getByLabelText('링크 URL').getAttribute('aria-describedby')
  ).toBe('save-url-error');
});

it('shows a restrained success status after saving', () => {
  renderSavePage({ saveComplete: true });

  expect(screen.getByRole('status').textContent).toContain('저장 완료');
});
```

- [ ] **Step 2: 현재 SavePage에 error contract가 없어 실패하는지 확인**

Run:

```sh
npm test -- src/pages/save/ui/save_page.test.tsx
```

Expected: FAIL because `errorMessage` and linked alert are not implemented.

- [ ] **Step 3: URL validation과 상태 표현 구현**

`AuthenticatedWorkspace`에 `saveError` state를 추가한다. submit 시 빈 값 또는 `new URL()` 실패면 입력값을 보존하고 `올바른 URL을 입력해주세요.`를 설정한다. 성공하면 error를 지우고 기존 인사이트 추가와 `saveComplete` 동작을 그대로 수행한다.

SavePage input은 다음 접근성 속성을 사용한다.

```tsx
<TextField
  aria-describedby={errorMessage ? 'save-url-error' : undefined}
  aria-invalid={Boolean(errorMessage)}
  id="save-url"
  invalid={Boolean(errorMessage)}
  onChange={handleUrlChange}
  placeholder="https://example.com/article"
  type="url"
  value={saveUrl}
  width="100%"
/>
```

오류는 `<StatusMessage id="save-url-error" variant="error">`, 성공은 `StatusMessage variant="success"`를 사용한다. 성공 follow-up 안의 추천 카테고리는 `CategoryTag`, 메모는 `TextArea`, `그냥 저장`은 Secondary Button을 사용한다.

- [ ] **Step 4: SavePage White Canvas CSS 적용**

Save content는 최대 720px, 1px Ash 경계, 16px radius, 흰 배경, 24px padding을 사용한다. error는 작은 Error Ink 경계와 텍스트, success는 작은 Signal Green 경계와 텍스트를 사용한다. 색만으로 상태를 구분하지 않고 제목과 설명을 유지한다. 반복 success animation과 그림자를 사용하지 않는다.

`save_page.css`를 import한 뒤 `global.css`에서 `.save-board`, `.save-card`, `.save-form`, `.save-followup`, `.situation-row`와 해당 responsive override를 제거한다. 이 시점의 `global.css`에는 reset과 전역 접근성 규칙만 남아야 한다.

- [ ] **Step 5: 활성 문서 계약 갱신**

`DESIGN.md`를 승인 설계의 다음 런타임 규칙으로 교체한다.

- `tokens.ts`가 값의 단일 런타임 원천이다.
- Paper/Ink/Charcoal/Smoke/Ash/Mist와 Electric Blue/Signal Green/Amber/Coral 역할을 표로 기록한다.
- Button 8px, Input 12px, Card 16px, 기본 1px 경계, 기본 shadow 없음을 기록한다.
- Signature Inline Label의 Hero 2개·section title 1개 제한과 product control 금지를 기록한다.
- 외부 UI 라이브러리 direct import 금지와 `shared/ui` adapter 경계를 기록한다.
- 1200/768/767 breakpoint, 44px target, 2px focus, 4.5:1 대비를 기록한다.
- GSAP 한 장면, desktop pin 90~110%, mobile no pin, reduced motion static fallback을 기록한다.
- loading은 정적 Mist skeleton, empty는 이유+행동 하나, error/success는 text/icon/action 병행 규칙을 기록한다.

`docs/onboarding.md`는 사용자 흐름과 문구를 유지하되 `화면 톤`을 White Canvas 규칙으로 바꾸고, motion 설명을 desktop scroll pin 한 장면·mobile static·reduced motion final state로 갱신한다. `4~6초 반복` 문구는 제거한다.

`docs/development-architecture.md`는 최종 snake_case/FSD tree와 `entities/insight`, `widgets/app-navigation`, `shared/config/design-system`, `shared/ui` import 경계를 반영한다. `docs/wds-adoption.md`는 화면 direct import를 금지하고 provider와 adapter만 WDS를 import하도록 갱신한다.

- [ ] **Step 6: 전체 자동 검증**

Run:

```sh
npx prettier --write DESIGN.md docs/onboarding.md docs/development-architecture.md docs/wds-adoption.md
npx prettier --check DESIGN.md docs/onboarding.md docs/development-architecture.md docs/wds-adoption.md
npm run format
npm run format:check
npm run lint
npm test
npm run build
git diff --check
```

Expected: formatting, lint, all Vitest tests, build, and whitespace checks PASS.

- [ ] **Step 7: 외부 UI import와 토큰 원시값 정적 검사**

Run:

```sh
rg -n "@wanteddev/wds|@wanteddev/wds-icon" src/app src/pages src/widgets src/entities
rg -n "#[0-9a-fA-F]{3,8}" src --glob "*.css"
rg -n "export default" src
```

Expected: first and third commands return no matches. CSS hex command returns no matches outside external package CSS because product CSS consumes injected variables only.

- [ ] **Step 8: 브라우저 반응형·접근성 QA**

Run development server:

```sh
npm run dev:client -- --host 127.0.0.1 --port 4173
```

브라우저에서 `http://127.0.0.1:4173`을 열고 다음 exact matrix를 확인한다.

1. 1440×1000: Hero 2열, CTA 첫 viewport, single pin 시작/종료, workspace 카드 3열.
2. 1024×900: Hero 1열, 섹션 64px 간격, workspace 카드 2열, 내비게이션 겹침 없음.
3. 390×844: Inline Label 자연 줄바꿈, CTA full width, pin 없음, 카드 1열, 가로 overflow 없음.
4. `prefers-reduced-motion: reduce`: motion timeline 없이 최종 작업팩과 CTA 표시.
5. 키보드: 소개 CTA → 뒤로 → 로그인 → 홈 → 보관함 → 저장 순서로 focus 표시와 44px target 확인.
6. 상태: 빈 검색 결과, 잘못된 URL error, 저장 success의 제목·설명·행동 확인.
7. 온보딩, 로그인, 홈, 보관함, 저장의 1440px/390px screenshot을 남겨 시각 일관성을 비교한다.

시각 조정은 승인된 token 값 안에서 spacing과 layout만 조절한다. 새로운 색, shadow, radius를 추가하지 않는다.

- [ ] **Step 9: Save와 문서 커밋**

```sh
git add src/pages/save src/app/authenticated_workspace.tsx src/app/authenticated_workspace.test.tsx src/app/styles/global.css DESIGN.md docs/onboarding.md docs/development-architecture.md docs/wds-adoption.md
git commit -m "feat: 저장 상태와 디자인 시스템 완성"
```

- [ ] **Step 10: QA 조정이 생겼다면 별도 커밋**

QA에서 실제로 수정한 반응형 CSS와 관련 테스트만 명시적으로 stage한다.

```sh
git add src/app/styles/authenticated_workspace.css src/entities/insight/ui/insight_grid.css src/pages/home/ui/home_page.css src/pages/landing/ui/landing_page.css src/pages/library/ui/library_page.css src/pages/save/ui/save_page.css src/widgets/app-navigation/ui/app_navigation.css
git commit -m "style: 반응형 디자인 마무리"
```

수정 사항이 없으면 이 커밋 단계는 실행하지 않는다.

## 완료 체크

- [ ] `tokens.ts`가 모든 제품 토큰 값의 단일 런타임 원천이다.
- [ ] `apply_design_tokens.ts`만 DOM custom property 적용을 담당한다.
- [ ] app/pages/widgets/entities는 WDS를 직접 import하지 않는다.
- [ ] 변경된 TS/TSX 파일명은 snake_case이고 export는 named export다.
- [ ] 온보딩, 로그인, 작업 공간이 흰 캔버스·차콜 CTA·Electric Blue·Signal Green 규칙을 공유한다.
- [ ] Signature Inline Label은 Hero 최대 2개, section title 최대 1개이며 제품 제어에 쓰이지 않는다.
- [ ] GSAP은 온보딩 한 장면에만 있고 모바일과 reduced motion은 정적 fallback을 제공한다.
- [ ] loading은 정적 Mist skeleton, empty/error/success는 텍스트와 다음 행동을 포함한다.
- [ ] 검색, filter, navigation, save 동작과 인증 진입 흐름이 회귀 테스트를 통과한다.
- [ ] 1440px, 1024px, 390px과 keyboard/reduced-motion QA가 완료됐다.
- [ ] `DESIGN.md`, `docs/onboarding.md`, 아키텍처와 WDS 문서가 구현과 일치한다.
