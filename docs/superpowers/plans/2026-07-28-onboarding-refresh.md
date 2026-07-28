# 온보딩 히어로와 기능 미리보기 개편 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 첫 진입 히어로 모션과 현재 제품 구조를 반영한 세 가지 미니 화면으로 온보딩을 갱신한다.

**Architecture:** 랜딩 페이지 슬라이스 안에서 히어로와 기능 미리보기를 유지한다. GSAP 수명 주기는 히어로 컴포넌트 범위로 제한하고, 인증 후 실제 화면 컴포넌트나 데이터 계층에는 의존하지 않는다.

**Tech Stack:** React 19, TypeScript, CSS custom properties, GSAP, `@gsap/react`, Vitest, Testing Library

---

## 작업 1: 사용자에게 보이는 온보딩 계약 갱신

**파일**

- 수정: `src/pages/landing/ui/landing_page.test.tsx`
- 수정: `src/pages/landing/ui/onboarding_feature_tabs.test.tsx`

1. 기능 소개 제목과 `02 분류` 탭 이름을 기대하도록 기존 테스트를 수정한다.
2. 저장·분류·꺼내보기 미니 화면의 핵심 문구를 기대하도록 각 탭 테스트를 정리한다.
3. 실제 제품에 없는 연결 이유가 노출되지 않음을 검증한다.
4. 두 테스트 파일만 실행해 의도한 실패를 확인한다.

## 작업 2: 히어로 첫 진입 모션 구현

**파일**

- 수정: `src/pages/landing/ui/landing_page.tsx`
- 수정: `src/pages/landing/ui/landing_page.css`

1. 히어로 문장을 두 개의 flex 행과 의미에 맞는 간격으로 구성한다.
2. 데스크톱이면서 동작 줄이기를 요청하지 않은 환경에만 GSAP 타임라인을 연결한다.
3. `인사이트`, `다시`, 반짝임, 시작 행동을 한 번 순서대로 재생한다.
4. 모바일과 동작 줄이기 환경은 정적 최종 상태를 유지한다.

## 작업 3: 현재 제품 구조를 반영한 미니 화면 구현

**파일**

- 수정: `src/pages/landing/ui/onboarding_feature_tabs.tsx`
- 수정: `src/pages/landing/ui/landing_page.css`

1. 기능 소개 제목과 탭 이름을 명세에 맞게 바꾼다.
2. 저장 미리보기를 초록색 상단 영역과 URL 우선 흐름으로 구성한다.
3. 분류 미리보기를 산호색 상단 영역, 검색, 카테고리, 결과 개수와 카드로 구성한다.
4. 꺼내보기 미리보기를 파란색 상단 영역, 상황 입력, 제안과 결과 카드로 구성한다.
5. 연결 이유와 순위처럼 실제 제품에 없는 정보를 제거한다.
6. 랜딩 관련 테스트만 실행해 통과를 확인한다.

## 작업 4: 문서 계약 동기화

**파일**

- 수정: `docs/onboarding.md`
- 수정: `docs/tech-stack.md`
- 수정: `DESIGN.md`

1. 히어로 문장, 첫 진입 모션과 미니 화면 구조를 현재 구현에 맞게 갱신한다.
2. GSAP을 로그인 전 히어로 한 곳에서 사용 중으로 기록한다.
3. 모바일과 동작 줄이기 환경의 정적 상태를 명시한다.

## 작업 5: 범위에 맞는 검증

1. 랜딩 관련 테스트 세 파일을 실행한다.
2. 수정한 TypeScript·CSS 파일의 Prettier와 ESLint를 확인한다.
3. 웹 빌드를 실행해 타입과 번들을 확인한다.
4. 390px, 768px, 1280px에서 히어로와 세 탭을 눈으로 확인한다.
5. 브라우저 콘솔 오류와 동작 줄이기 정적 상태를 확인한다.

## 작업 6: 기능 소개 섹션 여백 조정

**파일**

- 수정: `src/pages/landing/ui/landing_page.css`

1. 기능 소개 섹션의 `100svh` 최소 높이를 제거한다.
2. 기존 반응형 섹션 간격에 16px을 더해 위아래 여백을 모바일 64px, 태블릿 80px, 데스크톱 96px로 맞춘다.
3. 랜딩 관련 기존 테스트와 390px, 768px, 1280px 화면을 다시 확인한다.
