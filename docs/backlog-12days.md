# 알리장 개발 백로그

작성일 2026-07-11. [PROJECT.md](../PROJECT.md), [WIREFRAME.md](../WIREFRAME.md), [api-spec.md](api-spec.md) 참고.

**2026-07-20 개정**: 배포 가능성을 고려해 DB를 SQLite → Supabase로 전환하기로 결정. 이번 주 요구사항(테스트/TDD, 테스트코드 생성 Skill, 코드 검증 Agent, 아키텍처 다이어그램, 워크플로우 문서, 기능 강화 이슈화)을 반영하면서 원래 "12일 계획"보다 범위가 늘어남 — 아래 "조건"과 일정 갱신.

## 조건

- 기간: 2026-07-13(월)부터 시작, **월/화/수/목만 작업**, 하루 3~4시간. **총 19세션·2026-07-30(목)까지** (2026-07-27 결정: 네이버 블로그 연동을 이번 제출 범위에 추가하면서 원래 목표(07-30)로 하루 되돌림)
- 인원: 혼자 개발
- 제출: 2026-07-30까지
- 목표 범위: 프론트 완성 + 백엔드 실 연동(Supabase) + 테스트/TDD + Agent 산출물(테스트 Skill, 코드 검증 Agent, 워크플로우 문서) + 아키텍처 다이어그램(mermaid) + 네이버 블로그 연동(반자동)
- DB: SQLite로 시작 → Day 6에 Supabase로 전환 (2026-07-20 결정, 이유는 커밋/대화 기록 참고)
- LLM 연동: **이번 제출 범위에서는 보류**, 콘텐츠 생성은 규칙 기반 템플릿으로 유지 (2026-07-27 결정: LLM 연동은 나중에 직접 공부하면서 만들어보고 싶어서 별도 과제로 분리 — [8. 이후 과제](#8-이후-과제-범위-밖-다음-발전-방향) 참고)
- 네이버 블로그 연동: 공식 포스팅 API가 폐지되어 **반자동 방식**으로 진행 (2026-07-27 결정)
  - 발행: Playwright 완전 자동화 대신, AI가 만든 글을 클립보드에 복사 + 네이버 블로그 글쓰기 페이지를 새 탭으로 열어 사용자가 직접 붙여넣고 게시. 계정 정지·캡차 리스크를 피하고 07-30 기한 안에 확실히 끝내기 위한 선택. 완전 자동 발행(Playwright)은 이후 과제로 유지
  - **blogId 확보(2026-07-27 추가 결정)**: 사용자가 직접 입력하는 대신, Playwright로 `.env`에 저장된 네이버 계정에 로그인해 자동으로 blogId를 찾는다. 캡차/2단계 인증으로 실패하면 수동 입력으로 폴백(온보딩 "채널 연결" 단계, `POST /blog/connect`). 발행 자동화(위 항목)와는 별개로, 로그인 자동화 자체는 이 조회 용도로만 도입 — 실제 글 발행은 여전히 반자동을 유지한다
  - 조회(게시물 개수/최근 게시일 등): 로그인 자동화 없이 **RSS 피드 또는 네이버 검색 오픈API**로 해결 (공개 블로그 가정) — Day 17 예정
  - 예약 발행(2-6): 실제 무인 자동 게시가 아니라 **AI가 추천 요일/시간을 제공하는 것까지만** — 발행 실행은 항상 사용자의 수동 클릭(반자동 발행)

## 일정 조정 이력

이번 주 요구사항(Supabase/테스트/Skill/Agent/다이어그램)을 원래 계획에 다 얹으면서 한때 완료 시점이 2026-08-13까지 밀렸으나, 다음 조정을 거쳐 원래 목표(07-30)보다 하루 이른 **2026-07-29(수)**로 되돌림:

1. 기능 강화 스프린트(옛 Sprint 6, Day 16~17)를 범위에서 제외
2. 프론트-백엔드 연동(옛 Sprint 5)을 테스트/Skill/Agent 산출물(옛 Sprint 4)보다 앞으로 당김
3. Day 10~18 세션을 하루에 여러 개씩 묶어 실제 작업 가능한 요일(월/화/수/목)에 압축 배치

**2026-07-27 재조정**: Sprint 6을 "LLM 연동"에서 "네이버 블로그 연동(반자동)"으로 교체. LLM 연동은 이번 제출 범위에서 제외하고 이후 개인적으로 진행하기로 했고, 대신 8. 이후 과제로 미뤄뒀던 네이버 블로그 연동을 앞당겼다. 다만 Playwright 완전 자동화가 아니라 반자동(복붙) 방식으로 스코프를 좁혀서, 기한은 원래 목표였던 **2026-07-30(목)**으로 하루 늘리는 선에서 흡수했다.

## 현재 진행 상황 (2026-07-20 기준)

### 완료

| 항목 | 비고 |
| --- | --- |
| 메인 대시보드 `/` | 실제 Supabase 데이터(브랜드 프로필/브리핑/인사이트/최근 게시물) |
| AI 홍보글 작성 인터뷰 `/posts/promotion/new` | 실제 `POST /posts/promotion` 연동 |
| 홍보글 생성 결과 `/posts/promotion/result/:id` | 실제 Post 데이터 표시 |
| 예약 발행 `/posts/promotion/schedule/:id` | 실제 suggested-time/schedule API 연동 |
| 브랜드 온보딩 `/onboarding` | 실제 `POST /brand-profile` 연동 + 최초 진입 흐름 연결 완료 |
| 공지사항 작성 `/posts/notice/new` | 실제 `POST /posts/notice` 연동 |
| 공지사항 생성 결과 `/posts/notice/result/:id` | 실제 Post 데이터 표시 |
| 대시보드 버튼 라우팅 전수 연결 | 홍보글/공지사항/예약발행 복귀까지 확인 |
| Express 백엔드 프로젝트 셋업 | `server/` — SQLite + 마이그레이션 러너 |
| Post API (홍보글/공지사항) | `POST /posts/promotion`, `POST /posts/notice`, `GET /posts`, `GET /posts/:id`, `PATCH /posts/:id` — 콘텐츠는 규칙 기반, Supabase에 저장 |
| Supabase 전환 | SQLite → Supabase 마이그레이션 완료, Post API curl로 재검증 완료 |
| BrandProfile API | `GET /brand-profile`, `POST /brand-profile/interview`, `POST /brand-profile`, `PATCH /brand-profile` — summary/keywords 규칙 기반, Supabase에 저장 |
| 예약 발행 + 브리핑 API | `GET /posts/:id/suggested-time`, `POST/DELETE /posts/:id/schedule`, `GET /briefing/today` — 계절/업종 규칙 기반, 블로그 건강도는 mock |
| 인사이트 API + 블로그 연동 스텁 | `GET /insights/health-score`, `GET /insights/opportunities` — 실제 게시글 데이터 기반 규칙; `POST /blog/connect`, `GET /blog/analysis`는 고정 mock 스텁 |
| 프론트-백엔드 연동 1차 | `useBrandProfile`, `useBriefing`을 `useApiResource`(실제 fetch) 기반으로 교체, 브랜드 온보딩이 실제 `POST /brand-profile` 호출, 대시보드에 에러 상태 표시 추가 |
| 프론트-백엔드 연동 2차 | `usePosts`/`usePostResult`/`useNoticeResult`/`useSchedulePublish`/`useInsights` 실제 연동, 홍보글/공지사항 인터뷰가 실제 Post를 생성, 예약 발행이 실제 저장됨. `useMockResource`와 `api/mocks/` 전부 삭제 |

### 미완료

- 자동화 테스트 0개, 테스트 러너 미설치
- 테스트코드 생성 Skill, 코드 검증 Agent, 워크플로우 문서 — 전부 없음
- 아키텍처 다이어그램 — 없음
- 네이버 블로그 실 연동, LLM 실 연동

## 진행 원칙

- 하루 3~4시간이라 세션당 **작업 1~2개**로 제한한다. 끝나지 않으면 다음 세션으로 넘기지 말고 범위를 좁힌다.
- 백엔드는 인증 없이 단일 브랜드 가정 그대로 간다. Supabase 접근은 서버(Express)만 `service_role key`로 하고, 프론트에서 Supabase를 직접 호출하지 않는다 (RLS는 켜두되 정책은 만들지 않음 — service_role이 우회).
- 네이버 블로그 실 연동, 사진 분석, 실제 발행 연동은 계속 **8. 이후 과제**로 이월한다.
- LLM 연동은 브랜드 요약/키워드, 홍보글, 공지사항, 브리핑 추천 문구, 발행 시간 추천 이유 순으로 우선순위를 둔다.
- Agent를 쓸 때는 Plan mode로 먼저 계획/설계를 거친 뒤 단계적으로 진행한다. AI가 짜준 설계·계획을 그대로 받지 않고, 작업 크기·순서·빠진 부분을 직접 따져서 다듬은 뒤 진행한다.

## 스프린트 구성

| 스프린트 | 기간 | Day | 목표 |
| --- | --- | --- | --- |
| Sprint 1 — 프론트 마무리 | 07-13 ~ 07-14 | Day 1~2 | 공지사항 화면 추가, 전체 페이지 라우팅 연결 ✅ |
| Sprint 2 — 백엔드 구축(SQLite) | 07-15 ~ 07-16 | Day 3~5 | Express 셋업 + Post API ✅ (Day 4 BrandProfile은 스킵됨 → Day 7로 재배치) |
| Sprint 3 — Supabase 전환 & 백엔드 마무리 | 07-20 | Day 6~9 | Supabase 마이그레이션, BrandProfile, 예약발행/브리핑, 인사이트/블로그 스텁 ✅ |
| Sprint 4 — 프론트-백엔드 연동 | 07-21 | Day 10~11 | 목업 훅을 실제 API 호출로 전면 교체 ✅ |
| Sprint 5 — 테스트 & Agent 산출물 | 07-22 ~ 07-23 | Day 12~15 | 테스트/TDD, 테스트코드 생성 Skill, 코드 검증 Agent, 아키텍처 다이어그램 |
| Sprint 6 — 네이버 블로그 연동(반자동) | 07-27 ~ 07-29 | Day 16~17.5~18 | 반자동 발행 트리거 + blogId 확보(네이버 로그인 OAuth) + 블로그 정보 조회(RSS/검색API) + 프론트 통합 |
| Sprint 7 — 통합 점검 | 07-30 | Day 19 | e2e 테스트, 예외 처리, 워크플로우 문서, README 정리 |

프론트-백엔드 연동(옛 Sprint 5)을 테스트/Skill/Agent 산출물(옛 Sprint 4)보다 앞으로 당긴 이유: 백엔드 API가 Sprint 3에서 이미 다 갖춰졌기 때문에 순서를 바꿔도 막히는 의존관계가 없고, 프론트 연동을 먼저 끝내두면 이후 테스트 대상 범위(프론트+백엔드)가 더 명확해짐.

**스프린트 완료 기준**

- Sprint 3: `api-spec.md`의 BrandProfile/Post/예약발행/브리핑/인사이트 엔드포인트가 전부 Supabase 기반으로 응답
- Sprint 4: 프론트 어디에도 `useMockResource` 의존이 남아있지 않음
- Sprint 5: `npm test`로 실행되는 테스트가 있고 그중 하나는 TDD로 작성됨, 테스트 Skill과 코드 검증 Agent가 실제로 한 번 이상 사용됨, README에 mermaid 다이어그램이 있음
- Sprint 6: 대시보드에서 "네이버에 게시" 클릭 시 클립보드 복사 + 네이버 글쓰기 페이지가 열리고, 블로그 건강도/최근 게시물 카드가 실제 네이버 블로그 조회 데이터(RSS/검색API)로 표시됨
- Sprint 7: README만 보고 처음 보는 사람이 로컬에서 전체 흐름을 실행할 수 있고, 워크플로우 문서로 개발 과정을 설명할 수 있음

---

## Day 1 — 2026-07-13 (월) ✅

**목표:** 공지사항 작성 화면 (프론트, 목데이터) — 완료

- [x] `src/components/notice-write/` 인터뷰 컴포넌트
- [x] `src/pages/NoticeWrite.jsx` 페이지 + 생성 결과 화면
- [x] `useMockResource` 기반 목업 훅 연결

---

## Day 2 — 2026-07-14 (화) ✅

**목표:** 전체 페이지 라우팅 연결 — 완료

- [x] `App.jsx`에 `/posts/notice/new` 라우트 추가
- [x] 대시보드 버튼 라우팅 연결 확인·수정
- [x] 앱 최초 진입 시 온보딩 여부 분기
- [x] 예약 발행 완료 후 대시보드로 복귀하는 흐름 확인

---

## Day 3 — 2026-07-15 (수) ✅

**목표:** 백엔드 프로젝트 셋업 — 완료

- [x] `server/` 폴더에 Express 프로젝트 초기화
- [x] 데이터 저장 방식 세팅 (SQLite, 자체 마이그레이션 러너)
- [x] 공통 에러 포맷 미들웨어, CORS, `.env` 세팅
- [x] 프론트 `VITE_API_BASE_URL`이 로컬 서버를 가리키도록 확인

---

## Day 4 — 2026-07-16 (목) — 스킵됨, Day 7에서 재개

**목표:** BrandProfile API

당시 진행하지 않고 Day 5(Post API)로 넘어감. 아래 항목은 Day 7(Supabase 기반)에서 다시 진행.

- [ ] `GET /brand-profile`, `POST /brand-profile/interview`, `POST /brand-profile`, `PATCH /brand-profile`
- [ ] summary/keywords 규칙 기반 생성
- [ ] 수동 테스트

---

## Day 5 — 2026-07-16 (목) ✅

**목표:** Post API — 작성/조회 — 완료

- [x] `POST /posts/promotion/interview`, `POST /posts/promotion`
- [x] `POST /posts/notice/interview`, `POST /posts/notice`
- [x] `GET /posts`, `GET /posts/:id`, `PATCH /posts/:id`
- [x] 콘텐츠 생성은 규칙 기반 템플릿으로 구현

---

## Day 6 — 2026-07-20 (월) ✅

**목표:** Supabase 전환 (SQLite → Supabase 마이그레이션)

- [x] `@supabase/supabase-js` 설치, `server/src/db/index.js`를 Supabase 클라이언트 초기화로 교체 (서버는 `service_role key` 사용)
- [x] `server/migrations/*.sql`을 Supabase SQL Editor에서 실행해 `posts` 테이블 생성 (기존 스키마 재사용)
- [x] `postsRepo.js`를 `better-sqlite3` 동기 API → `supabase-js` 비동기 쿼리로 교체, 라우트 핸들러 async 처리
- [x] 기존 홍보글/공지사항 API가 Supabase 위에서 그대로 동작하는지 curl로 재검증

**완료 기준:** `POST /posts/promotion`, `POST /posts/notice` 등 기존 Post API가 SQLite 대신 Supabase에 저장/조회되고, Supabase 대시보드 테이블 뷰에서 직접 확인 가능

---

## Day 7 — 2026-07-20 (월) ✅

**목표:** BrandProfile API (Supabase 기반, Day 4 재개)

- [x] `brand_profiles` 테이블 마이그레이션 작성
- [x] `GET /brand-profile`, `POST /brand-profile/interview`, `POST /brand-profile`, `PATCH /brand-profile` 구현
- [x] summary/keywords는 규칙 기반 템플릿으로 생성 (LLM은 Day 18에 붙임)
- [x] curl로 수동 테스트

**완료 기준:** 온보딩 인터뷰 답변이 Supabase에 저장되고, 완료 시 요약/키워드가 포함된 프로필이 생성됨

---

## Day 8 — 2026-07-20 (월) ✅

**목표:** 예약 발행 + 브리핑 API

- [x] `GET /posts/:id/suggested-time`, `POST /posts/:id/schedule`, `DELETE /posts/:id/schedule`
- [x] `GET /briefing/today` (블로그 현황 mock 값 + 계절/업종 기반 규칙으로 추천 문구 생성)

**완료 기준:** 예약 발행 화면에서 추천 시간을 실제 API로 받아오고, 예약 확정이 Supabase에 저장됨

---

## Day 9 — 2026-07-20 (월) ✅

**목표:** 인사이트 API + 블로그 연동 스텁

- [x] `GET /insights/health-score`, `GET /insights/opportunities`
- [x] `POST /blog/connect`, `GET /blog/analysis`는 고정 mock 응답으로 스텁만 구현 (실 연동은 8. 이후 과제)

**완료 기준:** 대시보드 블로그 건강도 카드가 실제 API 응답으로 렌더링 가능한 데이터 반환

---

## Day 10 — 2026-07-21 (화) ✅

**목표:** 프론트-백엔드 연동 1차

- [x] `useBrandProfile`, `useBriefing`을 목업에서 실제 `api/client.js` 호출로 교체
- [x] 온보딩 → 브리핑 표시까지 실제 서버로 e2e 확인, 에러/로딩 상태 점검

**완료 기준:** 온보딩 완료 후 대시보드 브리핑이 실제 Supabase 데이터로 표시됨

---

## Day 11 — 2026-07-21 (화) ✅

**목표:** 프론트-백엔드 연동 2차

- [x] `usePosts`, `usePostResult`, `useSchedulePublish`, `useInsights` 실제 API 연동
- [x] 남은 목업 훅 정리, `useMockResource` 의존성 제거
- [x] 대시보드 최근 게시물(usePosts) 실제 연동
- [x] 대시보드 인사이트(useInsights) 실제 연동
- [x] 홍보글 인터뷰 → 실제 POST /posts/promotion 연동
- [x] 홍보글 결과 화면(PostResult)을 실제 Post 데이터로 교체
- [x] 공지사항 인터뷰 → 실제 POST /posts/notice 연동
- [x] 공지사항 결과 화면(NoticeResult)을 실제 Post 데이터로 교체
- [x] 예약 발행 화면을 실제 suggested-time/schedule API로 재구성
- [x] 남은 useMockResource 의존성 정리 + 백로그 Day 11 체크

**완료 기준:** 홍보글/공지사항 작성부터 예약 발행까지 전체 흐름이 mock 없이 실제 백엔드로 동작

---

## Day 12 — 2026-07-22 (수)

**목표:** 테스트 환경 셋업 + 공지사항 흐름 테스트 작성

막상 진행해보니 이미 구현된 기능에 나중에 테스트를 붙이는 상황이라 TDD("테스트 먼저 → 실패 확인 → 구현") 순서는 의미가 없어서, 의도적으로 생략하고 사후 테스트 작성으로 방향을 바꿨다. 대신 기댓값은 코드 실행 결과를 베끼지 않고 문서/도메인 규칙 기준으로 먼저 정했다 — 근거와 컨벤션은 `TESTING.md`에 문서화.

- [x] `server`에 테스트 러너 설치 (vitest + supertest)
- [x] TDD는 생략하고 사후 테스트로 진행하기로 결정, 테스트 컨벤션을 `TESTING.md`에 문서화
- [x] 공지사항(`notice`) 흐름 테스트 작성: `buildNoticePost` 단위 테스트(`postContent.test.js`), `POST /posts/notice`·`GET /posts/:id` 통합 테스트(`posts.test.js`)
- [x] 홍보글(`promotion`) 테스트 추가 — `buildPromotionPost` 단위 테스트 (Day 13 test-codegen 스킬 검증 겸용)
- [ ] BrandProfile CRUD 테스트 추가 — 다음 세션으로 이월

**완료 기준:** ~~TDD로 작성된 과정이 커밋 히스토리에 남아있음~~ → `npm test`로 실행되는 테스트가 있고, 테스트 컨벤션이 `TESTING.md`로 문서화됨 (TDD 생략 결정에 따라 완료 기준 수정)

---

## Day 13 — 2026-07-22 (수)

**목표:** 테스트코드 생성 Skill 제작

- [x] `.claude/skills/`에 테스트코드 생성 Skill 작성 — 이 프로젝트의 테스트 컨벤션(러너, 파일 위치, mocking 방식)을 반영 (`test-codegen`)
- [x] 스킬로 기존 미검증 기능 하나에 테스트를 생성해보고 실제로 통과하는지 확인 — `buildPromotionPost`(홍보글 생성, 미검증 상태였음)에 7개 테스트 작성, `postContent.test.js`에 통합, 11/11 통과

**완료 기준:** 스킬을 호출해 실제로 통과하는 테스트 코드가 생성됨 ✅

---

## Day 14 — 2026-07-23 (목)

**목표:** 코드 검증 Agent 제작 + 적용

- [ ] `.claude/agents/`에 코드 검증 Agent 정의 (역할: 개발한 기능이 요구사항/완료 기준을 충족하는지, 버그·누락이 없는지 점검)
- [ ] 지금까지 만든 기능(Post API 또는 BrandProfile API) 중 하나에 이 Agent를 실제로 돌려서 피드백을 받고 반영

**완료 기준:** Agent가 실제 기능에 대해 리뷰 결과를 내고, 그중 하나 이상을 실제 수정에 반영함

---

## Day 15 — 2026-07-23 (목)

**목표:** 아키텍처 다이어그램 + README

- [ ] 화면(React) - 서버(Express) - DB(Supabase) 구조와 데이터 흐름을 mermaid로 작성 (예: 홍보글 작성 인터뷰 → 생성 → 저장 흐름을 시퀀스 다이어그램으로)
- [ ] `README.md`에 다이어그램 삽입, 내 말로 구조를 설명하는 글 추가

**완료 기준:** README만 보고 처음 보는 사람이 데이터 흐름을 그림으로 이해할 수 있고, 본인이 그 구조를 말로 설명할 수 있음

---

## Day 16 — 2026-07-27 (월)

**목표:** 네이버 반자동 발행 (1) — 발행 트리거 설계 + 백엔드

- [x] 발행 방식 확정: AI가 생성한 글(제목+본문)을 클립보드에 복사 + 네이버 블로그 글쓰기 페이지를 새 탭(`window.open`)으로 열기 — 발행 자체의 로그인/포스팅 자동화(Playwright)는 하지 않음
- [x] 프론트에 "네이버에 게시" 버튼 추가: 클립보드 복사 + 새 탭 열기 동작 구현 (`SchedulePublish.jsx`)
- [x] 사용자가 실제 게시를 마쳤음을 확인하는 "게시 완료" 버튼 → `PATCH /posts/:id`로 상태를 `published`로 변경 + 실제 글 URL(`publishedUrl`) 저장, 대시보드 최근 게시물에서 클릭 시 이동
- [x] `api-spec.md`에 반자동 발행 흐름과 상태 전이(`draft → published`) 문서화
- [x] **추가 작업(범위 밖에서 당겨옴)**: 온보딩 "채널 연결" 단계가 실제 API를 호출하지 않는 mock이었던 걸 발견 → blogId 확보 작업에 착수. 이날 안에 결론이 안 나서 Day 17로 이월됨 (아래 참고)

**완료 기준:** 홍보글/공지사항 결과 화면에서 "네이버에 게시" 클릭 시 클립보드 복사와 새 탭 열기가 동작하고, "게시 완료" 클릭 시 실제로 DB 상태가 바뀜.

**세션 예산 초과 + 설계 번복**: 원래 계획(발행 트리거)에 더해 blogId 확보까지 같은 세션에 들어가 "세션당 작업 1~2개" 원칙을 넘었다. blogId 확보 방식도 이날 하루에 두 번 갈아엎었다 — ① 서버가 `.env` 고정 계정으로 대신 로그인(Playwright) → 사용자가 원한 게 아니라서 폐기 ② Playwright로 실제 브라우저 창을 띄워 사용자가 직접 로그인 → PC를 계속 켜둬야 해서(로컬 전용) 사용자 상황과 안 맞아 폐기. 최종 방식은 Day 17에 결정·구현.

---

## Day 17 — 2026-07-28 (화)

**목표(변경):** blogId 확보 최종 구현 — 네이버 로그인(OAuth) + 후보 확인

Day 16에서 못 끝낸 blogId 확보를 마무리했다. 원래 이 날 목표였던 "블로그 정보 조회 연동(RSS/검색API)"는 Day 18로 밀렸다.

- [x] 최종 방식 결정: "네이버 아이디로 로그인"(OAuth, 지금도 공식 지원)으로 사용자가 직접 네이버에 로그인 → `/v1/nid/me`에서 `id`/`nickname` 확보. blogId는 이 응답에 없어서, `nickname`(또는 `id`)으로 `blog.naver.com/{후보}` 존재 여부를 서버가 확인하고 사용자에게 "맞나요?" 확인을 받는 방식으로 확정 (틀리면 직접 입력 폴백)
- [x] `GET /auth/naver`, `GET /auth/naver/callback` 구현 (`naverOAuth.js`) — Playwright 의존성 제거
- [x] `brand_profiles`에 `naver_id`/`blog_id`/`blog_id_confirmed` 저장 (온보딩 3단계 `POST /brand-profile` 호출 시 함께 저장)
- [x] 온보딩 "채널 연결" 화면에 후보 확인 카드("이 블로그가 맞나요?") + 수동 입력 폴백 UI 구현
- [x] 네이버 로그인을 API 요청을 보호하는 세션으로 확장할지 논의 → 지금은 blogId 확보 용도로만 한정, 세션 인증은 이후 과제로 유지 (`api-spec.md` 공통 사항에 명시)

**완료 기준:** 온보딩에서 "네이버로 로그인" 클릭 → 실제 네이버 로그인 페이지로 이동 → 로그인 후 blogId 후보 확인 카드 또는 수동 입력으로 blogId가 확정되고, 최종적으로 `BrandProfile`에 저장됨

**남은 선행 작업(사용자 직접)**: [developers.naver.com](https://developers.naver.com)에서 애플리케이션 등록 후 `NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET`을 `.env`에 입력, Redirect URI를 `http://localhost:4000/api/auth/naver/callback`로 등록. 이거 없이는 실제 로그인 테스트 불가능.

---

## Day 17.5 — 블로그 정보 조회 연동 (원래 Day 17, 뒤로 밀림)

**목표:** blogId로 실제 조회 데이터 가져오기 (로그인 불필요)

- [ ] 조회 방식 결정: 블로그 공개 여부 확인 후 RSS 피드(`rss.blog.naver.com/{blogId}.xml`) 또는 네이버 검색 오픈API 중 선택
- [ ] `GET /blog/analysis` 스텁을 실제 구현으로 교체: 게시물 개수, 최근 게시일, 게시 주기 계산
- [ ] 삭제/수정 감지는 시간이 남으면 착수 — 이전 조회 스냅샷과 최신 결과를 비교하는 방식만 설계까지 (구현은 이후 과제로 미뤄도 됨)

**완료 기준:** blogId를 연동하면 `GET /blog/analysis`가 실제 네이버 블로그 데이터(mock 아님)를 반환함

**일정 압박 경고**: 07-30 기한까지 이제 이틀(07-29, 07-30) 남았는데 이 항목이 아직 안 끝났다. Day 18 세션에 이 항목까지 욱여넣거나, 시간이 부족하면 조회 기능을 더 단순화(예: 게시물 개수만/캐시 없이 매번 조회)하는 것도 고려해야 한다.

---

## Day 18 — 2026-07-29 (수)

**목표:** Day 17.5(블로그 조회 연동) 마무리 + 프론트 통합 + 반자동 발행 예외 처리

- [ ] (Day 17.5에서 못 끝냈으면 여기서 마무리) `GET /blog/analysis` 실 구현
- [ ] 대시보드 블로그 건강도/최근 게시물 카드를 실제 조회 데이터로 교체
- [ ] 기존 `GET /posts/:id/suggested-time`(이미 구현됨)를 반자동 발행 버튼 옆에 "추천: 토요일 오전 11시" 형태로 노출 — 실행은 여전히 사용자의 수동 클릭, 실제 자동 게시는 하지 않음
- [ ] 반자동 발행 실패/예외 케이스 UI 처리: 클립보드 복사 실패, 팝업(새 탭) 차단 등

**완료 기준:** 대시보드가 실제 네이버 블로그 데이터를 보여주고, 반자동 발행 버튼 흐름(추천 시간 확인 → 게시 → 완료 처리)이 예외 케이스 포함해 끊기지 않고 동작

---

## Day 19 — 2026-07-30 (목)

**목표:** 통합 점검 및 마무리

- [ ] 전체 플로우(온보딩 → 브리핑 → 작성 → 반자동 게시 → 블로그 조회 데이터 갱신 확인) 처음부터 끝까지 실사용 테스트
- [ ] 로딩/에러 상태, 빈 데이터 케이스 등 UI 예외 처리 점검
- [ ] 워크플로우 문서 정리 — Plan mode로 계획을 세우고 Agent를 단계적으로 활용한 방식, 만든 Skill/Agent 사용법, 네이버 연동을 반자동으로 결정한 이유를 문서로 정리
- [ ] README 최종 업데이트 (실행 방법, 구현 범위, 남은 과제 — LLM 실 연동/Playwright 완전 자동화는 이후 과제로 명시)
- [ ] **테스트 데이터 격리 방식 결정** (Day 14에서 발견): `brandProfile.test.js`/`brandProfileRepo.test.js`의 "프로필 없음(404/null)" 케이스가 테이블이 우연히 비어 있다는 전제에만 의존 — 실제 사용으로 데이터가 쌓이면 버그 없이도 깨짐. 후보: ① 백업 후 복원(운영 데이터 유실 위험 있음) ② 테스트 전용 Supabase 프로젝트 분리(정석이지만 설정 무거움) ③ 이 분기는 자동화 포기하고 수동 확인으로 전환

**완료 기준:** 처음 보는 사람이 README만 보고 로컬에서 전체 흐름을 실행해볼 수 있고, 워크플로우 문서로 개발 과정을 설명할 수 있는 상태

---

## 8. 이후 과제 (범위 밖, 다음 발전 방향)

- `code-verifier` 에이전트에 커버리지 수치 참고 지표 추가 (`@vitest/coverage-v8` 등 설치 필요 — 판정 기준(분기/에러코드 매칭)에는 안 쓰고, 리포트에 참고용으로만 첨부)
- 네이버 블로그 완전 자동 발행 (Playwright로 로그인·스마트에디터·발행까지 자동화, 서버 스케줄러가 `scheduledAt` 감시 → 무인 발행. 2026-07-27부터는 반자동(복붙) 방식으로 우선 구현하고, 이건 그 다음 단계)
- LLM 실제 연동 (브랜드 요약/키워드, 홍보글·공지 생성, 브리핑·추천 근거 문구에 실제 LLM API 연결. 2026-07-27 결정: 직접 학습하며 만들어보고 싶어서 이번 제출 범위에서 제외하고 별도로 진행)
- 사진 업로드 기반 AI 배치/썸네일 추천 고도화
- 인증/세션 도입 (다중 브랜드 지원 시, 또는 API 요청 자체를 보호할 필요가 생기면 — Supabase Auth 활용 검토). 2026-07-28 결정: 온보딩의 네이버 로그인(OAuth)은 blogId 확보 용도로만 쓰고 세션 발급까지는 하지 않기로 함 — 이후 과제로서의 "진짜 인증"은 이 네이버 로그인을 세션으로 확장하는 것도 방법 중 하나
- 이미지 저장소(Supabase Storage 등) 및 업로드 용량 정책
- LLM 호출 비용 관리 (인터뷰 단계별 호출 vs 배치 생성)
- SNS 통합 관리, 성과 예측 등 PROJECT.md 6장 확장 아이디어
- 신메뉴 개발을 돕는 서비스도 있으면 좋을듯
- 브랜드 프로필 업데이트 제안(홍보글 작성한걸 토대로 변화 감지)
- AI의 추천을 받아 예약발행
- 블로그 건강도 세부 분석(게시 주기90점
SEO
75점
콘텐츠 다양성
80점
계절 반영
83점)
