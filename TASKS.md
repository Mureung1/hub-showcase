# 개발 Task — 리뷰 매니저 AI (4주 프로젝트)

4주 커리큘럼(기획 → 개발 → 고급 활용 → 완성)에 맞춰 주차별 테마와 실제 개발 Task를 함께 관리한다. 2주차부터 본격적으로 개발에 들어가며, 이 문서는 진행 상황에 맞춰 계속 갱신한다.

## 우선순위 기준

| 우선순위 | 의미 |
| --- | --- |
| P0 | 핵심 기능. 이게 안 되면 서비스가 성립하지 않음 |
| P1 | 있으면 확실히 좋아지는 것. 시간 되면 이번 주 안에 |
| P2 | 여유 있을 때. 다음 주로 밀려도 괜찮음 |

## 전체 로드맵 (한눈에)

| 주차 | 커리큘럼 테마 | 이번 프로젝트에서 할 일 | 상태 |
| --- | --- | --- | --- |
| 1주차 | 기획, 프로토타입, Agent 기능이해 | 기획서·프로토타입·디자인 시스템·개발 환경 구성 | ✅ 완료 |
| 2주차 | 개발계획, Agent 활용, 주요 기능 개발 | 백엔드 실제 로직 구현 + 프론트-백엔드 연동 | 🔜 다음 주 |
| 3주차 | Agent 고급 활용, 지속가능한 코드 | Claude API 연동 + 테스트·리팩토링 | ✅ 완료 |
| 4주차 | 서비스 완성, Agent 개발 흐름 완성 | 통합 테스트·배포, Agent 활용 흐름 정리 | ⬜ 예정 |

---

## 1주차 — 기획, 프로토타입, Agent 기능이해 (완료)

- [x] 기획서 작성 (문제 정의, 핵심 가치, 사용자 시나리오, 화면 흐름, API 설계)
- [x] HTML/CSS/JS 프로토타입 개발 (와이어프레임 → 목업 → 프로토타입)
- [x] claude.ai/design 핸드오프 기반 디자인 시스템 적용 (디자인 토큰화, 재사용 가능한 `design-build` 스킬 정리)
- [x] 개발 환경 구성 — 디렉토리 구조, 라이브러리, 커밋/코드 컨벤션, 백엔드(Express) 스캐폴딩
- [x] Agent(Claude Code) 기능이해 — 스킬 생성/재사용, PR 생성·라벨링 워크플로우 등 실제 사용해보며 익힘

## 2주차 — 개발계획, Agent 활용, 주요 기능 개발 (다음 주까지 끝낼 것)

- [x] **P0** — 이 Task 문서(개발 Task) 작성 및 README 링크
- [x] **P0** — 감정 분석·키워드 추출·답변 초안 3종 생성 로직을 프론트엔드(`review-assistant-react`)에서 백엔드(`review-assistant-server`)로 이식. 지금은 규칙 기반 그대로 옮기고, Claude API 교체는 3주차로 미룬다.
- [x] **P0** — 세션별 반복 문제 감지 히스토리를 백엔드 저장소로 구현 (`POST /api/v1/reviews/analyze` 응답에 `recurringIssues` 포함, `DELETE /api/v1/reviews/history`로 초기화). 애초 인메모리로 계획했으나, "리뷰 매니저 AI" 컨셉 확장으로 `node:sqlite` 영속 저장소로 변경(아래 컨셉 확장 항목 참고).
- [x] **P0** — 프론트엔드가 브라우저 내 로직 대신 백엔드 API를 실제로 호출하도록 전환 (`fetch`, 로딩/에러 상태를 API 응답 기준으로 재배선)
- [x] **P0** — `X-Session-Id`를 프론트엔드가 생성/저장(localStorage)하고 매 요청에 실어 보내도록 연결
- [x] **P1** — 백엔드 요청/에러 케이스(빈 입력, 15개 초과, 서버 오류) curl 또는 Postman으로 수동 검증 (7/14 완료. EMPTY_INPUT/NO_VALID_REVIEW/TOO_MANY_REVIEWS/경계값(15개) 전부 확인 + 프론트 "누적 기록 초기화" 버튼 실제 클릭 검증. 검증 중 malformed JSON 요청이 `ANALYSIS_FAILED`로 잘못 분류되던 버그 발견, `INVALID_JSON`(400) 코드 신설해 수정)
- [x] **P1** — 백엔드 핵심 로직에 기본 단위 테스트 작성 시작 (7/15 완료. Node 내장 `node:test` 채택, `npm test`로 실행. 감정 분류/키워드 추출/AI 관심도 점수 계산 로직에 10개 테스트 작성, 전부 통과)
- [x] **P2** — 백엔드 로깅(요청/에러) 최소한으로 추가 (7/16 완료. `requestLogger` 미들웨어 신설 — 모든 요청을 `METHOD URL STATUS 소요시간ms`로 콘솔에 기록, 5xx는 `console.error`로 구분. `errorHandler`에도 에러 발생 시 코드/메시지(+500이면 스택)를 로그로 남기도록 추가. 외부 로깅 서비스 없이 `console.*`만 사용 — 기존 "내장 기능으로 되면 새 의존성 안 만든다" 원칙 유지)
- [x] **P1** — 전체 기능 수동 QA (7/16 완료. 백엔드는 검증 에이전트로, 프론트엔드는 Playwright로 직접 이번 주 만든 기능 전체를 한 번에 재점검 — 정상/에러 케이스, 반복 문제 감지, 답변 복사, 누적 기록 초기화, 회원가입→로그인→로그아웃→헤더 상태 유지까지 전부 PASS. 그 과정에서 실제 버그 1건 발견·수정: `기획서.md`의 API 예시와 `/guide` 화면 고정 예시 카드가 쓰던 문구("음식은 맛있었는데 너무 오래 기다렸어요.")가 실제 감정 분류 로직으로는 긍정/부정 동점이라 `neutral`로 판정돼, 문서·화면에 적힌 "부정" 결과와 실제 동작이 어긋나 있었음 → 예시 문구를 실제로 `negative`가 나오는 문장으로 교체하고, `기획서.md`·`exampleReview.js`를 실제 응답값 그대로 갱신)
- [x] **P1** — Agent 활용 — 이번 주 기능 개발 전체를 Claude Code로 진행하면서, 어떤 작업을 에이전트에게 맡기고 어떤 판단을 직접 했는지 기록해두기 (4주차 회고 재료) — 아래 "2주차 마무리" 항목에 정리

