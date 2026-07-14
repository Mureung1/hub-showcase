# 로컬 우선 MVP 핵심 흐름 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** GitHub 백로그 `#13 → #14 → #4 → #5 → #6 → #7 → #15 → #16 → #8` 순서대로 저장, 관리, 검색, 꺼내보기와 교차 회귀를 완성한다.

**Architecture:** `entities/insight`가 도메인 계약, URL 정규화, 저장 포트, Web Storage 어댑터와 결정적 검색 코어를 소유한다. `AuthenticatedWorkspace`와 전용 hook이 저장소를 주입받아 상태를 조합하고, `pages`는 사용자 입력과 상태 표현만 담당한다. 기존 WDS adapter와 White Canvas 스타일은 유지한다.

**Tech Stack:** React 19, TypeScript, Web Storage API, Vitest, Testing Library, WDS adapter, CSS design tokens

---

### Task 1: #13 도메인 계약과 URL 정규화

**Files:**
- Modify: `src/entities/insight/model/insight.ts`
- Create: `src/entities/insight/model/normalize_insight_url.ts`
- Create: `src/entities/insight/model/normalize_insight_url.test.ts`
- Modify: `src/entities/insight/index.ts`

- [ ] **Step 1: 지원 프로토콜과 정규화 계약의 첫 실패 테스트 작성**

  `http`와 `https`만 허용하고 입력 양끝 공백, host 대소문자, 기본 port, fragment, root trailing slash를 정규화하는 공개 함수 `normalizeInsightUrl(rawUrl)`의 동작을 테스트한다.

- [ ] **Step 2: RED 확인**

  Run: `npm test -- src/entities/insight/model/normalize_insight_url.test.ts`
  Expected: `normalizeInsightUrl`이 없어 FAIL.

- [ ] **Step 3: 최소 구현 후 GREEN 확인**

  성공 결과는 `{ ok: true, originalUrl, normalizedUrl, domain }`, 실패 결과는 `{ ok: false, reason: 'invalid-url' | 'unsupported-protocol' }`로 한다. `originalUrl`은 trim한 사용자 입력을 보존한다.

- [ ] **Step 4: 추적 parameter 정규화 테스트와 구현 반복**

  제거 대상은 `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`, `fbclid`뿐이다. 다른 query와 path 대소문자 및 query 순서는 보존한다.

- [ ] **Step 5: Insight 계약 교체**

  `Insight`를 `id`, `originalUrl`, `normalizedUrl`, `domain`, `title`, `memo`, `category`, `createdAt`, `updatedAt` 계약으로 교체한다. `id`는 string, 선택 값은 `null`, 시간은 ISO string이다.

- [ ] **Step 6: 관련 단위 테스트 및 정적 검사**

  Run: `npm test -- src/entities/insight/model/normalize_insight_url.test.ts src/entities/insight/model/insight.test.ts`
  Run: `npm run lint`

- [ ] **Step 7: 커밋**

  Commit: `feat: 인사이트 URL 정규화 계약 구현`

### Task 2: #13 교체 가능한 저장 포트와 Web Storage 어댑터

**Files:**
- Create: `src/entities/insight/model/insight_repository.ts`
- Create: `src/entities/insight/model/local_storage_insight_repository.ts`
- Create: `src/entities/insight/model/local_storage_insight_repository.test.ts`
- Modify: `src/entities/insight/index.ts`

- [ ] **Step 1: 저장 후 새 인스턴스에서 복원하는 실패 테스트 작성**

  `InsightRepository` 공개 계약은 `load()`와 `save(insights)`를 제공한다. `createLocalStorageInsightRepository(storage)`에 메모리 Storage 대역을 주입하고 저장 후 새 repository에서 같은 데이터를 읽는 동작을 테스트한다.

- [ ] **Step 2: RED 확인 후 schemaVersion 1 envelope 최소 구현**

  key는 `amajda:insights`, payload는 `{ schemaVersion: 1, insights }`를 사용한다.

