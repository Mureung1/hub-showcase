# 개발 백로그

역기획소(respec)의 단일 백로그다. 4주 MVP 개발 Task를 여기서 관리한다.

**관리 규칙**: 항목을 지우지 않고 체크박스(`[ ]` → `[x]`)로 완료 표시한다. 매 PR마다 이 문서에서 해당 Task를 체크하고, 주 단위로 우선순위가 바뀌면 이 문서를 먼저 고친 뒤 작업한다. 진행 상태의 단일 출처(source of truth)는 이 문서이며, `CLAUDE.md`는 이 문서를 링크만 한다.

> **피벗 안내**: Core Loop Builder 시절의 백로그는 이 문서의 이전 버전(git 히스토리)에 있다. 피벗과 함께 Task 전체를 기획서 v0.1(`project-plan.md`) §7의 4주 일정 기준으로 재작성했다.

## 백로그란?

**정의**: 백로그는 "아직 하지 않았지만 해야 할 일들의 목록"이다. 스크럼/애자일에서 쓰는 개념이지만, 팀이 없는 1인 프로젝트에서도 똑같이 유용하다 — 여기서 "팀"은 며칠 뒤의 나 자신이라고 봐도 된다.

**왜 필요한가**: 기획서만 있으면 "무엇을 만들어야 하는가"는 알 수 있지만 "이번 주에 무엇부터 손대야 하는가"는 알 수 없다. 백로그가 없으면 개발 중에 떠오르는 아이디어를 그때그때 순서 없이 처리하게 되고, 그러다 보면 MVP에 필요 없는 기능에 시간을 쓰거나, 마감 직전에 핵심 기능이 안 끝나는 일이 생긴다. 백로그는 "지금 이 순간 무엇이 제일 중요한가"를 미리 정해둬서, 개발 중 판단을 매번 새로 하지 않게 해주는 장치다.

**어떻게 생겼는가**: 보통 아래 요소를 가진 Task의 목록이다.
- **제목** — 한 줄로 무엇을 할지
- **우선순위** — 지금 꼭 해야 하는지, 나중에 해도 되는지
- **상태** — 할 일 / 진행 중 / 완료
- **연관 문서** — 이 Task를 하려면 참고해야 할 설계 문서나 기획서 섹션

Task는 보통 "함수 하나 짜기"처럼 잘게 쪼개지 않고, "화면 하나 완성" "엔드포인트 하나 구현"처럼 눈에 보이는 산출물 단위로 큼직하게 나눈다. 너무 잘게 쪼개면 백로그 자체를 유지보수하는 데 시간이 더 들고, 너무 크게 뭉치면 진행 상황을 가늠할 수 없다.

**어떻게 관리하는가**: 매주 시작할 때 이번 주 목표를 다시 확인하고, 우선순위가 바뀌었으면(예: 사용자 테스트에서 예상 못 한 문제가 나오면) 백로그를 먼저 갱신한 뒤 개발한다. 완료된 항목은 지우는 게 아니라 체크만 하고 남겨둬서, 나중에 "언제 뭘 했는지"를 되짚어볼 수 있게 한다. 이런 흐름을 보통 "백로그 정리(grooming/refinement)"라고 부른다.

## 우선순위 기준

기획서(`project-plan.md`) §7~§8의 MVP 포함/제외 구분을 그대로 우선순위로 옮겼다.

- **P0** — MVP 필수. 4주 안에 반드시 끝나야 하고, 이게 없으면 "역기획서를 쓰고 피드백 받는 서비스"라고 부를 수 없다.
- **P1** — 있으면 좋은 것. P0가 다 끝나고 여유가 있을 때 한다.
- **P2** — 이번 4주 프로젝트 범위 밖. 기획서 §8(MVP 제외)에 해당하며, 지금은 손대지 않는다.

**일정이 밀리면 잘라내는 순서** (기획서 §7): 데이터테이블 블록 타입 검증 → 비교 뷰 → 알림 → 챌린지 자동화.

## 프로토타입 선반영 (피벗 PR에서 완료)

피벗 PR의 클릭 프로토타입이 1주차 "기본 레이아웃·라우팅"과 2~3주차 화면 UI 골격을 목데이터 기반으로 선반영했다. 아래 항목은 **UI 골격 기준으로** 완료이며, 데이터 연동(Supabase)·실제 LLM 호출은 각 주차 Task로 남아 있다.