### 컨셉 확장 — "리뷰 매니저 AI" (2026-07-13, 계획 외 추가)

경쟁 서비스 대비 차별점을 고민하다, "리뷰 답변 도우미"에서 "리뷰 매니저 AI"로 컨셉을 확장하기로 결정. 아래 항목을 2주차 중 예정에 없이 앞당겨 구현함.

- [x] DB 도입: `node:sqlite`(Node 22+ 내장, 별도 패키지 불필요)로 전환 — `review-assistant-server/data/reviews.db`
- [x] 리뷰마다 AI 점수(`score`, 0~100 "관심 필요도") 계산 및 응답에 포함
- [x] 리뷰 총 분석 API (`GET /api/v1/stats/summary`) — 총 리뷰 수, 감정 분포, 평균 점수, 자주 언급된 키워드
- [x] 월별 통계 API (`GET /api/v1/stats/monthly`)
- [x] 프론트 대시보드 페이지(`/dashboard`) 신규 추가 — 총 분석·월별 통계 시각화
- [x] 랜딩페이지 리브랜딩("리뷰 매니저 AI") + 차별점(반복 문제 감지) 중심으로 카피/구조 개편
- [x] 기획서.md에 컨셉 확장 반영 (서비스명/시나리오/화면구조/API 스펙 전체 갱신)
- [x] `design/handoff.md`를 4개 라우트 기준으로 갱신 (원본은 Tool 화면 1개만 다루던 상태)

### 회원 인증 추가 (2026-07-15, 계획 외 추가)

CLAUDE.md의 "로그인 없는 익명 세션" 결정을 뒤집고, 실제 회원가입/로그인 기능을 구현하기로 결정. 도구 자체(분석/반복문제감지/통계)는 여전히 로그인 없이 익명 세션으로 동작하고, 인증은 별도 "신원 확인" 기능으로 추가됨 — 아직 `users`와 `reviews`는 연결 안 됨.