- [ ] **Step 3: 개별 손상 항목 격리 테스트와 구현**

  유효한 항목과 손상 항목이 섞이면 유효한 항목은 반환하고 `warnings: ['corrupted-entry']`를 반환한다.

- [ ] **Step 4: 전체 JSON·schema 손상 테스트와 구현**

  root JSON 또는 schema가 손상되면 빈 목록과 `warnings: ['corrupted-store']`를 반환한다. adapter가 예외를 외부로 던지지 않는다.

- [ ] **Step 5: 쓰기 실패 테스트와 구현**

  `Storage#setItem` 실패 시 `{ ok: false, reason: 'write-failed' }`를 반환하고 기존 storage 값을 변경하지 않는다.

- [ ] **Step 6: 전체 저장소 테스트**

  Run: `npm test -- src/entities/insight/model/local_storage_insight_repository.test.ts`

- [ ] **Step 7: 커밋**

  Commit: `feat: 브라우저 인사이트 저장소 구현`

### Task 3: #13 URL 저장·중복 방지·새로고침 복원 UI 연결

**Files:**
- Create: `src/app/model/use_insight_workspace.ts`
- Create: `src/app/model/use_insight_workspace.test.tsx`
- Modify: `src/app/authenticated_workspace.tsx`
- Modify: `src/app/authenticated_workspace.test.tsx`
- Modify: `src/app/model/workspace_seed.ts`
- Modify: `src/pages/save/ui/save_page.tsx`
- Modify: `src/pages/save/ui/save_page.test.tsx`
- Modify: `src/entities/insight/ui/insight_grid.tsx`
- Modify: `src/entities/insight/ui/insight_grid.test.tsx`

- [ ] **Step 1: URL 저장 후 보관함에 실제 원문이 나타나는 실패 통합 테스트 작성**

  저장소 대역을 `AuthenticatedWorkspace`에 주입하고 URL 저장 후 보관함 카드가 `originalUrl`을 `target="_blank"`, `rel="noreferrer"`로 여는지 검증한다.

- [ ] **Step 2: RED 확인 후 repository 기반 초기화와 저장 최소 구현**

  repository 저장 성공 뒤에만 React `insights`를 갱신한다. 제목 미입력 fallback은 domain, domain을 얻지 못하면 original URL이다. runtime mock seed는 제거하고 빈 저장소에서 시작한다.

- [ ] **Step 3: 동일 normalizedUrl 중복 테스트와 구현**

  중복 저장 시 새 카드를 추가하지 않고 입력값을 유지하며 기존 인사이트가 있다는 안내와 `보관함에서 보기` 행동을 제공한다.

- [ ] **Step 4: 잘못된 URL·지원하지 않는 protocol 테스트와 구현**

  `ftp:`, `javascript:`를 거부하고 입력값을 유지한다. 오류는 보이는 안내와 `aria-invalid`, `aria-describedby`로 연결한다.

- [ ] **Step 5: 저장소 읽기·쓰기 오류 UI 테스트와 구현**

  손상 데이터 경고는 정상 항목 사용을 막지 않는다. 쓰기 실패는 URL 입력을 보존하고 재시도 안내를 제공한다.

- [ ] **Step 6: 로컬 작업 화면 문구 정합성**

  실제 인증이 없는 workspace의 `Google 연결됨`을 브라우저 로컬 저장 상태를 설명하는 문구로 바꾼다. 기존 랜딩·로그인 진입 동작은 유지한다.

- [ ] **Step 7: 통합 테스트 및 커밋**

  Run: `npm test -- src/app/authenticated_workspace.test.tsx src/app/model/use_insight_workspace.test.tsx src/pages/save/ui/save_page.test.tsx src/entities/insight/ui/insight_grid.test.tsx`
  Commit: `feat: URL 저장과 새로고침 복원 연결`

