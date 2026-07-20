# Analysis Result UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 분석이 완료된 화면에서 Issue #13의 구조화된 Repository 분석 데이터를 간결하게 보여주고, 기존 랜딩 콘텐츠를 숨긴다.

**Architecture:** `RepositoryAnalyzer`가 입력·요청 상태를 관리하고, 성공 시 `AnalysisResult`만 결과 전용 레이아웃으로 렌더링한다. `AnalysisResult`는 API의 `analysis` 객체를 읽기 전용 섹션으로 표현하며, 분석 데이터가 없는 랜딩용 문구는 성공 화면에서 사용하지 않는다.

**Tech Stack:** React, TypeScript, Vite, Node test runner, CSS

## Global Constraints

- 백엔드 API와 계약 타입은 변경하지 않는다.
- Issue #13의 `analysis` 응답을 임의의 하드코딩 값으로 대체하지 않는다.
- 분석 결과 화면에는 Repository 식별 정보, 참여자, 커밋, 구조화 분석 데이터만 표시한다.
- 문제 정의, 해결 방안, 핵심 기능, 추가 기능, 서비스 소개 등 랜딩 섹션은 성공 상태에서 렌더링하지 않는다.
- 외부 UI 라이브러리는 추가하지 않는다.

### Task 1: 결과 화면 계약과 렌더링 테스트

**Files:**
- Modify: `apps/web/src/features/repository-analysis/repositoryAnalysis.test.ts`
- Modify: `apps/web/src/features/repository-analysis/AnalysisResult.tsx`

- [ ] **Step 1: 분석 결과 표시 기준을 테스트 데이터로 고정한다.**
- [ ] **Step 2: Issue #13 필드가 결과 출력에 포함되는지 확인하는 테스트를 작성한다.**
- [ ] **Step 3: 현재 테스트 도구에서 컴포넌트 DOM 검증이 가능한지 확인하고, 불가능하면 순수 변환 헬퍼 테스트로 범위를 고정한다.**

### Task 2: 분석 결과 전용 UI 구현

**Files:**
- Modify: `apps/web/src/features/repository-analysis/AnalysisResult.tsx`
- Modify: `apps/web/src/style.css`

- [ ] **Step 1: Repository 기본 정보와 참여자·커밋 출력을 유지한다.**
- [ ] **Step 2: README 요약, 기술 스택, 프로젝트 구조, 품질 신호, 협업 지표, 경고·근거를 API 응답에서 직접 렌더링한다.**
- [ ] **Step 3: 긴 목록과 README·근거 내용이 모바일에서 잘리지 않도록 반응형 스타일을 추가한다.**
- [ ] **Step 4: 랜딩페이지용 문제·해결·기능·리소스 문구가 결과 컴포넌트에 들어가지 않는지 확인한다.**

### Task 3: 성공 상태에서 랜딩 콘텐츠 제거

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/features/repository-analysis/RepositoryAnalyzer.tsx`

- [ ] **Step 1: 분석 성공 여부를 App 레벨에서 알 수 있도록 최소한의 콜백 계약을 추가한다.**
- [ ] **Step 2: 성공 상태에서는 RepositoryAnalyzer와 결과 화면만 표시하고 Overview·Problem·Solution·Feature·Resource·Closing 섹션을 숨긴다.**
- [ ] **Step 3: idle/loading/error 상태에서는 기존 입력 화면과 랜딩 콘텐츠가 유지되는지 확인한다.**

### Task 4: 검증

**Files:**
- Verify: `apps/web/src/features/repository-analysis/repositoryAnalysis.test.ts`
- Verify: `apps/web/src/features/repository-analysis/repositoryAnalysisApi.test.ts`

- [ ] **Step 1: `npm run test:web`을 실행한다.**
- [ ] **Step 2: `npm run typecheck:web`을 실행한다.**
- [ ] **Step 3: `npm run build:web`을 실행한다.**
- [ ] **Step 4: `git diff --check`를 실행한다.**
