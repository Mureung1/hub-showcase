# 알리장 개발 백로그

작성일 2026-07-11. [PROJECT.md](../PROJECT.md), [WIREFRAME.md](../WIREFRAME.md), [api-spec.md](api-spec.md) 참고.

**2026-07-20 개정**: 배포 가능성을 고려해 DB를 SQLite → Supabase로 전환하기로 결정. 이번 주 요구사항(테스트/TDD, 테스트코드 생성 Skill, 코드 검증 Agent, 아키텍처 다이어그램, 워크플로우 문서, 기능 강화 이슈화)을 반영하면서 원래 "12일 계획"보다 범위가 늘어남 — 아래 "조건"과 일정 갱신.

## 조건

- 기간: 2026-07-13(월)부터 시작, **월/화/수/목만 작업**, 하루 3~4시간. 범위 확장(테스트/Skill/Agent/다이어그램)에도 세션 일정을 압축해 **총 18세션·2026-07-29(수)까지**로 원래 목표(07-30)보다 하루 앞당김
- 인원: 혼자 개발
- 제출: 2026-07-29까지
- 목표 범위: 프론트 완성 + 백엔드 실 연동(Supabase) + 테스트/TDD + Agent 산출물(테스트 Skill, 코드 검증 Agent, 워크플로우 문서) + 아키텍처 다이어그램(mermaid)
- DB: SQLite로 시작 → Day 6에 Supabase로 전환 (2026-07-20 결정, 이유는 커밋/대화 기록 참고)
- LLM 연동: 실제 LLM API 연동을 시도하되, 각 생성 기능은 **LLM 호출 실패/미설정 시 규칙 기반 템플릿으로 자동 대체**되는 구조로 만든다

## 일정 조정 이력

이번 주 요구사항(Supabase/테스트/Skill/Agent/다이어그램)을 원래 계획에 다 얹으면서 한때 완료 시점이 2026-08-13까지 밀렸으나, 다음 조정을 거쳐 원래 목표(07-30)보다 하루 이른 **2026-07-29(수)**로 되돌림:

1. 기능 강화 스프린트(옛 Sprint 6, Day 16~17)를 범위에서 제외
2. 프론트-백엔드 연동(옛 Sprint 5)을 테스트/Skill/Agent 산출물(옛 Sprint 4)보다 앞으로 당김
3. Day 10~18 세션을 하루에 여러 개씩 묶어 실제 작업 가능한 요일(월/화/수/목)에 압축 배치

## 현재 진행 상황 (2026-07-20 기준)

### 완료

| 항목 | 비고 |
| --- | --- |
| 메인 대시보드 `/` | 프론트, 목데이터 |
| AI 홍보글 작성 인터뷰 `/posts/promotion/new` | 프론트, 목데이터 |
| 홍보글 생성 결과 `/posts/promotion/result` | 프론트, 목데이터 |
| 예약 발행 `/posts/promotion/schedule` | 프론트, 목데이터 |
| 브랜드 온보딩 `/onboarding` | 프론트, 목데이터 + 최초 진입 흐름 연결 완료 |
| 공지사항 작성 `/posts/notice/new` | 프론트, 목데이터 |
| 대시보드 버튼 라우팅 전수 연결 | 홍보글/공지사항/예약발행 복귀까지 확인 |
| Express 백엔드 프로젝트 셋업 | `server/` — SQLite + 마이그레이션 러너 |
| Post API (홍보글/공지사항) | `POST /posts/promotion`, `POST /posts/notice`, `GET /posts`, `GET /posts/:id`, `PATCH /posts/:id` — 콘텐츠는 규칙 기반, Supabase에 저장 |
| Supabase 전환 | SQLite → Supabase 마이그레이션 완료, Post API curl로 재검증 완료 |
| BrandProfile API | `GET /brand-profile`, `POST /brand-profile/interview`, `POST /brand-profile`, `PATCH /brand-profile` — summary/keywords 규칙 기반, Supabase에 저장 |
| 예약 발행 + 브리핑 API | `GET /posts/:id/suggested-time`, `POST/DELETE /posts/:id/schedule`, `GET /briefing/today` — 계절/업종 규칙 기반, 블로그 건강도는 mock |
| 인사이트 API + 블로그 연동 스텁 | `GET /insights/health-score`, `GET /insights/opportunities` — 실제 게시글 데이터 기반 규칙; `POST /blog/connect`, `GET /blog/analysis`는 고정 mock 스텁 |
| 프론트-백엔드 연동 1차 | `useBrandProfile`, `useBriefing`을 `useApiResource`(실제 fetch) 기반으로 교체, 브랜드 온보딩이 실제 `POST /brand-profile` 호출, 대시보드에 에러 상태 표시 추가 |

### 미완료

- 프론트 훅(`usePosts`, `usePostResult`, `useSchedulePublish`, `useInsights`) 아직 목업(`useMockResource`) 기반
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
| Sprint 4 — 프론트-백엔드 연동 | 07-21 | Day 10~11 | 목업 훅을 실제 API 호출로 전면 교체 |
| Sprint 5 — 테스트 & Agent 산출물 | 07-22 ~ 07-23 | Day 12~15 | 테스트/TDD, 테스트코드 생성 Skill, 코드 검증 Agent, 아키텍처 다이어그램 |
| Sprint 6 — LLM 연동 | 07-27 ~ 07-28 | Day 16~17 | LLM 폴백 구조 설계 + 생성 기능 전반 연결 |
| Sprint 7 — 통합 점검 | 07-29 | Day 18 | e2e 테스트, 예외 처리, 워크플로우 문서, README 정리 |

