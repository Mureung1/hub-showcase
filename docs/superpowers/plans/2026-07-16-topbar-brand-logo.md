# 상단바 브랜드 로고 적용 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Figma의 파랑·앰버 북마크 심볼을 공용 SVG 컴포넌트로 만들고 로그인 전·후 상단바의 기존 초록 사각형을 교체한다.

**Architecture:** 비즈니스 규칙이 없는 로고는 `src/shared/ui/brand-logo`가 소유하고 `@/shared/ui` public API로 노출한다. 랜딩과 워크스페이스는 같은 SVG를 소비하되 각 화면 CSS가 디자인 토큰으로 28px와 24px 크기를 결정한다.

**Tech Stack:** React 19, TypeScript, CSS Custom Properties, Vitest, React Testing Library

---

### Task 1: 공용 브랜드 로고 계약

**Files:**

- Create: `src/shared/ui/brand-logo/brand_logo.test.tsx`
- Create: `src/shared/ui/brand-logo/brand_logo.tsx`
- Create: `src/shared/ui/brand-logo/index.ts`
- Modify: `src/shared/ui/index.ts`

- [ ] **Step 1: 실패하는 SVG 계약 테스트 작성**

```tsx
const { container } = render(<BrandLogo className="test-brand-logo" />);
const logo = container.querySelector('svg.test-brand-logo');

expect(logo?.getAttribute('viewBox')).toBe('0 0 320 320');
expect(logo?.getAttribute('aria-hidden')).toBe('true');
expect(
  [...(logo?.querySelectorAll('path') ?? [])].map((path) =>
    path.getAttribute('fill')
  )
).toEqual(['var(--color-electric-blue)', 'var(--color-amber)']);
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- src/shared/ui/brand-logo/brand_logo.test.tsx`

Expected: `BrandLogo` 모듈이 없어 실패한다.

- [ ] **Step 3: Figma 벡터 경로를 사용하는 최소 SVG 구현**

`BrandLogo`는 `viewBox="0 0 320 320"`, `aria-hidden="true"`, `focusable="false"`를 사용한다. 두 path는 Figma 노드 `26:2`의 경로를 그대로 사용하고 fill만 런타임 토큰으로 연결한다.

- [ ] **Step 4: 공용 UI public API 노출**

`src/shared/ui/brand-logo/index.ts`와 `src/shared/ui/index.ts`에서 named export로 `BrandLogo`를 노출한다.

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- src/shared/ui/brand-logo/brand_logo.test.tsx`

Expected: `1 passed`

---

### Task 2: 로그인 전·후 상단바 적용

**Files:**

- Modify: `src/pages/landing/ui/landing_page.test.tsx`
- Modify: `src/pages/landing/ui/landing_page_contract.test.ts`
- Modify: `src/pages/landing/ui/landing_page.tsx`
- Modify: `src/pages/landing/ui/landing_page.css`
- Modify: `src/app/authenticated_workspace.test.tsx`
- Create: `src/app/authenticated_workspace_contract.test.ts`
- Modify: `src/app/authenticated_workspace.tsx`
- Modify: `src/app/styles/authenticated_workspace.css`

- [ ] **Step 1: 두 상단바의 SVG 렌더링과 크기 계약 테스트 작성**

랜딩 브랜드 링크에는 `svg.landing-brand__mark`, 워크스페이스 브랜드에는 `svg.workspace-brand__mark`가 존재해야 한다. 랜딩은 `calc(var(--spacing-6) + var(--spacing-1))`, 워크스페이스는 `var(--spacing-6)` 크기를 사용하며 기존 `background: var(--color-signal-green)`은 없어야 한다.

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- src/pages/landing/ui/landing_page.test.tsx src/pages/landing/ui/landing_page_contract.test.ts src/app/authenticated_workspace.test.tsx src/app/authenticated_workspace_contract.test.ts`

Expected: 기존 span 마크와 Signal Green 배경 때문에 실패한다.

- [ ] **Step 3: 두 화면에서 `BrandLogo` 사용**

`@/shared/ui`에서 `BrandLogo`를 import하고 기존 빈 span을 각각 `<BrandLogo className="landing-brand__mark" />`, `<BrandLogo className="workspace-brand__mark" />`로 교체한다. 기존 브랜드명, 링크 접근성 이름, 구분선과 화면명은 유지한다.

- [ ] **Step 4: 토큰 기반 크기와 정렬 적용**

두 SVG에 `display: block`과 `flex: 0 0 auto`를 적용한다. 랜딩은 28px, 워크스페이스는 24px로 표시하고 배경색 규칙을 삭제한다.

- [ ] **Step 5: 대상 테스트 통과 확인**

Run: `npm test -- src/shared/ui/brand-logo/brand_logo.test.tsx src/pages/landing/ui/landing_page.test.tsx src/pages/landing/ui/landing_page_contract.test.ts src/app/authenticated_workspace.test.tsx src/app/authenticated_workspace_contract.test.ts`

Expected: 모든 대상 테스트가 통과한다.

---

### Task 3: 디자인 계약과 최종 검증

**Files:**

- Modify: `DESIGN.md`

- [ ] **Step 1: 팔레트 역할 갱신**

Electric Blue에는 로고 기본 색면, Amber에는 로고 강조 색면 역할을 추가하고 Signal Green은 성공 상태로 한정한다.

- [ ] **Step 2: 정적 검증**

Run: `npm test`

Expected: 전체 테스트가 실패 없이 끝난다.

Run: `npm run lint`

Expected: ESLint 오류가 없다.

Run: `npm run build`

Expected: TypeScript와 Vite 빌드가 성공한다.

- [ ] **Step 3: 브라우저 시각 검증**

랜딩과 로그인 후 워크스페이스를 데스크톱·모바일 폭에서 확인한다. 로고가 찌그러지지 않고, 워드마크 및 화면명과 수직 정렬되며, 상단바 높이와 최소 44px 브랜드 터치 영역이 유지되어야 한다.

---

## Self-Review

- Figma 노드 `26:2`의 두 벡터 경로와 파랑·앰버 색상 역할을 모두 포함했다.
- 원격 또는 만료되는 Figma 에셋을 런타임에 사용하지 않는다.
- 기존 사용자 변경 파일과 상단바 외 화면은 수정하지 않는다.
- placeholder, 임시 코드, 별도 아이콘 패키지 추가가 없다.