- [x] DB: `users`/`auth_tokens` 테이블 추가
- [x] 비밀번호 해싱: `node:crypto`의 `scryptSync` 사용(bcrypt 등 별도 패키지 미도입)
- [x] 백엔드 API: `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- [x] 프론트: `/signup`, `/login` 페이지 신규
- [x] 프론트: 모든 화면이 공유하는 `Header` 컴포넌트 신규 — 로고, 진행 단계(홈/도구/사용법/총분석 중 현재 위치), 로그인 상태(이메일/로그아웃 버튼) 표시. 기존 페이지별 개별 navbar를 전부 교체
- [x] 기존 랜딩페이지의 "로그인/회원가입" 데코레이션 버튼(실제 기능 없음)을 진짜 인증 플로우로 교체
- [x] curl + Playwright로 회원가입→로그인→헤더 표시→페이지 이동 후 유지→로그아웃→재로그인→잘못된 비밀번호 에러까지 전체 플로우 검증
- [x] 기획서.md(7번 섹션 신규, 데이터 모델 갱신), CLAUDE.md(아키텍처 결정 변경 기록) 갱신

### 랜딩페이지 리디자인 + DB 기술 확인 (2026-07-16, 계획 외 추가)

- [x] claude.ai/design 번들(신규 랜딩 시안)을 받아 `/` 랜딩 페이지를 재구성 — 리뷰 티커, 3단계 프로세스(점선+이동 점), 총 분석 리포트(도넛차트+막대그래프), 타겟 업종, 어두운 footer 신규 추가. 기존 "핵심 기능"·"이런 반응을 목표로 해요" 섹션은 유지(사용자 요청으로 복구).
- [x] 디자인 번들의 로고 마크(점 3개)를 `BrandMark` 컴포넌트로 만들어 기존 🍊 이모지 자리(Header, 각 페이지 footer)를 전부 교체
- [x] `design/handoff.md` §2, `design/reference_landing-2026-07-16.html` 갱신
- [x] **체크리스트 확인**: "Express API 라우트 / DB 저장·조회 / 프론트-백엔드 연결" 항목은 2주차에 이미 구현 완료 상태. 단, 체크리스트가 지정한 "Supabase" 대신 1주차부터 결정된 `node:sqlite`를 계속 사용하기로 재확인(CLAUDE.md 결정 유지) — 별도 클라우드 DB 의존성을 추가하지 않는 게 이 프로젝트 규모에 맞다고 판단.
- [x] **체크리스트 확인 — 첫 수직슬라이스**:
  > **핵심 기능(수직슬라이스) 정의: 리뷰 분석 및 저장**
  > - 입력: `/app`에서 리뷰 텍스트 1개 이상 제출
  > - 처리: 감정·키워드·AI 관심도 점수 계산 후 `reviews` 테이블(`node:sqlite`)에 저장
  > - 출력: 결과 카드 렌더링 + `/dashboard`에서 누적 집계로 조회 가능
  > - 완료 기준: 화면에서 제출한 값이 DB에 그대로 저장되고, 조회 화면에 그대로 반영된다

  "화면 요청 → 서버 처리 → DB 저장 → 응답 → 화면 갱신"의 한 바퀴는 `/app`(리뷰 분석 제출, 쓰기 경로)과 `/dashboard`(총 분석 조회, 읽기 경로)로 2주차에 이미 완성돼 있었음. 오늘 Playwright로 실제 브라우저에서 구분 가능한 텍스트("[수직슬라이스검증-...]")를 담은 리뷰를 `/app`에 제출 → `POST /api/v1/reviews/analyze` 200 응답 → 결과 카드 렌더링까지 확인하고, `data/reviews.db` 파일을 직접 쿼리해 해당 리뷰가 실제로 디스크에 저장된 것을 확인했으며, `/dashboard`로 이동해 `GET /api/v1/stats/summary`가 그 저장된 행을 그대로 집계해 "분석한 리뷰 1개·긍정 1·#친절도 1·#대기시간 1"로 렌더링하는 것까지 화면으로 검증함. 새 코드 작성 없음(기존 구현 검증). (위 정의는 검증 당시엔 문서화하지 않았다가, 2주차 마무리 회고 중 "정의를 먼저 했는지" 질문을 받고 뒤늦게 명문화함.)
- [x] **기능 검증 Agent 신설**: `.claude/agents/feature-verifier.md` 추가 — 요구사항을 관찰 가능한 체크 항목으로 쪼개 curl/DB 직접 쿼리/Playwright로 "직접 실행해서" PASS/FAIL 근거를 남기고, 코드는 고치지 않는 검증 전용 에이전트. 위 수직슬라이스 기능(쓰기 경로 → DB 저장 → 읽기 경로 집계 + `EMPTY_INPUT` 에러 케이스)을 이 에이전트로 재검증해 전 항목 PASS 확인.
- [x] **발표·데모 자료 제작**: 문제 정의 → 대상 사용자 → 핵심 기능 A/B → 차별점 → 사용자 흐름 → 데모(화면·서버·DB 한 바퀴, 실제 스크린샷 + 실제 DB 행 + API 응답) → 기술 아키텍처 → 로드맵, 11장짜리 발표 자료를 Artifact로 제작. "데모" 슬라이드는 오늘 검증한 수직슬라이스의 실제 데이터(리뷰 3건 제출 → DB 저장 → 총 분석 집계 일치)를 그대로 사용.

### 2주차 마무리 — Agent 활용 기록 및 3주차 준비 (2026-07-17)

#### 요일별 — 에이전트에게 맡긴 것 / 직접 판단한 것

| 요일 | 직접 판단한 것 | 에이전트에게 맡긴 것 |
| --- | --- | --- |
| 월(7/13) | "리뷰 답변 도우미" → "리뷰 매니저 AI" 컨셉 확장 결정(차별점 고민), DB를 `node:sqlite`로 전환하기로 한 아키텍처 결정 | 백엔드 로직 이식, 반복 문제 감지 히스토리 구현, 라우팅 분리, AI 점수·총 분석·월별 통계 API 설계·구현, 프론트-백엔드 연동, 랜딩 리브랜딩, 문서 전체 갱신 |
| 화(7/14) | 에러 케이스를 수동으로 전수 검증해보자는 방향 설정 | curl 회귀 테스트 설계·실행 — 그 과정에서 `INVALID_JSON` 오분류 버그를 스스로 발견하고 수정까지 완료 |
| 수(7/15) | "로그인 없는 익명 세션" 아키텍처 결정을 뒤집고 실제 회원가입/로그인을 만들기로 한 결정 | 단위 테스트 작성, 인증 백엔드/프론트 구현, 공통 `Header` 컴포넌트 설계, props/state 리팩터링 실습, curl+Playwright 풀 플로우 검증, 데이터 모델 문서화 |
| 목(7/16) | Supabase 대신 sqlite 유지 결정, 디자인 반영 시 네비게이션 순서 유지 지침, 랜딩 시안에 대한 반복 피드백(로고·여백·글씨 크기·컴포넌트별 색상) | 디자인 번들 인코딩 복구·파싱, 랜딩 구현·반복 수정, 브랜드 로고 컴포넌트화, 수직슬라이스 기능 실제 검증, 검증 전용 `feature-verifier` Agent 설계·구현, 발표자료 아티팩트 제작, 백엔드 로깅 추가, 전체 기능 QA(예시 문구 불일치 버그 발견·수정 포함), 커밋 분리·PR·이슈 정리 |
| 금(7/17) | 2주차를 이 형태로 마무리하기로 결정 | Agent 활용 기록 정리, 2주차 완료 항목 점검, 3주차 준비 스케치 |

#### 2주차 전체 완료 항목 점검

- 위 "2주차" 섹션의 P0/P1/P2 항목 전부 `[x]` 완료 확인. 계획에 없었지만 이번 주 중 추가로 처리한 것: "리뷰 매니저 AI" 컨셉 확장, 회원 인증, 랜딩 리디자인, 검증 Agent 신설, 발표자료 제작 — 전부 각 하위 섹션에 기록됨.
- 남은 항목 없음. 3주차로 이월되는 작업 없음(향후 확장 후보는 4번 섹션 "향후 확장"에 별도 백로그로 유지).

#### 3주차 준비 스케치 (Claude API 연동)

- **모델 선택**: `claude-haiku-4-5`를 기본으로 — 감정 분류·키워드 추출·짧은 답변 초안 생성 수준의 경량 작업에 맞는 비용/속도. 답변 품질을 더 올리고 싶으면 `claude-sonnet-5`로 부분 상향 검토(가격은 실제 연동 시점에 재확인 — CLAUDE.md에 이미 메모해둠).
- **프롬프트 설계 방향(초안, 확정 아님)**:
  - 기존 `analyzeReviews` 함수의 인터페이스(입력: 리뷰 배열 / 출력: sentiment·keywords·score)는 그대로 유지하고, 내부 구현만 규칙 기반 → API 호출로 교체 — 라우트·에러 코드 체계를 건드리지 않기 위함.
  - 감정+키워드+점수는 한 번의 호출로 구조화된 JSON을 받는 방향, 답변 초안 3종(정중함/친근함/간결함)은 톤별 지침을 프롬프트에 고정해두고 리뷰 원문+감정/키워드 결과를 함께 넣어 한 번에 생성.
  - API 응답 파싱 실패·타임아웃은 기존 `ANALYSIS_FAILED`(500) 에러 코드로 매핑.
  - 반복 문제 감지 로직(세션 히스토리 집계)은 API 연동과 무관하게 그대로 재사용.

## 3주차 — Agent 고급 활용, 지속가능한 코드

### 진도 점검 (착수 전, 2026-07-19/20)

2주차 마지막 날 정의·검증한 수직슬라이스(핵심 기능: 리뷰 분석 및 저장, "화면 요청 → 서버 처리 → DB 저장 → 응답 → 화면 갱신")가 `feature-verifier` Agent 검증에서 전 항목 PASS로 이미 완료됨을 재확인. 따라서 이번 주는 수직슬라이스 완성이 아니라 **Claude API 실제 연동**을 1순위로 계획한다. `planning-agent`로 하루 단위 작업 분해 후 GitHub 이슈로 등록([rldbs5353/hub#38 대시보드](https://github.com/rldbs5353/hub/issues/38)).

- [x] **P0** — [#24](https://github.com/rldbs5353/hub/issues/24) Claude API 연동 준비 (SDK 결정, 환경변수 설정) (월 7/20 완료. 모델은 `claude-haiku-4-5-20251001`, 호출 방식은 공식 SDK 대신 Node 내장 `fetch` 직접 호출로 결정. `.env`에 실제 `ANTHROPIC_API_KEY` 설정 후 테스트 스크립트로 실제 호출 200 확인. `git grep`으로 프론트엔드에 키 노출 없음 확인)
- [x] **P0** — [#25](https://github.com/rldbs5353/hub/issues/25) 감정·키워드·점수·답변초안 응답 스키마 설계 (월 7/20 완료. `기획서.md` 8번 섹션에 tool-use 스키마 문서화. score·improvementSuggestion은 API로 요청하지 않고 기존 `computeScore`/`suggestionForKeyword`로 로컬 계산하기로 결정 — 실제 테스트 중 AI가 improvementSuggestion 필드를 응답에서 생략하는 경우를 발견해 최종적으로 스키마에서 제거. 테스트 스크립트로 sentiment/keywords/replyDrafts가 스키마대로 파싱되는 것 확인)

### 로그인 계정 ↔ 리뷰 데이터 연결 (2026-07-20, 계획 외 추가)

기존에 "아직 요구사항으로 확정되지 않아 미룸"으로 남겨뒀던 항목(`기획서.md` 6-3, 6-4)을 오늘 실제로 구현했다. `session_id` 기준 저장 방식은 그대로 두고(비로그인 사용자는 변화 없음), 로그인 상태일 때만 `user_id`를 병행 저장하는 방식으로 범위를 잡았다.

- [x] DB: `reviews.user_id`(nullable, `users(id)` 참조) 컬럼 추가 — 기존 DB 파일과 호환되도록 컬럼 없을 때만 `ALTER TABLE`로 마이그레이션, 인덱스 추가
- [x] 백엔드: `optionalAuth` 미들웨어 신설(로그인 여부와 무관하게 통과, `req.user` 채워줌) — `auth.controller.js`의 중복 토큰 파싱 로직도 이걸로 통합
- [x] 백엔드: 리뷰 분석 시 로그인 상태면 `user_id`도 함께 저장. `GET /api/v1/reviews/mine` 신규 — 로그인 계정에 연결된 리뷰를 세션/기기 상관없이 최신순으로 조회(비로그인 401)
- [x] 프론트: `/my-reviews` 페이지 신규, Header 로그인 사용자 영역에 "내 리뷰" 링크 추가(기존 네비 순서는 안 건드림)
- [x] curl로 로그인 리뷰(`user_id` 채워짐)·익명 리뷰(`user_id` null) DB 직접 확인, `GET /mine` 인증 유무별 확인 + Playwright로 로그인→분석→내 리뷰 조회→로그아웃 후 접근 제한→익명 분석 회귀 없음까지 확인
- [x] `기획서.md`(3번 ⑫ 신규 기능, 5-8 API 스펙, 6번 데이터 모델), `CLAUDE.md` 갱신 — "아직 연결 안 됨" 문구 정정

- [x] **P0** — [#26](https://github.com/rldbs5353/hub/issues/26) `analyzeReviews`를 실제 Claude API 호출로 교체 (화 7/21 완료. `services/claude.client.js` 신설 — Anthropic Messages API를 tool-use로 호출하는 범용 함수. `reviews.service.js`는 규칙 기반 함수(`classifySentiment`/`extractKeywords`/`buildReplyDrafts`/단어 목록)를 전부 제거하고 이 클라이언트를 호출하도록 교체, `analyzeReviews`가 async로 전환됨. `score`/`improvementSuggestion`은 설계대로 로컬 계산 유지. 실제로 오늘 아침 규칙 기반으로 "중립" 오분류됐던 슬랭 리뷰 3개(「음식 맛 디지게 없어」 등)를 다시 넣어보니 전부 정확히 "negative"로 분류되는 것 확인)
- [x] **P0** — [#27](https://github.com/rldbs5353/hub/issues/27) 컨트롤러/라우트 async 전환 및 엔드투엔드 연결 (화 7/21 완료. Express 4는 async 핸들러의 reject를 자동으로 못 잡아서 `middleware/asyncHandler.js` 신설, `reviews.route.js`의 `/analyze`에 적용. `reviews.controller.js`의 `analyzeReviews`를 async로 전환. curl로 실제 분석 결과가 DB에 그대로 저장되는 것, `EMPTY_INPUT`/`INVALID_JSON` 등 기존 에러 케이스가 여전히 API 호출 전에 걸러지는 것 확인)
- [x] **P0** — [#28](https://github.com/rldbs5353/hub/issues/28) API 키 미노출 최종 점검 (화 7/21 완료. `git grep`으로 프론트 소스 전체 확인(문서 언급 1건 외 없음), `.env`가 git 히스토리에 커밋된 적 없음 확인, 프론트 프로덕션 빌드(`npm run build`) 후 `dist/` 산출물 전체에서 키·`api.anthropic.com` 문자열 0건 확인, Playwright로 실제 분석 실행 중 브라우저가 접속한 호스트를 전부 로깅해 `localhost:4000`(백엔드)에만 요청하고 `anthropic.com`엔 직접 연결하지 않는 것 네트워크 레벨로 확인)

> **알려진 이슈**: `#26` 교체 이후 `npm test`가 10개 전부 실패한다(`analyzeReviews`가 이제 async라 기존 테스트가 Promise를 배열처럼 다루려다 터짐). 의도된 상태 — mock 기반으로 테스트를 다시 쓰는 건 `#32`(목 7/23) 몫으로 이미 계획돼 있어서 지금 손대지 않음.

