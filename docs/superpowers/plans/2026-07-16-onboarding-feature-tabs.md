# 온보딩 핵심 기능 탭 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 상단바 앵커 링크와 분리된 기능 섹션을 하나의 접근 가능한 `저장 / 분류 / 꺼내보기` 탭 무대로 교체한다.

**Architecture:** `LandingPage`는 Hero, 기능 탭, CTA 순서만 조합한다. 새 `OnboardingFeatureTabs` 컴포넌트가 탭 상태와 키보드 탐색, 세 정적 제품 패널을 소유하며 기존 `OnboardingMotionPreview`를 대체한다.

**Tech Stack:** React 19, TypeScript, CSS Custom Properties, Vitest, React Testing Library

---

### Task 1: 기능 탭 상호작용 계약

**Files:**

- Create: `src/pages/landing/ui/onboarding_feature_tabs.test.tsx`
- Modify: `src/pages/landing/ui/landing_page.test.tsx`
- Modify: `src/app/app.test.tsx`

- [ ] **Step 1: 실패하는 탭 렌더링 테스트 작성**

`OnboardingFeatureTabs`가 승인된 제목과 `01 저장`, `02 분류`, `03 꺼내보기` 탭을 렌더링하고 저장 탭을 기본 선택하는지 검사한다.

- [ ] **Step 2: 실패하는 클릭·키보드 테스트 작성**

분류 탭 클릭 시 카테고리 장면, 꺼내보기 탭 클릭 시 현재 상황과 연결 단서가 표시되는지 검사한다. ArrowRight와 End가 선택과 포커스를 이동하는지 검사한다.

- [ ] **Step 3: LandingPage 계약 갱신**

상단바에 `저장`, `꺼내보기` 링크가 없고 Hero, 기능 탭 제목, 마지막 CTA가 표시되는지 검사한다.

- [ ] **Step 4: RED 확인**

Run: `npm test -- src/pages/landing/ui/onboarding_feature_tabs.test.tsx src/pages/landing/ui/landing_page.test.tsx src/app/app.test.tsx`

Expected: `OnboardingFeatureTabs` 모듈과 탭 역할이 없어 실패한다.

### Task 2: 기능 탭 구현

**Files:**

- Create: `src/pages/landing/ui/onboarding_feature_tabs.tsx`
- Modify: `src/pages/landing/ui/landing_page.tsx`
- Delete: `src/pages/landing/ui/onboarding_motion_preview.tsx`
- Delete: `src/pages/landing/ui/onboarding_motion_preview.test.tsx`

- [ ] **Step 1: 탭 상태와 ARIA 관계 구현**

세 탭의 `aria-selected`, `aria-controls`, `tabIndex`를 활성 상태와 연결한다. 클릭 시 해당 탭을 선택한다.

- [ ] **Step 2: 키보드 이동 구현**

ArrowLeft, ArrowRight, Home, End에서 다음 탭을 선택하고 해당 버튼으로 포커스를 이동한다.

- [ ] **Step 3: 세 제품 패널 구현**

저장 패널은 URL과 저장 완료, 분류 패널은 카테고리와 정리된 저장물, 꺼내보기 패널은 현재 상황과 연결 단서 및 원문 열기를 렌더링한다.

- [ ] **Step 4: LandingPage 조합 변경**

Hero 상단바 내비게이션을 제거하고 기존 저장·꺼내보기 섹션 대신 `OnboardingFeatureTabs` 하나를 배치한다. Amber 하이라이트 기호는 `✦`를 사용한다.

- [ ] **Step 5: GREEN 확인**

Run: `npm test -- src/pages/landing/ui/onboarding_feature_tabs.test.tsx src/pages/landing/ui/landing_page.test.tsx src/app/app.test.tsx`

Expected: 대상 테스트 통과.

### Task 3: 탭 중심 시각 계약

**Files:**

- Modify: `src/pages/landing/ui/landing_page.css`
- Modify: `src/pages/landing/ui/landing_page_contract.test.ts`

- [ ] **Step 1: 실패하는 CSS 계약 추가**

탭이 세 열, 최소 44px, 활성 2px Electric Blue 하단선인지 검사한다. 상단바 내비게이션과 기존 저장·모션 클래스가 없는지 검사한다.

- [ ] **Step 2: RED 확인**

Run: `npm test -- src/pages/landing/ui/landing_page_contract.test.ts`

Expected: 새 탭 스타일이 없어 실패한다.

- [ ] **Step 3: 토큰 기반 탭·패널 스타일 구현**

세 탭을 한 줄 그리드로 배치하고 공용 제품 무대에 최소 높이, 1px 경계, 16px radius를 적용한다. 모바일에서도 가로 넘침 없이 세 탭을 유지한다.

- [ ] **Step 4: 전체 검증**

Run: `npm test`

Expected: 전체 테스트 통과.

Run: `npm run build`

Expected: TypeScript와 Vite 빌드 성공.

Run: `npx eslint src/pages/landing/ui/onboarding_feature_tabs.tsx src/pages/landing/ui/onboarding_feature_tabs.test.tsx src/pages/landing/ui/landing_page.tsx src/pages/landing/ui/landing_page.test.tsx src/pages/landing/ui/landing_page_contract.test.ts src/app/app.test.tsx`

Expected: ESLint 오류 없음.

- [ ] **Step 5: 브라우저 검증과 커밋**

390px와 데스크톱에서 Hero, 세 탭, 세 패널, CTA, 가로 넘침, 콘솔 오류를 확인한다. 구현 파일만 스테이징해 `feat: 온보딩 핵심 기능 탭 구성`으로 커밋한다.

## Self-Review

- 승인된 제목과 세 기능을 모두 작업에 연결했다.
- 상단바 링크 제거와 키보드 접근성을 포함했다.
- GSAP과 검색 기능은 범위에서 제외했다.
- 사용자 소유 `package-lock.json`, `.codex-tmp/`, 기존 미추적 스펙은 수정하지 않는다.