### Task 4: #14 선택적 개인 맥락과 #4 저장 흐름 완주

**Files:**
- Modify: `src/app/model/use_insight_workspace.ts`
- Modify: `src/app/model/use_insight_workspace.test.tsx`
- Modify: `src/pages/save/ui/save_page.tsx`
- Modify: `src/pages/save/ui/save_page.css`
- Modify: `src/pages/save/ui/save_page.test.tsx`
- Modify: `src/entities/insight/ui/insight_grid.tsx`
- Modify: `src/app/authenticated_workspace.test.tsx`

- [ ] **Step 1: URL 저장 직후 건너뛰기 가능한 개인 맥락 질문 실패 테스트 작성**

  URL 저장 완료 후에만 `언제 다시 쓰고 싶은 자료인가요?`와 제목, 한 줄 메모, 단일 카테고리 입력을 표시한다.

- [ ] **Step 2: RED 확인 후 선택 입력 UI 최소 구현**

  `건너뛰기`는 이미 저장된 URL을 유지하고 보관함으로 이동한다.

- [ ] **Step 3: 개인 맥락 저장·복원 테스트와 구현**

  제목, memo, category를 저장하고 카드와 repository를 즉시 갱신한다. category는 trim·연속 공백 축약 후 빈 값은 null, 표기 대소문자는 보존한다.

- [ ] **Step 4: 개인 맥락 쓰기 실패 테스트와 구현**

  실패 시 먼저 저장된 URL과 입력값을 유지하고 재시도·건너뛰기 행동을 제공한다.

- [ ] **Step 5: 값 없는 카드의 빈 영역 회귀 테스트**

  memo와 category가 null이면 관련 DOM을 렌더링하지 않는다.

- [ ] **Step 6: #4 전체 회귀와 커밋**

  Run: `npm test -- src/app src/pages/save src/entities/insight`
  Commit: `feat: 저장 후 개인 맥락 입력 구현`

### Task 5: #5 인사이트 수정·삭제·원문 열기

**Files:**
- Modify: `src/app/model/use_insight_workspace.ts`
- Modify: `src/app/model/use_insight_workspace.test.tsx`
- Modify: `src/pages/library/ui/library_page.tsx`
- Modify: `src/pages/library/ui/library_page.css`
- Modify: `src/pages/library/ui/library_page.test.tsx`
- Modify: `src/entities/insight/ui/insight_grid.tsx`
- Modify: `src/entities/insight/ui/insight_grid.css`
- Modify: `src/entities/insight/ui/insight_grid.test.tsx`

- [ ] **Step 1: 제목·메모·카테고리 수정 실패 테스트 작성 후 GREEN**

  URL은 수정할 수 없고 저장 성공 시 `updatedAt`과 카드가 즉시 갱신되며 새로고침 후 유지된다.

- [ ] **Step 2: 삭제 취소·확정 실패 테스트 작성 후 GREEN**

  카드 안에서 명시적 확인 UI를 제공한다. 취소하면 유지하고 확정하면 repository 저장 성공 뒤 제거한다.

- [ ] **Step 3: 저장소 쓰기 실패 회귀 테스트**

  수정·삭제 실패 시 기존 카드와 입력을 유지하고 재시도 안내를 제공한다.

- [ ] **Step 4: 원문 열기 보안 계약 테스트**

  모든 원문은 `originalUrl`, `_blank`, `noreferrer`를 사용한다. 잘못된 URL은 링크 대신 문제 안내를 렌더링한다.

- [ ] **Step 5: 키보드 가능한 inline 편집·삭제 확인 구현**

  새 modal 의존성을 추가하지 않고 보이는 label과 button을 사용한다.

- [ ] **Step 6: 테스트 및 커밋**

  Run: `npm test -- src/pages/library src/entities/insight src/app/model/use_insight_workspace.test.tsx`
  Commit: `feat: 인사이트 수정과 삭제 흐름 구현`

