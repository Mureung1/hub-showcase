# 남은 작업 전체 계획 — Week 2 마무리 (이슈 #7 · #8 · #9 · #10)

> 작성일: 2026-07-22 (수) · 대상: 열린 이슈 4개 + 잔여 정리 항목

## 목표 (한 줄)

**Week 2 수직 슬라이스의 마지막 조각인 DB 쓰기 사이클(#7)을 완성하고, 검증(#8·#9)과 회고(#10)로 한 주를 마감한다.**

## 현재 상태

- **완료**: #1 #2 #3 #4 #5 #6 #7 #8 #9 #11 #12 (+인프라 #17 #18) — 조회 + 쓰기 방향 수직 슬라이스, 검증 문서화, 통합 검증까지 모두 끝 (#7 PR #23, #8 PR #25, #9 PR #26 머지, `main` `2028869` 반영).
- **남은 이슈**: #10(회고·PR 정리)
- **잔여 정리 항목** (이슈 외):
  - ~~로컬 브랜치·main 동기화~~ → **완료 (2026-07-22)**: `main` 최신, `feat/issue-6-fe-api-connect` 삭제
  - `.github/workflows/deploy-pages.yml` — **main에서도 삭제됨** (`385d5b0`). 복원하지 않음
  - 미커밋 문서: `docs/user-stories.md`, `docs/week2/day1-presentation.md`, `docs/pr/issue-3·11-*.md`, `.cursor/skills/issue-workflow/`, `day6-remaining-work-plan.md` (커밋 여부 미결정)
  - `subsidies-repo.ts`의 `loadAll()`에 `order` 절이 없어 `sort=new`의 순서가 보장되지 않음 (#9에서 수정 예정)

## 범위

### 포함
- 묶음 0: 작업 환경 정리 (브랜치·워킹트리 복원)
- 이슈 #7 → #8 → #9 → #10 순서대로 진행 (계획-승인-구현-검증-커밋-PR 워크플로우)
- #9 안에서 `new` 정렬 버그 수정 포함

### 제외
- 매칭 조건 필터·점수 알고리즘 (3주차)
- 크롤러/실데이터 적재 (별도 트랙)
- 브라우저 자동화(E2E) 도입 — #8에서 jsdom 컴포넌트 테스트로 대체할지 결정

---

## 묶음 0 — 작업 환경 정리 (10분) ✅ 완료

- [x] `git checkout main && git pull --ff-only` — PR #22·#6 반영 (`385d5b0`)
- [x] `deploy-pages.yml` — **복원하지 않음** (의도대로 삭제 상태 유지)
- [x] 머지된 로컬 브랜치 삭제 (`feat/issue-6-fe-api-connect`)
- [ ] 미커밋 문서 처리 방침 결정: 커밋할 것(예: `user-stories.md`, `day1-presentation.md`) / 로컬 유지할 것(`.cursor/plans/`, 스킬)

## 이슈 #7 — DB 저장 사이클 완성 (목, P1) — 반나절

**목표**: 사용자가 온보딩 조건을 제출하면 Supabase 한 테이블에 기록되고, 성공 응답 후 화면 상태가 바뀐다.

### 7-1. 스키마 + 테이블 (30분)
- [x] `supabase/schema.sql`에 `match_requests` 테이블 추가 — 프로필 필드 + `sort` + `created_at` (`profile_logs` 대신 조건 저장 방식 확정 — 이슈 완료 기준과 직결)
- [x] Supabase SQL Editor에서 실행, RLS enable (service_role 접근이라 정책 불필요, #3과 동일) — 실행 완료, 테이블 존재 확인 (row 0건, 정상)

### 7-2. 서버 쓰기 경로 (40분)
- [x] `server/src/db/match-requests-repo.ts` — `insertMatchRequest(profile, sort)` (실패해도 조회 응답은 정상 반환: 로그 저장은 best-effort)
- [x] `POST /api/match` 핸들러에서 조회 전/후에 insert 호출
- [x] zod는 기존 `matchRequestSchema` 재사용 (변경 없음)
- [x] `match.test.ts`에 `match-requests-repo.js` mock 추가 + insert 호출 검증 1건 (build/test 20건/lint 통과 확인)

### 7-3. FE 연결 (30분)

- [x] 온보딩 완료 화면에서 `useSubmitProfile` mutation 실제 호출 (성공/실패에 따라 UI 피드백 — 실패해도 홈 이동은 막지 않음)
  - `CompleteScreen.tsx`: 버튼 클릭 시 `mutate({ profile, sort: 'match' }, { onSettled: () => navigate('/home') })` — 성공/실패 관계없이 항상 `/home` 이동
  - `isPending`일 때 버튼 비활성화 + "저장 중..." 표시, `isError`일 때 안내 문구(진행은 막지 않음)
  - 참고: `api/client.ts`의 `submitProfile`이 실패 시 이미 mock으로 fallback해 실제로 reject하지 않으므로, `isError` 분기는 방어적 코드에 가까움
  - 검증: `npm run dev`로 client(:5175)+server(:3001) 기동 → `curl POST /api/match` 실제 호출 → `match_requests` row 0건 → 1건 증가 확인 (DB 쓰기 경로 end-to-end 동작 확인). 브라우저 도구 미가용으로 버튼 클릭 자체는 `[UI 미검증]` — #9 수동 검증에서 확인 예정

### 7-4. 검증 + PR (40분)
- [x] 라우트 테스트: insert 실패해도 200 응답 유지 (repo mock) — `match.ts`에 `insertMatchRequest` 전용 try/catch 추가해 라우트 레벨에서도 방어, 테스트 1건 추가 (총 21건 통과)
- [x] Supabase에서 row 생성 확인 (`db:check` 확장 또는 SQL) — 7-3에서 curl로 실제 확인 (row 0→1), 검증용 임시 스크립트로 확인 후 정리
- [x] `npm test` / `npm run lint` → 커밋 → PR (`Closes #7`) — build/test(21)/lint 통과, 커밋 `200641b`

## 이슈 #8 — 기능 검증 Agent 산출물 (목, P1) — 2시간

**목표**: FE-BE-DB 수직 슬라이스를 검증하는 체크리스트와 실행 절차를 문서화한다.

- [x] `docs/week2/day6-verification-agent.md` 작성 — day2 체크리스트를 확장해 #4·#6·#7 범위 포함
  - 검증 항목: 온보딩 → 매칭 API → DB 조회/쓰기 → 화면 갱신 전체 사이클
  - 검증 방법 명시: `[코드]` / `[API]`(curl) / `[DB]`(임시 스크립트) / `[UI 미검증]` 구분 유지
  - 실제 curl 검증 수행: `GET /api/subsidies`(200/8건), `/:id`(200/404), `POST /api/match`(200/400), `match_requests` row 0→1→0 확인
  - **버그 재확인(미수정)**: `sort=new` 순서 미보장 — #9에서 수정 예정으로 재확인만
  - **stale 주석 발견(미수정)**: `useSubsidies.ts` JSDoc이 `POST /api/match` 미구현 시절 문구 — #9 또는 별도 정리에서 수정 권장
- [x] jsdom + Testing Library 도입 여부 — **미도입 결정**. `[UI 미검증]` 항목은 문서로만 남기고 #9 수동 검증 1회로 대체
- [x] 커밋 → PR (`Closes #8`) — PR #25 머지 완료, `main` `7acb1ae` 반영

## 이슈 #9 — 통합 검증 및 버그 수정 (금, P1) — 반나절

**목표**: 핵심 시나리오를 처음부터 끝까지 실행하고 깨지는 부분을 고친다.

- [x] **버그 수정**: `subsidies-repo.ts` `loadAll()`에 `.order('id', { ascending: true })` 추가 — `sort=new` 순서 보장, curl로 수정 전/후 비교 확인
- [x] **추가 정리**: `useSubsidies.ts`의 stale JSDoc 주석 수정 (#8에서 발견한 항목)
- [x] #8 체크리스트 전 항목 재실행 (curl 기반) — GET/POST 엔드포인트, 정렬 4종, DB row 증감 재확인
- [ ] 브라우저 수동 검증 1회 — **이번 세션도 브라우저 도구 미가용으로 못 함**. 대신 서버 중지 → 프록시 502 → 재기동 복구까지 curl로 확인해 fallback 트리거 조건은 검증함. 완료 화면 버튼 클릭 등 순수 UI 상호작용은 `[UI 미검증]`으로 남음 — 사용자가 직접 브라우저에서 한 번 훑어보는 걸 권장
- [x] `npm run lint` / `npm run build` / `npm test` 전체 통과
- [x] 발견된 버그 수정 후 결과를 검증 문서에 기록 → 커밋 → PR (`Closes #9`)

## 이슈 #10 — 학습 회고 및 PR 정리 (금, P2) — 2시간

**목표**: Agent 활용, 이해한 부분, 모호한 부분을 정리해 남긴다.

- [ ] `docs/week2/day1-presentation.md` 초안을 한 주 전체 회고로 확장
  - Agent 활용 방식: 계획 문서 → 묶음별 승인 → 검증 → PR 워크플로우 (+ `issue-workflow` 스킬로 구조화한 것)
  - 설명할 수 있는 부분 / 아직 이해 못 한 부분 (레포지토리 패턴, fallback, vi.mock, zod, `as` 캐스팅 등)
- [ ] 미커밋 문서들(`user-stories.md` 등) 이 PR에 포함할지 최종 결정
- [ ] `docs/week2_plan.md` 진행 현황 표 최종 갱신 (전 이슈 CLOSED)
- [ ] 커밋 → PR (`Closes #10`)

---

## 진행 방식

- 각 이슈는 `issue-workflow` 스킬대로: **묶음 시작 전 요약 → 사용자 승인 → 구현 → 검증**
- 브랜치: `feat/issue-7-db-write-cycle` → `docs/issue-8-verification` → `fix/issue-9-integration` → `docs/issue-10-retrospective`
- PR 본문은 템플릿(주요 작업/동작 확인/설명 가능/이해 못 함/범위 외/테스트 + `Closes #N`)

## 완료 기준 (Week 2 전체)

- [ ] 조건 제출이 Supabase에 기록되고 성공 응답 후 화면 상태가 바뀐다 (#7)
- [ ] 수직 슬라이스 검증 절차가 문서로 남는다 (#8)
- [ ] lint/build/수동 시나리오 검증 결과가 정리된다 (#9)
- [ ] 회고·PR 문서가 남고 Week 2 이슈가 전부 닫힌다 (#10)

## 리스크 / 결정 필요

| 항목 | 내용 | 기본 방침 |
|------|------|-----------|
| #7 저장 대상 | 사용자 조건(match request) vs 조회 로그 | **조건 저장** — 이슈 완료 기준("사용자가 조건을 제출하면 기록")에 직결 |
| insert 실패 처리 | 매칭 응답까지 실패시킬지 | best-effort — 로그 저장 실패가 조회 UX를 막으면 안 됨 |
| #8 jsdom 테스트 도입 | `[UI 미검증]` 자동화 vs 수동 1회로 충분 | 시간 되면 도입, 부족하면 #9 수동 검증으로 대체 |
| #8·#9 PR 분리 | 문서만 vs 문서+수정 | 각각 분리 (이슈별 `Closes` 매핑 명확) |
| 미커밋 문서 | `user-stories.md`, `day1-presentation.md` 등 | #10 PR에 포함, `.cursor/plans/`·스킬은 로컬 유지 |
