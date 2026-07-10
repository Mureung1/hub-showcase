# Onboarding Style Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `Living Archive × Swiss Index` 콘셉트로 로그인 전 온보딩을 재구성하고, 핵심 저장물이 현재 상황을 기준으로 작업팩이 되는 장면을 GSAP으로 구현한다.

**Architecture:** `App.tsx`가 소유한 인증 진입 상태는 유지하고 온보딩 화면을 `src/pages/landing` slice로 분리한다. `LandingPage`는 정적 섹션 조합과 로그인 진입 callback을 맡고, `OnboardingMotionPreview`는 GSAP·ScrollTrigger·reduced motion을 단독으로 캡슐화한다. 디자인 토큰은 전역에 두되 온보딩 전용 레이아웃과 장식은 page slice CSS에 둔다.

**Tech Stack:** React 19, TypeScript, WDS, GSAP 3, `@gsap/react`, ScrollTrigger, Vitest, Testing Library, CSS

---

## File map

| File | Responsibility |
| --- | --- |
| `src/app/App.tsx` | 인증 진입 상태와 workspace 조합. 온보딩 구현 상세 제거 |
| `src/app/App.test.tsx` | 온보딩 → 로그인 → 홈 통합 흐름 보존 |
| `src/app/styles/global.css` | 공통 색상·타이포그래피 토큰과 reset |
| `src/pages/landing/index.ts` | landing slice public API |
| `src/pages/landing/ui/LandingPage.tsx` | Hero, 문제, 저장, 모션, 장점, 최종 CTA 조합 |
| `src/pages/landing/ui/LandingPage.test.tsx` | 온보딩 콘텐츠, CTA, 색인 구조 검증 |
| `src/pages/landing/ui/OnboardingMotionPreview.tsx` | desktop pin timeline, mobile timeline, reduced-motion 정적 대체 |
| `src/pages/landing/ui/OnboardingMotionPreview.test.tsx` | 정적 콘텐츠와 reduced-motion 경계 검증 |
| `src/pages/landing/ui/landing-page.css` | Living Archive × Swiss Index 온보딩 스타일과 responsive 규칙 |

## Task 1: Landing page slice로 온보딩 분리

**Files:**
- Create: `src/pages/landing/index.ts`
- Create: `src/pages/landing/ui/LandingPage.tsx`
- Create: `src/pages/landing/ui/LandingPage.test.tsx`
- Modify: `src/app/App.tsx`
- Test: `src/app/App.test.tsx`

- [ ] **Step 1: landing public API가 아직 없음을 보여주는 실패 테스트 작성**

`src/pages/landing/ui/LandingPage.test.tsx`를 다음 구조로 만든다.

```tsx
/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@wanteddev/wds';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LandingPage } from '@/pages/landing';

afterEach(cleanup);

function renderLandingPage(onStart = vi.fn()) {
  render(
    <ThemeProvider>
      <LandingPage onStart={onStart} />
    </ThemeProvider>
  );

  return onStart;
}

describe('LandingPage', () => {
  it('explains the service before login', () => {
    renderLandingPage();

    expect(
      screen.getByRole('heading', {
        name: '저장한 링크를 필요한 순간 다시 꺼내보세요',
      })
    ).not.toBeNull();
    expect(
      screen.getByRole('heading', { name: '저장은 빠르게, 정리는 나중에' })
    ).not.toBeNull();
  });

  it('starts the login entry from either CTA', async () => {
    const user = userEvent.setup();
    const onStart = renderLandingPage();

    await user.click(screen.getAllByRole('button', { name: '서비스 경험하기' })[0]);

    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: 테스트를 실행해 module 미존재로 실패하는지 확인**

Run: `npm test -- src/pages/landing/ui/LandingPage.test.tsx`

Expected: FAIL with `Failed to resolve import "@/pages/landing"`.

- [ ] **Step 3: 현재 온보딩을 page slice로 이동**

`src/pages/landing/index.ts`:

```ts
export { LandingPage } from './ui/LandingPage';
```

`src/pages/landing/ui/LandingPage.tsx`는 기존 `OnboardingPage`와 정적 `OnboardingPreview`를 이동한 뒤 props를 다음처럼 공개한다.

```tsx
import { Button } from '@wanteddev/wds';