### 보너스 — 대시보드 AI 한줄 인사이트 (화 7/21)

계획에는 없었지만, Claude API 실연동 직후 "리뷰 생성기가 아니라 매니저처럼 느껴지게 하려면?"을 고민하다가 바로 구현까지 진행했다.

- [x] 백엔드: `services/insight.service.js` 신설 — 총 분석 통계 + 반복 문제를 프롬프트로 묶어 Claude에게 한 줄 인사이트를 요청. `dashboard_insights` 테이블에 `session_id`당 하루 1건만 캐싱해서 재방문 시 API를 다시 부르지 않음. `GET /api/v1/stats/insight` 신규
- [x] 프론트: `components/dashboard/InsightBanner.jsx` 신규 — 대시보드 통계(즉시 응답)와 분리해서 자체 로딩 상태로 인사이트를 불러옴
- [x] curl로 첫 호출(~2초, 실제 API 호출)과 재호출(~0.2~0.3초, 캐시 히트, 내용 동일) 응답 시간 차이로 캐싱 동작 확인, Playwright로 대시보드에 배너가 실제로 뜨는 것 확인

- [x] **P1** — [#29](https://github.com/rldbs5353/hub/issues/29) 답변 초안 3종(정중함/친근함/간결함) 프롬프트 튜닝 (수 7/22 완료. `REVIEW_ANALYSIS_TOOL.replyDrafts`의 각 톤 필드에 문체·길이 지침을 `description`으로 추가(정중함: 격식체 3~4문장, 친근함: 구어체+이모지 최대 1개, 간결함: 80자 이내 2문장), `userMessage`에도 "톤마다 실제로 다르게 느껴지게" 지시 추가. 튜닝 전에는 세 톤이 어미만 다른 비슷한 문장이었는데, 실제 호출로 확인해보니 톤별로 길이·표현이 뚜렷이 구분되는 것 확인)
- [x] **P1** — [#30](https://github.com/rldbs5353/hub/issues/30) API 파싱 실패·타임아웃 에러 코드 매핑 (수 7/22 완료. 새 에러 코드는 추가하지 않고 기존 `ANALYSIS_FAILED`(500)로 계속 매핑하는 게 확정된 설계(`기획서.md` 8-5) — 대신 `claude.client.js`에 `AbortController`로 15초 타임아웃을 추가하고(기존엔 타임아웃이 아예 없어서 API가 응답을 안 주면 요청이 무한정 걸릴 수 있었음), 네트워크 오류/응답 JSON 파싱 실패도 각각 명확한 에러 메시지로 던지도록 하드닝. 5가지 실패 케이스(타임아웃/네트워크 오류/비정상 상태코드/JSON 파싱 실패/tool_use 누락)를 fetch를 모킹한 스크립트로 재현해 전부 의도한 메시지로 던지는 것 확인 — 전부 `.status`/`.code`가 없는 순수 Error라 `errorHandler`가 기존대로 500 `ANALYSIS_FAILED`로 통일해서 응답하는 것도 코드 리뷰로 재확인)
- [x] **P1** — [#31](https://github.com/rldbs5353/hub/issues/31) 반복 문제 감지 로직 재검증 (수 7/22 완료. "시끄럽다"는 공통 불만이 담긴 리뷰 3개를 같은 세션으로 연달아 분석해 curl+DB 직접 조회로 확인 — 부정/중립 리뷰에 걸쳐 `분위기` 키워드가 반복 감지되어 `recurringIssues`에 정상적으로 뜨는 것 확인. 검증 과정에서 별개의 사실도 하나 발견: Windows Git Bash에서 한글이 든 `curl -d`를 그대로 넘기면 인코딩이 깨져 AI가 리뷰 원문을 제대로 못 읽고 엉뚱한 감정/키워드를 내는 경우가 있었음 — 코드 버그가 아니라 테스트 방법 문제였고, `--data-binary @file`(UTF-8 파일)로 바꾸니 정상 동작. 앞으로 한글 리뷰로 API를 curl 검증할 땐 inline `-d` 대신 파일로 넘기기로)

### 보너스 — DB/인증을 SQLite에서 Supabase로 전환 (수 7/22)

계획에는 없었지만, "이거 지금 supabase야?" 질문에서 시작해서 실제로 Supabase(Postgres + Auth)로 전면 교체까지 진행했다. Auth 연동은 프론트엔드 코드를 한 줄도 안 건드리는 방식(백엔드가 대신 Supabase Auth를 호출)으로 결정 — Claude API를 서버에만 감춰둔 것과 같은 패턴.

- [x] Supabase 프로젝트 생성(사용자가 직접), `.env`에 `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` 설정 — 값은 절대 채팅에 노출하지 않고 role/연결 성공 여부만 확인
- [x] `reviews`/`dashboard_insights` 테이블을 Supabase SQL Editor에서 생성(`users`/`auth_tokens`는 Supabase 내장 `auth.users`가 대체), RLS는 활성화하되 정책 없이 기본 거부 — 백엔드는 `service_role` 키로 우회
- [x] `db.js`(SQLite) 삭제 → `db/supabaseClient.js` 신설. `history`/`stats`/`insight`/`auth` 서비스 전부 sync SQLite 호출 → async Supabase 호출로 재작성, 관련 컨트롤러/라우트에 `asyncHandler` 적용 범위 확대
- [x] `auth.service.js`를 Supabase Auth(`admin.createUser`/`signInWithPassword`/`getUser`/`admin.signOut`)로 전면 교체 — 함수 시그니처와 응답 모양(`{user, token}`)은 그대로 유지해서 프론트/컨트롤러 변경 없음
- [x] **실전 버그 발견 및 수정**: 로그인(`signInWithPassword`)과 DB 쿼리를 같은 Supabase 클라이언트 인스턴스로 하면, 로그인 호출이 그 클라이언트의 세션을 바꿔버려서 이후 DB 쿼리 인증 헤더가 `service_role`이 아니라 방금 로그인한 유저 권한으로 나가 RLS에 막히는 것을 확인(`supabase-js` 소스의 `_getSessionToken()`까지 확인). 세션을 만들거나 읽는 호출(`signInWithPassword`/`getUser`)은 매번 새 클라이언트 인스턴스로 분리해서 해결
- [x] curl로 회원가입→`/me`→리뷰분석(DB insert)→통계→인사이트 캐싱→로그아웃(토큰 실제 무효화 확인)→중복 이메일(`EMAIL_TAKEN`)/오타 비밀번호(`INVALID_CREDENTIALS`) 에러 코드→익명 세션 분석까지 전 구간 curl로 검증, 테스트 데이터 정리
- [x] `CLAUDE.md` DB/인증 결정 문단 갱신(2026-07-22), 아키텍처 다이어그램(README.md)도 Supabase 반영해서 갱신

- [x] **P1** — [#32](https://github.com/rldbs5353/hub/issues/32) 핵심 로직 테스트 보강 (목 7/23 완료)
- [x] **P1** — [#33](https://github.com/rldbs5353/hub/issues/33) 규칙 기반 로직 정리 및 리팩토링 (목 7/23 완료)
- [x] **P1** — [#34](https://github.com/rldbs5353/hub/issues/34) 코드 리뷰 — 에이전트 활용 (목 7/23 완료)
- [x] **P2** — [#35](https://github.com/rldbs5353/hub/issues/35) 요청 레이트리밋 / 입력 길이 제한 보강 (금 7/24 완료)
- [x] **P2** — [#36](https://github.com/rldbs5353/hub/issues/36) Agent 고급 활용 — 반복 작업 자동화 (금 7/24 완료)
- [x] **P1** — [#37](https://github.com/rldbs5353/hub/issues/37) 3주차 마무리 — 전체 재검증 및 TASKS.md 갱신 (금 7/24 완료)

### 목(7/23) — 핵심 로직 테스트 보강, 리팩토링, 코드 리뷰

- [x] **[#32](https://github.com/rldbs5353/hub/issues/32) 핵심 로직 테스트 보강** — 백엔드 테스트 러너를 `node:test`에서 vitest로 통일(프론트엔드와 스택 일치). `#26` 교체 이후 깨져 있던 `reviews.service.test.js`를 `fetch` mock 기반으로 재작성. `claude.client.test.js` 신규 추가로 성공/응답실패(status)/JSON 파싱실패/tool_use 없음/네트워크 오류/타임아웃까지 `callClaudeTool`의 실패 케이스 전부 커버. `reviews.controller.test.js` 신규 추가(`validateReviews` 단위 테스트).
- [x] **[#33](https://github.com/rldbs5353/hub/issues/33) 규칙 기반 로직 정리 및 리팩토링** — 옛 규칙 기반 분류 함수(`classifySentiment`/`KEYWORD_MAP` 등)는 `#26`에서 이미 제거되어 남아있지 않음을 확인. 계속 쓰이는 부분 중복 정리: `suggestImprovement`가 `suggestionForKeyword`를 호출하도록 통합(`SOLUTION_MAP` 폴백 중복 제거), `KEYWORD_CATEGORIES`를 `SOLUTION_MAP`에서 파생(이중 관리 방지), 프롬프트 조립을 `buildReviewAnalysisPrompt()`로 분리, `stats.service.js`/`history.service.js`의 키워드 카운팅 로직을 `countKeywords()`로 공용화. **확인 필요 항목 결정**: API 장애 시 규칙 기반 폴백 없이 API 전용(장애 시 `ANALYSIS_FAILED`)으로 동작하는 것으로 확정.
- [x] **[#34](https://github.com/rldbs5353/hub/issues/34) 코드 리뷰 — 에이전트 활용** — 규칙 기반 로직 리팩토링(#33)은 4개 관점(재사용/단순화/효율성/구현 깊이) 병렬 에이전트로 리뷰 후 동작 변경 없는 항목만 적용. 오늘 diff 전체는 별도로 정확성 관점 에이전트 리뷰 — 심각한 버그 없음, 낮은 확신 잠재 리스크 2건만 기록. [PR #1916](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1916)로 제출, 이슈 3개 코멘트 후 클로즈.

### 금(7/24) — 레이트리밋/입력 길이 제한, Agent 고급 활용, 3주차 전체 재검증

- [x] **[#35](https://github.com/rldbs5353/hub/issues/35) 요청 레이트리밋 / 입력 길이 제한 보강** — 세션(`X-Session-Id`, 없으면 IP) 기준 1분에 20회로 제한하는 인메모리 슬라이딩 윈도우 미들웨어(`rateLimiter.js`) 신설, 초과 시 429 `RATE_LIMITED`. `validateReviews`에 리뷰 하나당 500자 초과 시 400 `REVIEW_TOO_LONG` 추가. **실전 버그 발견 및 수정**: 새로 만든 `code-reviewer` 에이전트로 검토하던 중, `sessionId` 미들웨어가 헤더 없는 요청마다 매번 새 UUID를 발급해 `req.sessionId`가 항상 truthy하므로 `req.sessionId || req.ip` 키 선택 로직이 `req.ip`로 절대 안 떨어져 **헤더 없는 요청은 레이트리밋이 사실상 무력화**되는 문제를 발견 — `req.get('X-Session-Id') || req.ip`로 원본 헤더를 직접 보도록 수정. curl로 헤더 있음/없음 두 경우 모두 21번째 요청에서 429 발생하는 것, 501자 리뷰가 400 `REVIEW_TOO_LONG`인 것 확인. 기획서.md 5-1/5-2/5-4절 갱신.
- [x] **[#36](https://github.com/rldbs5353/hub/issues/36) Agent 고급 활용 — 반복 작업 자동화** — 스킬 `spec-drift-check`(기획서/CLAUDE.md와 실제 코드·git 로그 간 드리프트 탐지) 신설, 에이전트 `code-reviewer`(정확성 관점 코드 리뷰, `/simplify`와 역할 분리) 신설. **부수 발견**: `.gitignore`가 `.claude/`를 통째로 무시하고 있어, 기존 `planning-agent`/`feature-verifier`를 포함해 지금까지 만든 커스텀 Agent/Skill이 전부 로컬에만 있고 한 번도 git에 커밋된 적이 없었음 — `settings.local.json`(개인 권한 설정)만 계속 무시하고 `agents/`·`skills/`는 추적하도록 `.gitignore` 수정, 4개 파일 전부 커밋. **실행 결과 확인**: `code-reviewer` 에이전트를 `#35` 변경분에 실제로 돌려 위 레이트리밋 우회 버그를 실제로 찾아냄(리뷰 대상 코드에 실제 버그가 있었고, 에이전트가 그걸 실제로 잡아낸 것으로 "실행 결과 확인" 기준 충족).
- [x] **[#37](https://github.com/rldbs5353/hub/issues/37) 3주차 마무리 — 전체 재검증 및 TASKS.md 갱신** — `feature-verifier` 에이전트로 정상 플로우(결과 카드 렌더링·대시보드 반영·복사 피드백), 에러 케이스 6종(`EMPTY_INPUT`/`NO_VALID_REVIEW`/`TOO_MANY_REVIEWS`/`REVIEW_TOO_LONG`/`INVALID_JSON`/`RATE_LIMITED`), 반복 문제 감지(`recurringIssues.occurrenceCount>=2`)까지 전체 재검증 — 전 항목 PASS. **발견된 이슈(4주차로 이월)**: Claude API 응답의 `keywords`가 `REVIEW_ANALYSIS_TOOL` 스키마에 정의된 6개 카테고리 enum으로 서버 측에서 강제되지 않아, 실제로 `"불편"`, `"불편함"` 같은 스키마 밖 값이 응답·DB에 그대로 저장되는 것을 확인(`claude.client.js`가 `toolUse.input`을 검증 없이 반환). `computeScore`의 키워드 개수 보너스에도 스키마 밖 값이 그대로 반영되어 점수 산정에 영향. 아래 4주차 섹션에 인계.

### 착수 전 확인 필요

- `claude-haiku-4-5` 모델 ID/가격 유효성 (임의 추측 금지, #24 착수 시 재확인)
- SDK(`@anthropic-ai/sdk`) 신규 도입 vs 기존 `fetch` 직접 호출 (#24)
- 구조화 응답 방식: tool-use vs 프롬프트+직접 파싱 (#25)
- 타임아웃/재시도 정책 (#30)
- ~~레이트리밋 구체 수치 (#35)~~ → 세션/IP 기준 1분 20회로 확정 (7/24)
- ~~API 장애 시 규칙 기반 로직 폴백 여부 (#33 리팩토링 범위에 영향)~~ → API 전용, 폴백 없음으로 확정 (7/23)

## 4주차 — 서비스 완성, Agent 개발 흐름 완성

이 프로젝트는 **금요일(7/31) 데모데이로 종료**된다. 대시보드: [rldbs5353/hub#53](https://github.com/rldbs5353/hub/issues/53).

- 월(7/27): 핵심 기능 완료와 배포 준비
- 화(7/28): Vercel·Render 첫 배포
- 수(7/29)·목(7/30): 부족한 기능 보완, 재배포, 워크플로우 정리, 영상제출(수)
- 금(7/31): 데모데이 — 개발 작업 없음

### 월요일(7/27) — 핵심 기능 완료와 배포 준비 (완료)

- [x] **P0** — [#39](https://github.com/rldbs5353/hub/issues/39) `keywords` 응답 enum 화이트리스트 가드 추가 (완료. `sanitizeKeywords()`로 스키마 밖 값을 "일반"으로 대체·중복 제거)
- [x] **P0** — [#41](https://github.com/rldbs5353/hub/issues/41) 전체 플로우(정상/에러/반복 문제 감지) 통합 테스트 및 버그 픽스 (완료. `feature-verifier`로 전 항목 재검증 중 레거시 데이터의 스키마 밖 키워드가 통계·반복문제 감지·내 리뷰 목록에서 그대로 노출되던 버그 추가 발견·수정 — `countKeywords`/`getReviewsByUser`에도 `sanitizeKeywords` 적용)
- [x] **P0** — [#40](https://github.com/rldbs5353/hub/issues/40) 배포 준비 — Vercel(프론트)/Render(백엔드) 결정 (완료. `api.js`의 하드코딩된 `localhost:4000`을 `VITE_API_BASE_URL` 환경변수로 전환, `vercel.json`으로 SPA rewrite 추가, 루트 `render.yaml`로 백엔드 배포 설정 선언, `CLAUDE.md`에 배포 결정 기록)

### 화요일(7/28) — Vercel·Render 첫 배포 (완료)

- [x] **P0** — [#42](https://github.com/rldbs5353/hub/issues/42) Render 백엔드 배포 (완료. **BE**: [review-assistant-server.onrender.com](https://review-assistant-server.onrender.com) — `/health` 200 확인)
- [x] **P0** — [#43](https://github.com/rldbs5353/hub/issues/43) Vercel 프론트엔드 배포 및 백엔드 연동 (완료. **FE**: [hub-lovat-omega.vercel.app](https://hub-lovat-omega.vercel.app) — Root Directory를 `review-assistant-react`로 지정, `VITE_API_BASE_URL`에 BE 주소 등록. 배포 중 GitHub 포크의 기본 브랜치가 `main`이라 `N112_엄기윤`의 실제 코드가 안 보이던 문제 발견 — 기본 브랜치를 임시로 `N112_엄기윤`로 바꿔서 해결)
- [x] **P0** — [#44](https://github.com/rldbs5353/hub/issues/44) 배포 환경 전체 회귀 검증 (핵심 플로우 확인 완료 — `/health`, SPA 라우팅(`/dashboard` 직접 접속), CORS preflight(Vercel→Render 허용 확인, 처음엔 `CORS_ORIGIN`이 로컬 임시값으로 남아있어 수정), 실제 리뷰 분석 end-to-end curl 테스트 전부 통과. 에러 케이스 전체(429/400 6종)까지의 배포 환경 재검증은 `#54`에서 이어서 진행)

### 수요일(7/29) — 보완·재배포·워크플로우 정리 + 영상 제출

- [ ] **P0** — [#54](https://github.com/rldbs5353/hub/issues/54) 배포 후 버그 보완 및 재배포 (착수. AI 인사이트 캐시가 당일 신규 리뷰를 반영 못 하던 버그를 `hasNewReviewsSince()`로 수정, Figma 목업 기준 랜딩/대시보드/도구 페이지 디자인 개편, `N112_엄기윤` 브랜치에 커밋·푸시해 Vercel/Render 재배포 트리거 — 목요일에 배포 환경 재검증까지 이어서 진행)
- [ ] **P1** — [#47](https://github.com/rldbs5353/hub/issues/47) Agent 개발 흐름 정리(4주차 회고) — 착수. `WORKFLOW.md`에 "4주차 — 배포와 디자인 반영에서 달라진 것" 섹션 추가(배포는 AI가 안내만/클릭은 사람, 사람이 스크린샷으로 버그를 신고하는 패턴, 디자인 세부조정은 사람에게 역할이 넘어간 사례) — 목요일에 마무리
- [ ] **P0** — [#55](https://github.com/rldbs5353/hub/issues/55) 데모 영상 제출 (마감)

### 목요일(7/30) — 보완·재배포·워크플로우 정리 (계속)

- [ ] **P0** — [#54](https://github.com/rldbs5353/hub/issues/54) 배포 후 버그 보완 및 재배포 (계속)
- [ ] **P1** — [#45](https://github.com/rldbs5353/hub/issues/45) 최종 데모 시나리오 정리 (리허설)
- [ ] **P1** — [#46](https://github.com/rldbs5353/hub/issues/46) README 최신화
- [ ] **P1** — [#47](https://github.com/rldbs5353/hub/issues/47) Agent 개발 흐름 정리 — 마무리
- [ ] **P2** — [#52](https://github.com/rldbs5353/hub/issues/52) 잔여 백로그 정리 및 회고 기록

### 금요일(7/31) — 데모데이

개발 작업 없음. 발표 진행.

### 백로그로 이월 (이번 주 일정에는 없음)

- [ ] **P1** — [#48](https://github.com/rldbs5353/hub/issues/48) 향후 확장 후보(CSV 업로드 / 톤 커스터마이징) 중 1개 프로토타입 착수
- [ ] **P2** — [#49](https://github.com/rldbs5353/hub/issues/49) `Promise.allSettled` 부분 실패 허용 전환 검토
- [ ] **P2** — [#50](https://github.com/rldbs5353/hub/issues/50) `supabaseClient` 지연 초기화 전환 검토
- [ ] **P2** — [#51](https://github.com/rldbs5353/hub/issues/51) `stats` 엔드포인트 중복 조회 통합/캐시 검토

---

## 참고
- 기능 스펙: [`review-assistant-react/기획서.md`](review-assistant-react/기획서.md)
- 개발 환경/컨벤션: [`CLAUDE.md`](CLAUDE.md)
- 디자인 시스템: [`review-assistant-react/CLAUDE.md`](review-assistant-react/CLAUDE.md)