### Task 6: #6 결정적 검색 코어와 보관함 검색

**Files:**
- Replace behavior in: `src/entities/insight/model/insight.ts`
- Create: `src/entities/insight/model/search_insights.ts`
- Create: `src/entities/insight/model/search_insights.test.ts`
- Modify: `src/entities/insight/index.ts`
- Modify: `src/pages/library/ui/library_page.tsx`
- Modify: `src/pages/library/ui/library_page.test.tsx`
- Modify: `src/app/authenticated_workspace.tsx`

- [ ] **Step 1: `docs/retrieve.md` 골든 fixture 첫 실패 테스트 작성**

  query `팀 프로젝트 로그인`, `온보딩 디자인`, `react`, `개발`의 기대 순서를 테스트한다.

- [ ] **Step 2: NFKC 토큰화와 필드 가중치 RED→GREEN**

  weight는 memo 4, title 3, category 2, domain 1, originalUrl 0.5다. 완전 일치 3, prefix 2, 전체 필드 부분 포함 1 배수를 사용한다.

- [ ] **Step 3: 다중 토큰·동점·결과 없음 RED→GREEN**

  점수가 같으면 `createdAt` 내림차순, 다시 같으면 `id` 오름차순이다.

- [ ] **Step 4: 일치 필드 정보 공개**

  검색 결과는 insight, score, matchedFields와 matchedTokens를 제공한다.

- [ ] **Step 5: 보관함 검색 연결**

  빈 query는 전체 목록, 입력 중에는 전체 결과를 표시한다. 제목·메모·카테고리·domain·URL 검색과 결과 없음의 입력 유지·초기화·링크 저장 행동을 검증한다.

- [ ] **Step 6: 테스트 및 커밋**

  Run: `npm test -- src/entities/insight/model/search_insights.test.ts src/pages/library/ui/library_page.test.tsx src/app/authenticated_workspace.test.tsx`
  Commit: `feat: 보관함 결정적 검색 구현`

### Task 7: #7 꺼내보기 작업팩과 연결 단서

**Files:**
- Create: `src/entities/insight/model/retrieve_insights.ts`
- Create: `src/entities/insight/model/retrieve_insights.test.ts`
- Modify: `src/pages/home/ui/home_page.tsx`
- Modify: `src/pages/home/ui/home_page.css`
- Modify: `src/pages/home/ui/home_page.test.tsx`
- Modify: `src/entities/insight/ui/insight_grid.tsx`
- Modify: `src/app/authenticated_workspace.tsx`

- [ ] **Step 1: 같은 검색 코어·최대 6개 실패 테스트 작성 후 GREEN**

  `retrieveInsights`는 `searchInsights` 결과 중 score 0을 제외하고 상위 6개만 반환한다.

- [ ] **Step 2: 실제 일치 필드 연결 단서 RED→GREEN**

  제목, 메모, 카테고리, domain 중 실제 일치한 정보만 사용하고 AI 판단처럼 보이는 표현을 사용하지 않는다.

- [ ] **Step 3: 추천 상황과 자유 입력 흐름 연결**

  빈 입력은 추천 상황을 유지하고, 추천 선택 또는 submit으로 작업팩을 만든다. 자유 입력 시 추천 선택 상태를 해제한다.

- [ ] **Step 4: 결과 없음과 원문 열기 회귀**

  입력을 유지하고 다른 상황 예시와 보관함 행동을 제공한다. 작업팩 원문은 새 탭으로 연다.

- [ ] **Step 5: 대표 상황 fixture와 테스트 및 커밋**

  Run: `npm test -- src/entities/insight/model/retrieve_insights.test.ts src/pages/home/ui/home_page.test.tsx src/app/authenticated_workspace.test.tsx`
  Commit: `feat: 꺼내보기 작업팩 흐름 구현`

### Task 8: #15 저장·보관함 관리 환경별 회귀