type LandingPageProps = {
  onStart: () => void;
};

export function LandingPage({ onStart }: LandingPageProps) {
  return <OnboardingContent onStart={onStart} />;
}
```

`OnboardingContent`에는 현재 `App.tsx`의 `OnboardingPage`가 반환하는 `<main>` 전체를 문구와 class name 변경 없이 이동한다. 현재 `OnboardingPreview`도 같은 파일의 비공개 함수로 이동한다. 이 단계에서는 구조 분리만 수행하고 시각 변경은 Task 2까지 섞지 않는다.

`src/app/App.tsx`에서는 로컬 `OnboardingPage`, `OnboardingPreview` 정의를 제거하고 public API를 사용한다.

```tsx
import { LandingPage } from '@/pages/landing';

if (authEntryView === 'onboarding') {
  return <LandingPage onStart={() => setAuthEntryView('login')} />;
}
```

- [ ] **Step 4: landing 단위 테스트와 앱 통합 테스트 실행**

Run: `npm test -- src/pages/landing/ui/LandingPage.test.tsx src/app/App.test.tsx`

Expected: 두 test file 모두 PASS. 기존 온보딩 제목과 CTA 개수도 유지.

- [ ] **Step 5: 분리 작업 커밋**

```bash
git add src/app/App.tsx src/pages/landing/index.ts src/pages/landing/ui/LandingPage.tsx src/pages/landing/ui/LandingPage.test.tsx
git commit -m "refactor: 온보딩 페이지 구조 분리"
```

## Task 2: Living Archive × Swiss Index 마크업과 시각 시스템 적용

**Files:**
- Modify: `src/pages/landing/ui/LandingPage.tsx`
- Modify: `src/pages/landing/ui/LandingPage.test.tsx`
- Create: `src/pages/landing/ui/landing-page.css`
- Modify: `src/app/styles/global.css`
- Modify: `index.html`

- [ ] **Step 1: 새 색인 구조를 요구하는 실패 테스트 추가**

`LandingPage.test.tsx`에 다음 테스트를 추가한다.

```tsx
it('uses the archive index structure to explain the journey', () => {
  renderLandingPage();

  expect(screen.getByText('ARCHIVE 001')).not.toBeNull();
  expect(screen.getByText('01 문제')).not.toBeNull();
  expect(screen.getByText('02 저장')).not.toBeNull();
  expect(screen.getByText('03 꺼내보기')).not.toBeNull();
  expect(screen.getByText('기억에는 온기를, 다시 찾는 과정에는 질서를.')).not.toBeNull();
});
```

- [ ] **Step 2: 새 문구가 없어 실패하는지 확인**

Run: `npm test -- src/pages/landing/ui/LandingPage.test.tsx`

Expected: FAIL because `ARCHIVE 001` and the indexed navigation do not exist.

- [ ] **Step 3: 전역 토큰과 폰트 로딩 추가**

`index.html`의 `<head>`에 preconnect와 stylesheet를 추가한다.

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Gowun+Batang:wght@400;700&display=swap"
  rel="stylesheet"
/>
```

`global.css`의 `:root`에 승인된 토큰을 추가하고 기존 제품 토큰은 호환 alias로 유지한다.

```css
:root {
  --color-paper: #f4eddc;
  --color-paper-card: #fffdf6;
  --color-ink: #1c1b17;
  --color-ink-muted: #6b665a;
  --color-cobalt: #315bd2;
  --color-coral: #ff5d3a;
  --color-yellow: #f6cf3f;
  --color-leaf: #53a86a;
  --font-display: 'Gowun Batang', Batang, serif;
  --font-index: 'DM Mono', monospace;
  --shadow-paper: 6px 7px 0 rgba(28, 27, 23, 0.14);
}
```

- [ ] **Step 4: LandingPage 마크업을 승인된 구성으로 변경**

구조는 다음 순서를 지킨다.

