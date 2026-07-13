# 백로그와 주간 체크리스트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 기능 체크리스트를 제품 백로그로 옮기고, 2주차부터 4주차까지의 실행 계획을 새 체크리스트로 제공한다.

**Architecture:** `docs/backlog.md`는 일정과 무관한 전체 작업 범위와 우선순위의 기준 문서가 된다. `docs/checklist.md`는 백로그의 기능 묶음을 주차별 목표와 완료 기준으로 배치하고, 기존 상세 구현 계획은 실행 절차를 계속 담당한다.

**Tech Stack:** Markdown, Prettier, PowerShell 기반 링크 검증

---

### Task 1: 기존 기능 체크리스트를 제품 백로그로 전환

**Files:**

- Create: `docs/backlog.md`
- Modify: `docs/checklist.md`

- [x] **Step 1: 기존 체크리스트 본문을 `docs/backlog.md`로 옮긴다**

  현재 `docs/checklist.md`의 P0, P1, P2, 확인 필요, MVP 제외 작업을 순서와 체크 상태를 바꾸지 않고 보존한다.

- [x] **Step 2: 백로그의 역할과 관리 원칙을 추가한다**

  문서 앞부분에 백로그의 정의, 필요한 이유, 항목 추가와 정제, 우선순위 변경, 완료와 제외 처리 원칙을 작성한다. 백로그는 일정표가 아니며, 주간 배치는 `docs/checklist.md`에서 관리한다고 명시한다.

- [x] **Step 3: 백로그 구조를 검증한다**

  Run: `rg -n "^## (P0|P1|P2|확인 필요|MVP 범위)" docs/backlog.md`

  Expected: 기존 기능 그룹과 제외 작업 그룹이 모두 검색된다.

### Task 2: 2주차부터 4주차까지의 주간 체크리스트 작성

**Files:**

- Modify: `docs/checklist.md`

- [x] **Step 1: 주간 계획의 사용법을 작성한다**

  구현 여부와 관계없이 전체 계획을 표시하며, 우선순위와 세부 범위는 백로그, 구현 순서는 상세 계획에서 확인한다고 설명한다.

- [x] **Step 2: 2주차 계획을 작성한다**

  `[P0] 프로젝트 기반`, `[P0] Supabase 인증`, `[P0] 데이터 모델과 RLS`, `[P0] 로그인 후 개인화 온보딩`, `[확인 필요] Chrome Extension 포함 여부 결정`을 배치한다. 다음 주 완료 목표는 Google 로그인부터 온보딩과 보호된 앱 진입까지의 흐름이다.

- [x] **Step 3: 3주차 계획을 작성한다**

  `[P0] 카테고리`, `[P0] 인사이트 저장`, `[P0] 보관함·인사이트 카드·검색`, `[P0] 인사이트 수정과 삭제`를 배치한다. 완료 목표는 저장, 분류, 검색, 수정, 삭제의 전체 흐름이다.

- [x] **Step 4: 4주차 계획을 작성한다**

  `[P0] 꺼내보기`, `[P1] URL 메타데이터 수집`, `[P1] 카테고리 추천`, `[P1] 실패·빈 상태`, `[P1] 보안과 신뢰`, `[P1] 반응형과 사용성`, 조건부 Chrome Extension, `[P2] 마무리와 데모 준비`를 배치한다.

- [x] **Step 5: 각 기능에 백로그와 상세 계획 링크를 연결한다**

  상세 계획이 없는 P1·P2 항목은 백로그 앵커만 연결한다. 이미 작성된 열 개 구현 계획은 해당 기능 항목에서 직접 연결한다.

- [x] **Step 6: 주차 구성을 검증한다**

  Run: `rg -n "^## (2주차|3주차|4주차)|^### (주간 목표|작업 목록|완료 기준)" docs/checklist.md`

  Expected: 세 주차와 각 주차의 목표, 작업, 완료 기준이 모두 검색된다.

### Task 3: 문서 색인과 기존 참조 갱신

**Files:**

- Modify: `README.md`
- Modify: `docs/discussion.md`
- Modify: `docs/superpowers/plans/amadda-auth.md`
- Modify: `docs/superpowers/plans/amadda-p0-app-shell.md`

- [x] **Step 1: README 문서 색인을 분리한다**

  전체 기능과 우선순위를 확인할 때는 `docs/backlog.md`, 2~4주차 작업 순서를 확인할 때는 `docs/checklist.md`를 보도록 두 행을 제공한다.

- [x] **Step 2: 상세 계획의 기능 기준 문서 링크를 갱신한다**

  `amadda-auth.md`와 `amadda-p0-app-shell.md`에서 기존 `docs/checklist.md` 참조를 `docs/backlog.md`로 변경한다.

- [x] **Step 3: 논의 문서의 문서 역할 설명을 현재 구조로 갱신한다**

  `docs/discussion.md`에서 `backlog.md`는 전체 작업과 우선순위, `checklist.md`는 2~4주차 일정과 완료 기준을 관리한다고 설명한다.

### Task 4: 문서 정합성 검증과 커밋

**Files:**

- Verify: `README.md`
- Verify: `docs/backlog.md`
- Verify: `docs/checklist.md`
- Verify: `docs/discussion.md`
- Verify: `docs/superpowers/plans/*.md`

- [x] **Step 1: Markdown 형식을 검증한다**

  Run: `npx prettier --check README.md docs/backlog.md docs/checklist.md docs/discussion.md docs/superpowers/plans/2026-07-10-backlog-weekly-checklist.md docs/superpowers/specs/2026-07-10-backlog-weekly-checklist-design.md`

  Expected: `All matched files use Prettier code style!`

  Run: `git diff --check`

  Expected: 공백 오류가 없다.

- [x] **Step 2: README의 로컬 링크를 검증한다**

  Markdown 링크의 로컬 경로를 추출해 `Test-Path`로 검사한다.

  Expected: 모든 로컬 링크의 `Exists` 값이 `True`다.

- [x] **Step 3: 남은 잘못된 참조를 검사한다**

  Run: `rg -n "docs/checklist\.md.*P0|체크리스트.*기능별|주차별 일정표가 아니라" README.md docs/backlog.md docs/checklist.md docs/discussion.md docs/superpowers/plans/amadda-auth.md docs/superpowers/plans/amadda-p0-app-shell.md`

  Expected: 기능 백로그를 주간 체크리스트로 잘못 가리키는 참조가 없다.

- [x] **Step 4: 변경 사항을 커밋한다**

  ```bash
  git add README.md docs/backlog.md docs/checklist.md docs/discussion.md docs/superpowers/plans
  git commit -m "docs: 백로그와 주간 개발 계획 분리"
  ```