프론트-백엔드 연동(옛 Sprint 5)을 테스트/Skill/Agent 산출물(옛 Sprint 4)보다 앞으로 당긴 이유: 백엔드 API가 Sprint 3에서 이미 다 갖춰졌기 때문에 순서를 바꿔도 막히는 의존관계가 없고, 프론트 연동을 먼저 끝내두면 이후 테스트 대상 범위(프론트+백엔드)가 더 명확해짐.

**스프린트 완료 기준**

- Sprint 3: `api-spec.md`의 BrandProfile/Post/예약발행/브리핑/인사이트 엔드포인트가 전부 Supabase 기반으로 응답
- Sprint 4: 프론트 어디에도 `useMockResource` 의존이 남아있지 않음
- Sprint 5: `npm test`로 실행되는 테스트가 있고 그중 하나는 TDD로 작성됨, 테스트 Skill과 코드 검증 Agent가 실제로 한 번 이상 사용됨, README에 mermaid 다이어그램이 있음
- Sprint 6: LLM 키 유무에 상관없이 전 기능이 정상 동작함
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

## Day 11 — 2026-07-21 (화)

**목표:** 프론트-백엔드 연동 2차

- [ ] `usePosts`, `usePostResult`, `useSchedulePublish`, `useInsights` 실제 API 연동
- [ ] 남은 목업 훅 정리, `useMockResource` 의존성 제거

**완료 기준:** 홍보글/공지사항 작성부터 예약 발행까지 전체 흐름이 mock 없이 실제 백엔드로 동작

---

## Day 12 — 2026-07-22 (수)

**목표:** 테스트 환경 셋업 + TDD로 핵심 기능 검증

- [ ] `server`에 테스트 러너 설치 (vitest 추천 — ESM 네이티브, 설정 간단)
- [ ] 핵심 기능 하나를 **테스트 먼저 작성 → 실패 확인 → 구현/리팩터 → 통과** 순서(TDD)로 진행 (예: `buildPromotionPost` 규칙 기반 생성 로직, 혹은 `POST /posts/promotion` 통합 테스트)
- [ ] 나머지 핵심 API(Post/BrandProfile CRUD)에 최소한의 단위/통합 테스트 추가

**완료 기준:** `npm test`로 실행되는 테스트가 있고, 그중 최소 1개는 TDD로 작성된 과정이 커밋 히스토리에 남아있음

---

## Day 13 — 2026-07-22 (수)

**목표:** 테스트코드 생성 Skill 제작

- [ ] `.claude/skills/`에 테스트코드 생성 Skill 작성 — 이 프로젝트의 테스트 컨벤션(러너, 파일 위치, mocking 방식)을 반영
- [ ] 스킬로 기존 미검증 기능 하나에 테스트를 생성해보고 실제로 통과하는지 확인

**완료 기준:** 스킬을 호출해 실제로 통과하는 테스트 코드가 생성됨

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

**목표:** LLM 연동 (1) — 브랜드 요약/키워드, 홍보글·공지 생성

- [ ] LLM 서비스 모듈 작성: API 키 있으면 실제 호출, 없거나 실패하면 기존 규칙 기반 함수로 폴백
- [ ] BrandProfile 생성, Post(promotion/notice) 생성 로직에 LLM 서비스 연결
- [ ] `.env`에 LLM API 키 항목 추가, 미설정 시에도 앱이 정상 동작하는지 확인

**완료 기준:** API 키를 넣으면 실제 LLM 결과가, 빼면 기존 규칙 기반 결과가 정상적으로 나옴

---

## Day 17 — 2026-07-28 (화)

**목표:** LLM 연동 (2) — 브리핑/추천 이유, 프롬프트 다듬기

- [ ] 브리핑 추천 문구, 발행 시간 추천 이유, 인사이트 추천 근거에도 LLM 연동 (동일 폴백 구조)
- [ ] 프롬프트 다듬기 — 결과물이 브랜드 프로필을 반영하는지 확인하며 조정
- [ ] 시간이 남으면 이미지 업로드 기본 구현 착수

**완료 기준:** 브리핑/추천 근거 문구가 실제 브랜드 정보를 반영해 달라지는 것을 확인

---

## Day 18 — 2026-07-29 (수)

**목표:** 통합 점검 및 마무리

- [ ] 전체 플로우(온보딩 → 브리핑 → 작성 → 결과 → 예약 발행) 처음부터 끝까지 실사용 테스트
- [ ] 로딩/에러 상태, 빈 데이터 케이스 등 UI 예외 처리 점검
- [ ] 워크플로우 문서 정리 — Plan mode로 계획을 세우고 Agent를 단계적으로 활용한 방식, 만든 Skill/Agent 사용법을 문서로 정리
- [ ] README 최종 업데이트 (실행 방법, 구현 범위, 남은 과제)

**완료 기준:** 처음 보는 사람이 README만 보고 로컬에서 전체 흐름을 실행해볼 수 있고, 워크플로우 문서로 개발 과정을 설명할 수 있는 상태

---

## 8. 이후 과제 (범위 밖, 다음 발전 방향)

- 네이버 블로그 실제 연동 (공식 API 권한 범위 vs 스크래핑 방식 결정 필요, api-spec.md 미결정 사항 참고)
- 사진 업로드 기반 AI 배치/썸네일 추천 고도화
- 실제 발행 연동 (서버 스케줄러가 `scheduledAt` 감시 → 네이버 블로그 API 발행)
- 인증/세션 도입 (다중 브랜드 지원 시 — Supabase Auth 활용 검토)
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