```tsx
<main className="landing-page" aria-labelledby="onboarding-title">
  <section className="landing-hero">
    <header className="landing-nav">
      <a className="landing-brand" href="#top" aria-label="아맞다 처음으로">
        아맞다
      </a>
      <nav aria-label="온보딩 섹션">
        <a href="#problem">01 문제</a>
        <a href="#save-flow">02 저장</a>
        <a href="#retrieve-flow">03 꺼내보기</a>
      </nav>
    </header>
    <div className="landing-hero__grid" id="top">
      <div className="landing-hero__copy">
        <span className="archive-index">ARCHIVE 001</span>
        <h1 id="onboarding-title">저장한 링크를 필요한 순간 다시 꺼내보세요</h1>
        <p>흩어진 링크와 메모가 지금의 일에 다시 연결되는 개인 인사이트 보관함입니다.</p>
        <Button color="primary" onClick={onStart} size="large" type="button">
          서비스 경험하기
        </Button>
      </div>
      <HeroArchiveCards />
    </div>
  </section>
  <ProblemSection />
  <SaveSection />
  <OnboardingPreview />
  <BenefitSection />
  <FinalCallToAction onStart={onStart} />
</main>
```

Hero 장식 카드에는 실제 제품 문맥을 사용한다.

```tsx
function HeroArchiveCards() {
  return (
    <div className="hero-archive" aria-hidden="true">
      <article className="archive-note archive-note--design">
        <span>DESIGN / 02</span>
        <strong>첫 화면의 선택 부담 줄이기</strong>
        <small>팀 프로젝트 만들 때 다시 보기</small>
      </article>
      <article className="archive-note archive-note--memo">
        <span>MEMO / 08</span>
        <strong>필요한 순간 다시 연결</strong>
        <small>저장보다 꺼내는 장면에 집중</small>
      </article>
      <article className="archive-note archive-note--dev">
        <span>DEV / 14</span>
        <strong>폼 상태 관리 참고</strong>
        <small>로그인 흐름 구현할 때</small>
      </article>
    </div>
  );
}
```

- [ ] **Step 5: 온보딩 전용 CSS 구현**

`LandingPage.tsx`에서 `./landing-page.css`를 import한다. CSS는 다음 규칙을 구현한다.

```css
.landing-page {
  min-height: 100vh;
  overflow: clip;
  background: var(--color-paper);
  color: var(--color-ink);
}

.landing-hero {
  width: min(1180px, calc(100% - 40px));
  min-height: 100vh;
  margin: 0 auto;
}

.landing-hero__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(420px, 0.95fr);
  min-height: calc(100vh - 82px);
  border-right: 1px solid var(--color-ink);
  border-left: 1px solid var(--color-ink);
}

.landing-hero__copy h1 {
  max-width: 620px;
  margin: 24px 0 18px;
  font-family: var(--font-display);
  font-size: clamp(3rem, 6vw, 5.6rem);
  line-height: 1.1;
  letter-spacing: -0.055em;
}

.hero-archive {
  position: relative;
  min-height: 560px;
  overflow: hidden;
  border-left: 1px solid var(--color-ink);
  background: var(--color-coral);
}

.archive-note {
  position: absolute;
  display: grid;
  gap: 10px;
  width: min(230px, 58%);
  border: 1px solid var(--color-ink);
  border-radius: 6px;
  background: var(--color-paper-card);
  padding: 18px;
  box-shadow: var(--shadow-paper);
}
```

문제·저장·장점 섹션은 흰 카드 3열 반복 대신 번호, 넓은 여백, 색인 선을 사용한다. 900px 미만에서는 한 열로 전환하고 640px 미만에서는 Hero CTA가 full width가 되며 장식 카드는 320px 높이 안에서 겹치도록 한다.

`global.css`에서는 새 CSS와 충돌하는 기존 온보딩 전용 selector를 제거한다. 제거 범위는 `.onboarding-copy`, `.onboarding-preview`, `.preview-*`, `.onboarding-page`, `.onboarding-hero`, `.onboarding-section`, `.problem-grid`, `.benefit-grid`, `.flow-panel`, `.save-mockup`, `.onboarding-final-cta` 및 해당 responsive override다. 로그인과 workspace selector는 변경하지 않는다.