- [x] 기본 레이아웃(글래스 내비 + 배경) 및 전 화면 라우팅 (react-router)
- [x] 템플릿 선택 → 가이드형 에디터 화면 (섹션 프리셋, 섹션별 가이드, 섹션 추가/삭제)
- [x] 아카이브 목록(태그 필터·정렬·피드백 요청 배지) / 문서 상세(섹션별 코멘트, AI 라벨) UI
- [x] 챌린지 / 가이드 / 마이페이지 화면 골격
- [x] 모의 AI 피드백 플로우 (canned 응답 — 실제 API 연동은 4주차)
- [x] 초안 임시저장/발행 (localStorage — Supabase 전환은 1~2주차)

## 1주차 마무리 요약 (2026-07-16 갱신)

이번 주 목표였던 **작성 수직슬라이스(화면 → Express → Supabase 한 바퀴)**를 완성했다. fork 이슈 #3~#12(2주차 마일스톤 P0) 전부 닫음, 마일스톤 종료. `feature-verify` 에이전트로 7/7 PASS 검증. 발표 자료: `docs/PRESENTATION-week2.md`·`.html`.

- **완료**: DB 스키마·Supabase(PostgreSQL) 연결, 문서 CRUD API, storage.js→API 교체, 초안 저장·발행(태그 필수 DB 제약), 상세·아카이브·코멘트 DB 연동, 기능 검증 에이전트.
- **다음 주 이월**: 로그인/회원가입(1주차 P0), 마크다운 에디터 라이브러리(#13, P1), 템플릿 프리셋 DB화, 좋아요/북마크 영속화.

## 2주차 실행 (2026-07-20 시작) — 로그인 + 자동저장 + 테스트/TDD + Agent 산출물

이번 주 목표는 **기능 강화 + 테스트로 검증 + Agent 산출물**이다. 수직슬라이스는 지난주에 끝났으므로 슬라이스 완성이 아니라 그 위에 쌓는다. 아래는 이번 주 신규 Task(기존 4주 계획에 없던 항목 포함).

- [x] **P0** backend 테스트 인프라 — `index.js`를 `app.js`(export)/`index.js`(listen)로 분리, vitest + supertest, **supabase 클라이언트 mock**(실 DB 오염 방지) *(신규 — `app.test.js`·`documents.auth.test.js`에서 `vi.mock('./lib/supabase.js')`. 현재 28 테스트 통과)*
- [x] **P0** frontend 테스트 인프라 — vitest + jsdom + @testing-library/react *(신규 — `vite.config.js`의 `test` 블록 + `src/test/setup.js`. 현재 36 테스트 통과)*
- [x] **P0** **초안 자동저장 (TDD 대상)** — 순수 함수(`makeSnapshot`/`hasUnsavedChanges`/`shouldAutosave`)를 테스트 먼저 작성 → 구현 → EditorPage debounce 연결 *(신규 — `frontend/src/lib/autosave.js` + `autosave.test.js`)*
- [x] **P0** **로그인/로그아웃** — 프론트가 Supabase Auth 직접 사용(이메일+구글), 백엔드는 JWT 검증해 `author_id` 기록·소유권 확인, 내 초안만 조회 *(1주차 P0 이월분 실행 — `AuthContext.jsx` + `requireAuth.js`. 4주차에 비밀번호 재설정·이메일 변경·프로필까지 추가)*
- [ ] **P0** Agent 산출물 ① `.claude/skills/test-writer/` 테스트코드 생성 Skill *(신규 — **미실행.** TDD 단계가 매번 같은 절차(순수 함수는 vitest, 라우트는 supertest 회귀)로 수렴해 Skill로 뽑을 변주가 없었다. 절차는 `docs/WORKFLOW.md` §2의 4단계에 문장으로 고정)*
- [ ] **P0** Agent 산출물 ② `.claude/agents/code-review.md` 코드 검증 Agent + 로그인 diff에 실제 적용 *(신규 — **미실행.** 검증을 셋으로 나눠 대체: 동작은 `feature-verify` Agent, 설계는 아키텍처 다이어그램 리뷰(→ 신뢰경계 7건 발견), 회귀는 `.github/workflows/ci.yml`)*
- [x] **P0** Agent 산출물 ③ `docs/WORKFLOW.md` 나만의 워크플로우 문서 *(신규 — 4주차에 작성. 단계별 입력·확인 기준·결과물·복구 지점 표 + 개발 루프/Agent 배치 mermaid 2종 + 사람 결정 vs AI 수행 표)*
- [x] **P0** 아키텍처 시각화 — README에 mermaid(구조 + 데이터 흐름 시퀀스), 낡은 서술 교정 *(신규 — `docs/ARCHITECTURE.md`에 전체 구조 1장 + 발행→AI 시퀀스 + 인증/권한 시퀀스, README에 전체 구조 게재. 그리며 발견한 5건은 아래 "아키텍처 다이어그램에서 발견한 개선점" 참조)*

**이번 주 기준선**: 계정별로 로그인해 자기 문서를 쓰고, 타이핑만 해도 자동 저장되며, 그 동작이 테스트로 검증된다.
**뒤처질 때 컷 순서**: 구글 소셜(이메일 로그인만 유지) → README 시퀀스 다이어그램 1개로 축소 → frontend 테스트 인프라. **테스트·TDD·Agent 산출물 3종은 자르지 않는다**(요구사항 채점 항목).

## 아키텍처 다이어그램에서 발견한 개선점 (2026-07-22 추가)

[`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) §4에서 나온 항목이다. 그림으로 옮겨 각 화살표를 설명해보니 드러난 것들이라, 기능 Task와 별도로 여기 모아둔다. 상세 근거와 파일 위치는 ARCHITECTURE.md에 있다.

- [x] **P0** 코멘트 작성 라우트 보안 — `optionalAuth` 추가, `author`는 서버가 `resolveAuthorName()`으로 결정, `is_ai`는 클라이언트 입력을 무시하고 항상 `false` 강제 *(사람 코멘트의 AI 위장 차단. 회귀 테스트 1건)*
- [x] **P0** AI 피드백 실패를 사용자에게 알리기 — 에디터가 실패 사유를 `navigate` state로 넘기고, 상세 페이지가 `aiError` 배너 + 재시도 버튼(`retryAiFeedback`) 노출
- [x] **P1** `/ai-feedback/preview`도 일일 제한에 반영 — `isAiLimitExceeded()` 헬퍼로 발행 피드백과 한도 공유·기록. 한도는 5 → 10으로 상향(정상 사용 방해 방지)
- [ ] **P1** `comments` JSONB → 별도 테이블 분리 — read-modify-write라 동시 코멘트 시 유실 가능. [`data-model.md`](./data-model.md)가 걸어둔 분리 조건("다른 사람이 코멘트를 쓸 때")이 3주차에 충족됐다. 알림·"내가 쓴 코멘트"도 이게 선행되어야 한다 *(스키마 변경이 필요해 유일하게 미해결)*

위 항목을 고치는 과정에서 **같은 패턴("클라이언트가 보낸 값을 서버가 그대로 믿는다")의 문제 3건**을 추가로 발견해 함께 처리했다.

- [x] **P0** 남의 초안 유출 차단 — 목록은 초안이면 `mine` 여부와 무관하게 항상 소유자 스코프(`status` 생략 시 발행분만), 단건은 남의 회원 초안을 **404로 숨기고**(403은 존재를 알려준다) 비회원 초안은 `x-edit-password` 헤더 필요 *(회귀 테스트 5건)*
- [x] **P0** 재발행 시 코멘트·좋아요 삭제 차단 — `toDbRow()`가 클라이언트의 `comments`/`likes`/`bookmarks`를 받지 않도록. 에디터가 보내는 `comments: []`가 기존 피드백을 덮어쓰던 데이터 손실 버그 *(회귀 테스트 2건)*
- [x] **P0** RLS 활성화 — `documents`/`profiles`/`ai_feedback_logs`/`reactions` 전부 RLS on, 정책은 두지 않음. 번들에 공개되는 anon 키로 PostgREST에서 테이블을 직접 읽고 쓸 수 있던 옆문 차단(백엔드는 `service_role`로 우회)
- [x] **P1** 남의 문서에 AI 코멘트 붙이기 차단 — `POST /:id/ai-feedback`에 소유자 검사 403 *(회귀 테스트 1건)*
- (참고) 이미지 업로드(Supabase Storage) 도입 시 **프론트에서 Supabase를 직접 부르지 않는다** — 백엔드가 서명 URL을 발급하는 방식으로 간다. 프론트의 Supabase 직접 호출은 인증 하나로 유지

## showcase 대시보드 등록 (2026-07-23 추가)

챌린지 공개 대시보드(`connect-AIAgentChallenge-26-1/hub`)가 **참가자 브랜치 루트의 `showcase/showcase.json`** 을 매일 23시(KST)에 수집한다. 규격은 공용 저장소 `dashboard-page` 브랜치의 `dashboard/schemas/showcase.schema.json`(Ajv, `additionalProperties: false`)과 `dashboard/scripts/collect-local-showcases.mjs`가 정한다. **`thumbnail`은 필수이고 파일이 실제로 없으면 수집기가 예외를 던져 브랜치 전체가 대시보드에서 빠지므로**, 항목을 비울 때도 이미지는 반드시 넣어둔다. 남은 항목은 다음 주까지 하나씩 채워 PR에 같이 올린다.

- [x] **P0** `showcase/showcase.json` + `thumbnail.webp` + `screenshots/home.webp` 추가 *(2026-07-23. Ajv 검증 통과. 카드가 16:9 `object-fit:cover`로 잘라내므로 썸네일은 홈 화면 상단 크롭본)*
- [x] **P0** `demoUrl` 채우기 — `https://respec-gamma.vercel.app` *(2026-07-30 반영. 데모 영상 링크 `demoVideoUrl`도 함께)*
- [ ] **P1** `screenshots` 2장 추가(최대 3장) — 가이드형 에디터, AI 섹션별 피드백 화면
- [x] **P1** 기능이 늘면 `features`·`featureTags`·`techHighlights` 갱신 *(2026-07-30. 순기획 템플릿·RAWG 연동·AI 자동 채점·라이브 배포 반영)*
- [x] **P1** Agent/Skill을 새로 만들면 `agent.agentTools`·`agent.workflows`에 반영 — 실제 산출물은 Agent 2개(plan-breakdown·feature-verify) + Skill 1개(design-guide)로 확정. test-writer·code-review는 미실행이라 넣지 않고, `workflows`에 CI 검사 단계를 추가했다

## 1주차 Task — 기반 구축

기준 문서: `project-plan.md` §5(데이터 구조), §6(기술 스택)

- [x] **P0** DB 스키마 확정 — `documents` 단일 테이블로 시작(`sections`/`comments`는 JSONB). 나머지 테이블은 해당 주차에. 설계: `docs/data-model.md`
- [x] **P0** Supabase 프로젝트 세팅 — PostgreSQL + `documents` 테이블 생성 완료. (Auth·Storage는 로그인 도입 시)
- [ ] **P0** 로그인/회원가입 — 이메일 + 구글 소셜 *(→ 2주차(이번 주)에 착수. 아래 "2주차 실행" 섹션 참조)*
- [x] **P0** 프로토타입의 목데이터 모듈을 Supabase 조회로 교체하는 데이터 레이어 설계 — 교체 지점 `frontend/src/lib/storage.js` 하나로 확정, backend API로 전환 완료

## 2주차 Task — 작성 경험

기준 문서: `project-plan.md` §3.1(가이드형 에디터)

- [ ] **P0** 마크다운 에디터 라이브러리 통합 (Toast UI Editor 또는 Milkdown) *(다음 주 이월 — 이슈 #13. 수직슬라이스 우선, textarea 유지)*
- [ ] **P0** 템플릿·섹션 프리셋을 DB 기반으로 전환, 섹션 가이드 노출 유지 *(문서의 sections는 DB(JSONB)에 저장·조회 완료. 템플릿 프리셋 자체의 DB화는 이월 — 현재 `frontend/src/data/templates.js`)*
- [x] **P0** 임시저장(초안)/발행 — localStorage → Supabase 전환, 발행 시 게임·직군 태그 필수(`publish_requires_tags` DB 제약)
- [ ] **P1** 데이터테이블 블록 — 컬럼별 타입(int/float/string/enum) 지정, ID 중복 검사 (여유 시)

**2주차 기준선**: "혼자 쓰고 저장하는 것"이 실제 계정·실제 DB로 완성되어야 한다.

## 3주차 Task — 커뮤니티

기준 문서: `project-plan.md` §3.2(아카이브 & 커뮤니티 피드백)

- [x] **P0** 아카이브 목록·태그 필터·정렬을 실제 데이터로 *(1주차 선반영 — 발행 문서는 DB에서 로드, 시드와 병합. 필터·정렬 동작)*
- [x] **P0** 문서 상세 열람 + 섹션별 코멘트 작성/저장 *(1주차 선반영 — 상세는 DB 조회, 코멘트는 DB 영속)*
- [x] **P0** 좋아요/북마크 영속화 *(`reactions` 테이블(유저·문서·타입 unique)로 per-user 구현. `GET`/`POST /:id/reactions` 토글, `documents.likes/bookmarks`는 `syncReactionCounts()`가 갱신하는 표시용 캐시)*
- [ ] **P1** 키워드 검색
- [ ] **P1** 비교 뷰 — 같은 태그 문서 묶어 보기
- [ ] **P1** 받은 코멘트 알림 목록 (사이트 내)

**3주차 기준선**: "남의 글에 코멘트"가 가능해야 한다.

## 4주차 Task — 차별화 + 마감

기준 문서: `project-plan.md` §3.3(챌린지), §3.4(LLM 자동 피드백), §10(성공 지표)

- [x] **P0** LLM 피드백 실 구현 — backend 엔드포인트, 프롬프트 4관점(구조 완결성/구체성/예외 질문/역기획 관점), 일일 호출 제한(ai_feedback_logs) *(Claude API 대신 **Google Gemini**(`gemini-2.5-flash`, 무료 티어)로 구현 — `backend/src/lib/aiFeedback.js`. `responseSchema`로 섹션별 코멘트 + 총평 구조 강제. 회원 전용·일일 5회)*
- [x] **P0** 챌린지 페이지 실 데이터 연동 *(제출·AI 자동 채점·점수순 리더보드는 실제 DB(`documents.ai_score`)로 동작. **챌린지 정의 자체는 의도적으로 프론트 시드**(`frontend/src/data/challenges.js`) — 운영자가 큐레이션하는 소수 항목이라 테이블·어드민을 두지 않았다. 어드민 화면은 미도입으로 확정)*
- [x] **P0** 가이드 정적 페이지 내용 완성 *(역기획서란?/좋은 역기획서의 조건/흔한 실수/참고 자료/바로 시작하기 5개 패널. 현직자 글 큐레이션 한 줄만 "준비 중"으로 남음)*
- [ ] **P0** QA — 기획서 §4 유저 플로우 A/B/C 전체 동작 확인, 지인 사용성 테스트 3인 *(핵심 흐름(플로우 A+AI 채점)은 라이브 검증 완료. 지인 3인 테스트는 미실시)*
- [x] **P0** Vercel 배포 *(프론트 https://respec-gamma.vercel.app · 백엔드(Render) https://respec.onrender.com. 설정·검증 기록은 `docs/DEPLOY.md`)*
- [ ] **P0** README/Wiki 문서 정리, PR 최종 제출 *(4주차 진행 중 — README에 WORKFLOW.md 링크 추가 완료, 최종 PR 제출 남음)*

## 4주차 마무리 (2026-07-30) — 워크플로우 문서 · CI · 데모 준비

새 기능을 넣지 않는 주다. 손댄 것은 **문서 + `showcase/showcase.json` + `.github/workflows/ci.yml`**뿐이고 `frontend/src`·`backend/src`는 건드리지 않았다.

- [x] **P0** `docs/WORKFLOW.md` — 나만의 워크플로우(과제 ①) + Agent 협업 시각화(과제 ②)를 한 문서로
- [x] **P0** CI 도입 — `.github/workflows/ci.yml`(PR·feature push에서 backend test / frontend lint·test·build). 비밀값 없이 도는 것을 확인하고 넣었다
- [x] **P0** 문서를 실제 상태와 일치시키기 — 이 백로그의 2주차·4주차 항목, showcase.json, DEPLOY.md 검증 기록
- [x] **P0** 데모 자료 — `docs/PRESENTATION-week4.md`(대본·시연 순서·예상 질문) + `docs/PRESENTATION-week4.html`(슬라이드)
- [x] **P0** 라이브 재검증 — `/api/health` `db:ok`, 발행 66편, RAWG 8건, 프론트 200, 번들이 Render 주소 호출
- [ ] **P1** CORS를 Vercel 도메인으로 제한 — 데모 이후로 미룸(데모 주간에 배포 리스크를 만들지 않는다)
- [ ] **P1** AI 예시 96편 남은 생성 — Gemini 무료 하루 20건. 발표용 한도 보존이 우선

## P2 — 이번 프로젝트 범위 밖 (기획서 §8)

- 실시간 협업 편집, 문서 버전 관리(변경 이력)
- 현직자 인증 배지 / 멘토 매칭
- PDF 내보내기 (포트폴리오 출력)
- 퀘스트/스킬 플로우차트 에디터 블록
- 알림 푸시(이메일) — MVP는 사이트 내 알림 목록만
- 신고 기능 (저작권 대응은 MVP에선 업로드 가이드라인 명시로 갈음)