**Files:**
- Create: `docs/qa/mvp-05a-save-library.md`
- Modify only when a reproduced defect requires it: relevant source and nearest test

- [ ] **Step 1: 390·768·1280px 검증표 작성**

  URL 저장 → 새로고침 → 수정 → 삭제 취소 → 삭제 확정 → 원문 열기를 기록한다.

- [ ] **Step 2: 키보드·44px·label·선택 상태 검증**

  Tab/Enter/Space만으로 흐름을 완주하고 touch target, `aria-current`, `aria-pressed`를 기록한다.

- [ ] **Step 3: offline·손상 저장소·쓰기 실패 검증**

  네트워크 없이 흐름을 실행하고 입력 보존·복구 행동을 확인한다.

- [ ] **Step 4: 발견 결함별 TDD 수정**

  각 결함은 재현 테스트를 먼저 실패시킨 뒤 최소 수정하고 해당 테스트와 전체 회귀를 통과시킨다.

- [ ] **Step 5: 품질 명령 및 커밋**

  Run: `npm test && npm run lint && npm run build`
  Commit: `test: 저장과 보관함 환경별 회귀 검증`

### Task 9: #16 검색·꺼내보기 환경별 회귀

**Files:**
- Create: `docs/qa/mvp-05b-search-retrieve.md`
- Modify only when a reproduced defect requires it: relevant source and nearest test

- [ ] **Step 1: 390·768·1280px 검색·꺼내보기 검증표 작성**

  memo/domain 검색 → 원문 열기, 현재 상황 → 작업팩 → 원문 열기를 기록한다.

- [ ] **Step 2: 결과 없음·키보드·모션 축소 검증**

  입력 유지와 다음 행동, 추천 상황 선택 상태, reduced motion 정적 fallback을 확인한다.

- [ ] **Step 3: offline·overflow·console 검증**

  네트워크 없이 검색·꺼내보기를 완료하고 가로 overflow와 console error가 없는지 확인한다.

- [ ] **Step 4: 발견 결함별 TDD 수정**

  각 재현 테스트가 RED임을 확인하고 수정 후 GREEN과 전체 회귀를 확인한다.

- [ ] **Step 5: 품질 명령 및 커밋**

  Run: `npm test && npm run lint && npm run build`
  Commit: `test: 검색과 꺼내보기 환경별 회귀 검증`

### Task 10: #8 교차 회귀와 저장소 품질 게이트

**Files:**
- Create: `docs/qa/mvp-05-cross-regression.md`
- Modify if required: `prettier.config.js`
- Modify only when a reproduced defect requires it: relevant source and nearest test

- [ ] **Step 1: 전체 사용자 여정 교차 검증**

  URL 저장 → memo 추가 → 검색 → 꺼내보기 → 원문 열기를 390·768·1280px과 keyboard·offline 환경에서 완주한다.

- [ ] **Step 2: 포맷 검사 기존 실패 재현과 최소 수정**

  `npm run format:check`의 CRLF/LF 환경 의존 실패를 재현한다. 필요하면 Prettier `endOfLine: 'auto'`를 설정하고 검사 자체가 통과하는지 확인한다. 제품 파일 전체를 기계적으로 다시 쓰지 않는다.

- [ ] **Step 3: 전체 자동 검증**

  Run: `npm test`
  Run: `npm run lint`
  Run: `npm run format:check`
  Run: `npm run build`
  Run: `git diff --check`

- [ ] **Step 4: 최종 브라우저 smoke와 콘솔 검사**

  기존 로그인 전 reduced-motion 동작, 홈·보관함·저장, empty/error/success, navigation을 확인한다.

- [ ] **Step 5: 최종 커밋**

  Commit: `test: MVP 핵심 흐름 교차 회귀 완료`

GitHub 이슈나 프로젝트 상태는 사용자 승인 없이 변경하지 않는다. 구현 결과와 검증 근거만 로컬 코드와 QA 문서에 남긴다.