- [ ] **Step 6: landing 테스트와 포맷 검사 실행**

Run: `npm test -- src/pages/landing/ui/LandingPage.test.tsx src/app/App.test.tsx`

Expected: PASS.

Run: `npm run format:check`

Expected: PASS after running `npm run format` only if check reports the touched files.

- [ ] **Step 7: 시각 시스템 커밋**

```bash
git add index.html src/app/styles/global.css src/pages/landing/ui/LandingPage.tsx src/pages/landing/ui/LandingPage.test.tsx src/pages/landing/ui/landing-page.css
git commit -m "feat: 온보딩 비주얼 콘셉트 적용"
```

## Task 3: GSAP 한 장면 고정 스크롤 구현

**Files:**
- Create: `src/pages/landing/ui/OnboardingMotionPreview.tsx`
- Create: `src/pages/landing/ui/OnboardingMotionPreview.test.tsx`
- Modify: `src/pages/landing/ui/LandingPage.tsx`
- Modify: `src/pages/landing/ui/landing-page.css`

- [ ] **Step 1: reduced motion에서 timeline을 만들지 않는 실패 테스트 작성**

`src/pages/landing/ui/OnboardingMotionPreview.test.tsx`:

```tsx
/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const gsapMocks = vi.hoisted(() => ({
  matchMedia: vi.fn(),
  registerPlugin: vi.fn(),
  timeline: vi.fn(),
}));

vi.mock('gsap', () => ({
  default: {
    matchMedia: gsapMocks.matchMedia,
    registerPlugin: gsapMocks.registerPlugin,
    timeline: gsapMocks.timeline,
  },
}));
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: {} }));
vi.mock('@gsap/react', () => ({
  useGSAP: (setup: () => void) => setup(),
}));

import { OnboardingMotionPreview } from './OnboardingMotionPreview';

beforeEach(() => {
  gsapMocks.matchMedia.mockReset();
  window.matchMedia = vi.fn().mockReturnValue({
    addEventListener: vi.fn(),
    matches: true,
    media: '(prefers-reduced-motion: reduce)',
    removeEventListener: vi.fn(),
  });
});

afterEach(cleanup);

describe('OnboardingMotionPreview', () => {
  it('keeps the final work pack visible without creating a timeline for reduced motion', () => {
    render(<OnboardingMotionPreview />);

    expect(screen.getByText('팀 프로젝트 앱 첫 화면 참고')).not.toBeNull();
    expect(screen.getByText('연결된 저장물 3개')).not.toBeNull();
    expect(gsapMocks.matchMedia).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: component 미존재로 실패하는지 확인**

Run: `npm test -- src/pages/landing/ui/OnboardingMotionPreview.test.tsx`

Expected: FAIL because `OnboardingMotionPreview` does not exist.

- [ ] **Step 3: 정적이고 접근 가능한 모션 장면 마크업 구현**

`OnboardingMotionPreview.tsx`의 최종 DOM은 애니메이션이 없어도 완성된 작업팩으로 읽혀야 한다.

```tsx
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function OnboardingMotionPreview() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      const media = gsap.matchMedia();
      return () => media.revert();
    },
    { scope: rootRef }
  );

  return (
    <section
      className="motion-chapter"
      id="retrieve-flow"
      ref={rootRef}
      aria-labelledby="motion-chapter-title"
    >
      <div className="motion-chapter__intro">
        <span className="archive-index">03 / RETRIEVE</span>
        <h2 id="motion-chapter-title">상황으로 다시 연결되는 꺼내보기</h2>
      </div>
      <div className="motion-stage">
        <p className="motion-query">팀 프로젝트 앱 첫 화면 참고</p>
        <div className="motion-sources" aria-hidden="true">
          <article className="motion-source-card motion-source-card--design">
            <span>DESIGN / 02</span>
            <strong>모바일 온보딩 흐름</strong>
            <small>첫 화면의 선택 부담 줄이기</small>
          </article>
          <article className="motion-source-card motion-source-card--dev">
            <span>DEV / 14</span>
            <strong>React 폼 구현 글</strong>
            <small>로그인 이후 입력 상태 관리</small>
          </article>
          <article className="motion-source-card motion-source-card--project">
            <span>PROJECT / 08</span>
            <strong>팀 프로젝트 기획서</strong>
            <small>데모 시나리오와 사용자 흐름</small>
          </article>
        </div>
        <div className="motion-connectors" aria-hidden="true">
          <span className="motion-connector">메모와 가까워요</span>
          <span className="motion-connector">디자인 카테고리에 저장했어요</span>
          <span className="motion-connector">같은 프로젝트에서 다시 봤어요</span>
        </div>
        <article className="motion-pack">
          <span>WORK PACK / CONNECTED</span>
          <h3>연결된 저장물 3개</h3>
          <p>지금 하는 일과 가까운 메모와 카테고리를 기준으로 모았어요.</p>
        </article>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: desktop pin과 mobile 자동 timeline 구현**

`useGSAP` 내부에서 `gsap.matchMedia()` 조건을 분리한다.

```tsx
media.add('(min-width: 768px)', () => {
  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: rootRef.current,
      start: 'top top',
      end: '+=140%',
      scrub: 0.65,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  timeline
    .from('.motion-query', { autoAlpha: 0, y: 24, duration: 0.2 })
    .from(
      '.motion-source-card',
      {
        autoAlpha: 0,
        x: (index) => [-120, 0, 120][index] ?? 0,
        y: 70,
        rotation: (index) => [-6, 3, 7][index] ?? 0,
        stagger: 0.08,
      },
      0.1
    )
    .to('.motion-source-card', { x: 0, y: 0, rotation: 0, stagger: 0.06, duration: 0.35 })
    .from('.motion-connector', { autoAlpha: 0, y: 12, stagger: 0.06, duration: 0.2 })
    .from('.motion-pack', { autoAlpha: 0, scale: 0.96, duration: 0.25 });
});

media.add('(max-width: 767px)', () => {
  gsap
    .timeline({ defaults: { ease: 'power2.out' } })
    .from('.motion-query', { autoAlpha: 0, y: 16, duration: 0.35 })
    .from('.motion-source-card', { autoAlpha: 0, y: 20, stagger: 0.12, duration: 0.35 })
    .from('.motion-connector', { autoAlpha: 0, stagger: 0.08, duration: 0.25 })
    .from('.motion-pack', { autoAlpha: 0, y: 16, duration: 0.35 });
});
```

CSS 기본값은 모든 요소가 보이는 최종 상태여야 한다. GSAP은 `from` 값만 주입해 JavaScript 실패 시에도 콘텐츠를 숨기지 않는다.

`LandingPage.tsx`는 기존 정적 `<OnboardingPreview />`가 있던 `retrieve-flow` 섹션 전체를 `<OnboardingMotionPreview />`로 교체하고 파일 상단에서 같은 디렉터리의 컴포넌트를 import한다.

- [ ] **Step 5: reduced-motion test가 통과하도록 GSAP mock과 구현 정렬**

테스트의 `window.matchMedia`가 `matches: true`일 때 `gsap.matchMedia()`가 호출되지 않아야 한다. 일반 App test의 `matches: false`에서는 media query callback을 mock이 실행하지 않아 timeline이 생기지 않아도 된다.

Run: `npm test -- src/pages/landing/ui/OnboardingMotionPreview.test.tsx src/pages/landing/ui/LandingPage.test.tsx src/app/App.test.tsx`

Expected: PASS.

- [ ] **Step 6: GSAP 장면 커밋**

```bash
git add src/pages/landing/ui/OnboardingMotionPreview.tsx src/pages/landing/ui/OnboardingMotionPreview.test.tsx src/pages/landing/ui/LandingPage.tsx src/pages/landing/ui/landing-page.css
git commit -m "feat: 온보딩 연결 모션 구현"
```

## Task 4: 반응형·접근성·실제 브라우저 검증

**Files:**
- Modify: `src/pages/landing/ui/landing-page.css`
- Modify: `src/pages/landing/ui/LandingPage.test.tsx`
- Modify: `src/app/App.test.tsx` only if accessible names change

- [ ] **Step 1: CTA와 핵심 장면의 접근성 회귀 테스트 추가**

`LandingPage.test.tsx`에 다음 테스트를 추가한다.

```tsx
it('keeps the primary action and motion story available to assistive technology', () => {
  renderLandingPage();

  expect(screen.getAllByRole('button', { name: '서비스 경험하기' })).toHaveLength(2);
  expect(
    screen.getByRole('region', { name: '상황으로 다시 연결되는 꺼내보기' })
  ).not.toBeNull();
  expect(screen.getByText('연결된 저장물 3개')).not.toBeNull();
});
```

- [ ] **Step 2: region 이름 또는 CTA 개수가 맞지 않아 실패하면 마크업 수정**

Run: `npm test -- src/pages/landing/ui/LandingPage.test.tsx`

Expected: 처음에는 region accessible name 누락 시 FAIL. `aria-labelledby`를 연결한 뒤 PASS.

- [ ] **Step 3: responsive와 reduced-motion CSS 완성**

```css
@media (max-width: 900px) {
  .landing-hero__grid,
  .landing-flow-panel {
    grid-template-columns: 1fr;
  }

  .hero-archive {
    min-height: 430px;
    border-top: 1px solid var(--color-ink);
    border-left: 0;
  }
}

@media (max-width: 640px) {
  .landing-hero,
  .landing-section,
  .motion-chapter,
  .landing-final-cta {
    width: min(100% - 24px, 430px);
  }

  .landing-hero__copy h1 {
    font-size: clamp(2.5rem, 13vw, 3.7rem);
  }

  .motion-stage {
    min-height: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .landing-page *,
  .landing-page *::before,
  .landing-page *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: 전체 자동 검증 실행**

Run: `npm test`

Expected: 4 test files, 기존 server test 포함 전체 PASS.

Run: `npm run lint`

Expected: 0 errors.

Run: `npm run build`

Expected: TypeScript build와 Vite production build PASS.

Run: `npm run format:check`

Expected: PASS.

- [ ] **Step 5: 실제 브라우저에서 시각 검증**

Run: `npm run dev`

다음 viewport에서 확인한다.

- 1440px: 첫 viewport에 브랜드, 가치 제안, CTA, Hero 카드가 함께 보인다.
- 1024px: 두 열 Hero가 겹치지 않고 pin 시작·종료가 자연스럽다.
- 390px: 가로 스크롤이 없고 CTA가 full width이며 pin 없이 자동 시퀀스가 실행된다.
- reduced motion: 최종 작업팩이 정적으로 보이고 CTA가 즉시 접근 가능하다.

브라우저에서 온보딩 Hero와 GSAP 장면을 캡처하고 다음 수치를 조정한다.

- 코럴 면적이 과하면 Hero art 폭을 줄인다.
- pin이 길면 `end: '+=140%'`를 120%까지 줄이고, 짧으면 160%까지 늘린다.
- scrub이 느리면 `0.65`를 `0.4`로, 급하면 `0.85`로 조정한다.
- 카드 이동이 장식처럼 보이면 이동 거리를 줄이고 연결 단서 노출 시간을 늘린다.

- [ ] **Step 6: 검증 후 최종 커밋**

```bash
git add src/pages/landing/ui/landing-page.css src/pages/landing/ui/LandingPage.test.tsx src/app/App.test.tsx
git commit -m "style: 온보딩 반응형 완성"
```

## Completion criteria

- 온보딩이 아이보리·코발트·코럴·노랑·초록의 역할 기반 팔레트를 사용한다.
- 첫 viewport에서 제품 가치와 CTA가 애니메이션 없이도 이해된다.
- desktop에서는 고정 스크롤 장면 하나만 사용한다.
- mobile과 reduced motion에서는 pin 없이 전체 내용이 보인다.
- 인증 진입 흐름과 두 개의 `서비스 경험하기` CTA가 유지된다.
- 홈과 workspace 화면은 이번 변경에서 동작·스타일 회귀가 없다.
- test, lint, build, format check가 모두 통과한다.
