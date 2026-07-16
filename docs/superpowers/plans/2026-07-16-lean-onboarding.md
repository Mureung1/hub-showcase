# 간결한 온보딩 구현 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 책갈피 하이라이트 디자인을 유지하면서 로그인 전 온보딩을 `Hero → 저장 → 꺼내보기 → CTA` 네 장면으로 축약한다.

**Architecture:** `LandingPage`가 장면 순서를 소유하고, 기존 `OnboardingMotionPreview`는 GSAP을 제거한 정적 꺼내보기 장면으로 축약한다. 제품 동작은 바꾸지 않으며 랜딩 전용 JSX와 CSS, 해당 계약 테스트만 수정한다.

**Tech Stack:** React 19, TypeScript, CSS Custom Properties, Vitest, React Testing Library

---

### Task 1: 최소 온보딩 콘텐츠 계약

**Files:**

- Modify: `src/pages/landing/ui/landing_page.test.tsx`
- Modify: `src/pages/landing/ui/onboarding_motion_preview.test.tsx`
- Modify: `src/app/app.test.tsx`

- [ ] **Step 1: 실패하는 콘텐츠 테스트 작성**

`LandingPage` 테스트에서 `링크를 저장하고`, `지금 하는 일로 꺼내보세요`, `아맞다로 시작해보세요`를 확인한다. 기존 Hero 보조 설명, 로그인 안내, 감성 문구, 결과 예시 박스, 문제·장점 제목은 존재하지 않아야 한다. H1 안에는 Electric Blue `🔖 링크`와 Amber `✦ 다시` 하이라이트가 있어야 한다.

- [ ] **Step 2: 정적 꺼내보기 계약 작성**

`OnboardingMotionPreview` 테스트는 현재 상황, 저장물, 연결 단서, `원문 열기`를 확인하고 `PINNED CHAPTER`, `SCROLL TO CONNECT`, 기존 설명 문단이 없음을 확인한다.

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- src/pages/landing/ui/landing_page.test.tsx src/pages/landing/ui/onboarding_motion_preview.test.tsx src/app/app.test.tsx`

Expected: 기존 6단계 온보딩과 GSAP 장면이 남아 있어 콘텐츠 계약이 실패한다.

### Task 2: 정적 네 장면 구현

**Files:**

- Modify: `src/pages/landing/ui/landing_page.tsx`
- Modify: `src/pages/landing/ui/onboarding_motion_preview.tsx`

- [ ] **Step 1: Hero 축약**

Hero에는 상단바, H1, CTA만 남긴다. H1은 Blue `🔖 링크`, Amber `✦ 다시` 하이라이트를 사용한다. 내비게이션은 `저장`, `꺼내보기`만 남긴다.

- [ ] **Step 2: 저장 장면 축약**

`SaveSection`은 `링크를 저장하고` 제목, URL 필드, `저장 완료` 상태만 렌더링한다. 문제·장점 데이터와 섹션, Hero Preview, 설명형 `SectionHeading`을 제거한다.

- [ ] **Step 3: 꺼내보기 장면 정적화**

`OnboardingMotionPreview`에서 React ref, GSAP, ScrollTrigger를 제거한다. `지금 하는 일로 꺼내보세요` 제목 아래에 현재 상황, 관련 저장물, 연결 단서, `원문 열기`가 정적으로 보이게 한다.

- [ ] **Step 4: 대상 테스트 통과 확인**

Run: `npm test -- src/pages/landing/ui/landing_page.test.tsx src/pages/landing/ui/onboarding_motion_preview.test.tsx src/app/app.test.tsx`

Expected: 대상 테스트가 모두 통과한다.

### Task 3: 타이포 중심 레이아웃과 검증

**Files:**

- Modify: `src/pages/landing/ui/landing_page.css`
- Modify: `src/pages/landing/ui/landing_page_contract.test.ts`

- [ ] **Step 1: 실패하는 레이아웃 계약 작성**

Hero가 단일 열을 사용하고, 책갈피 하이라이트가 화면 폭을 넘지 않으며, 기존 `.hero-preview`, `.landing-principle`, `.landing-card-grid` 규칙이 제거되는 계약을 추가한다.

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- src/pages/landing/ui/landing_page_contract.test.ts`

Expected: 기존 2열 Hero와 제거 대상 스타일 때문에 실패한다.

- [ ] **Step 3: 최소 CSS 구현**

Hero를 넓은 여백의 단일 열 중앙 구성으로 바꾸고, 저장과 꺼내보기 UI는 기존 토큰 기반 1px 경계와 평평한 표면을 유지한다. 모바일은 같은 순서를 한 열로 표시한다.

- [ ] **Step 4: 전체 정적 검증**

Run: `npm test`

Expected: 전체 테스트 통과.

Run: `npm run build`

Expected: TypeScript와 Vite 빌드 성공.

Run: `npx eslint src/pages/landing/ui/landing_page.tsx src/pages/landing/ui/landing_page.test.tsx src/pages/landing/ui/landing_page_contract.test.ts src/pages/landing/ui/onboarding_motion_preview.tsx src/pages/landing/ui/onboarding_motion_preview.test.tsx src/app/app.test.tsx`

Expected: ESLint 오류 없음.

- [ ] **Step 5: 브라우저 검증과 커밋**

데스크톱과 390px 모바일에서 가로 넘침, 장면 순서, 두 책갈피 하이라이트, CTA를 확인하고 `feat: 온보딩 핵심 경험 간결화`로 커밋한다.

## Self-Review

- 설계 문서의 유지·제거·제외 범위를 모두 작업에 연결했다.
- GSAP은 이번 구현에서 제거하며 후속 단계로 남긴다.
- 앱 내부 기능, 로그인 화면, 사용자 소유 `package-lock.json`은 수정하지 않는다.
- placeholder나 미정 문구가 없다.
