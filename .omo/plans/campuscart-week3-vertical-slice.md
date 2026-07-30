# CampusCart 3주차 수직슬라이스 완성 계획

## TL;DR
> **Summary**: 현재 React 화면과 Express API는 연결되어 있지만 저장소가 메모리라 서버 재시작 시 사라진다. 이번 주에는 기존 공동구매 CRUD 화면을 Supabase `group_buys` 한 테이블에 연결해 화면 → 서버 → DB → 화면 흐름을 완성한다.
> **Deliverables**: Supabase 스키마, Express DB 연결, 공동구매 CRUD 영속화, 새로고침/재시작 검증, 이슈별 증거
> **Effort**: Medium
> **Parallel**: NO — 학습과 확인을 위해 하루 단위로 순차 진행
> **Critical Path**: DB 준비 → 조회/생성 → 수정/삭제 → 화면 검증 → Agent 재검증

## Context

### Original Request
- 월요일부터 금요일까지 프로젝트에 맞는 구체적인 계획을 세운다.
- 지난주에 덜 끝난 화면 → 서버 → DB → 화면 수직슬라이스를 최우선으로 완성한다.
- 작업을 우선순위별 이슈 단위로 나누고 기존 Agent로 관리한다.

### Current State
- `src/pages/GroupBuysPage.jsx`에서 목록 조회, 생성, 수정, 삭제 화면이 이미 Express API를 호출한다.
- `src/services/groupBuysApi.js`에 CRUD 요청 함수가 있다.
- `server/demo.js`에 CRUD/참여/투표 API가 있지만 모든 데이터가 메모리 배열에 저장된다.
- Supabase 패키지, 환경변수 예시, SQL 스키마와 마이그레이션은 아직 없다.
- `npm run lint`와 `npm run build`는 통과하지만 자동 테스트는 없다.

### Metis Review Applied
- 이번 주 필수 범위는 `group_buys` 한 테이블 CRUD로 고정한다.
- 참여/투표 DB 저장은 별도 테이블과 동시성 처리가 필요하므로 핵심 슬라이스 완료 후 선택 작업으로 둔다.
- Supabase 서비스 키는 Express에서만 사용하며 브라우저에 노출하지 않는다.
- 메모리 저장소로 조용히 되돌아가는 fallback은 만들지 않는다.

## Work Objectives

### Core Objective
사용자가 공동구매를 화면에서 만들고 수정·삭제했을 때 Supabase에 반영되며, 브라우저 새로고침과 Express 재시작 뒤에도 동일한 결과가 조회되도록 한다.

### Definition of Done
- 화면에서 만든 공동구매가 Supabase에 정확히 한 행 저장된다.
- 새로고침과 Express 재시작 후에도 생성·수정 결과가 유지된다.
- 삭제한 항목은 재시작 후에도 다시 나타나지 않는다.
- 잘못된 입력은 400, 없는 항목은 404, 권한이 없는 수정/삭제는 403으로 응답한다.
- Supabase 비밀 키가 프론트엔드 코드나 Git에 포함되지 않는다.
- `npm run lint`, `npm run build`, API 검증 시나리오가 통과한다.

### Must Have
- 기존 API 응답 형태와 화면 흐름 유지
- `X-User-Id` 기반 데모 사용자 권한 유지
- 재현 가능한 SQL 마이그레이션과 `.env.example`
- 실제 DB 행과 화면 결과를 모두 확인하는 검증

### Must NOT Have
- 이번 주 필수 범위에 Supabase Auth/RLS, 지도 API, 배포, UI 전면 개편을 넣지 않는다.
- 서비스 역할 키를 `VITE_` 환경변수로 만들지 않는다.
- DB 연결 실패 시 메모리 저장소로 몰래 전환하지 않는다.

## Verification Strategy
- Test decision: 기존 테스트 프레임워크가 없으므로 API 스모크 스크립트 + 실제 브라우저 QA를 사용한다.
- QA policy: 각 이슈 완료 시 구현 Agent와 검증 Agent를 분리해 결과를 다시 확인한다.
- 공통 게이트: `npm run lint`, `npm run build`, `node --check server/demo.js`.

## Execution Strategy

| 요일 | 핵심 결과 | 우선순위 |
|---|---|---|
| 월요일 | Supabase 테이블과 연결 준비 완료 | P0 |
| 화요일 | 목록 조회와 생성이 DB에 저장됨 | P0 |
| 수요일 | 수정과 삭제가 DB에 유지됨 | P0 |
| 목요일 | 실제 화면에서 전체 CRUD 한 바퀴 검증 | P0 |
| 금요일 | Agent 재검증, 문서화, 선택 기능 판단 | P1 |

## TODOs

- [x] 1. 월요일 — 현재 상태와 DB 계약 확정

  **GitHub 이슈 제목**: `[P0] Supabase group_buys 테이블 및 연결 환경 준비`

  **What to do**:
  - `server/demo.js`와 `GroupBuyEditor.jsx`의 필드를 기준으로 `group_buys` 컬럼을 확정한다.
  - 최소 컬럼은 `id`, `name`, `category`, `target_people`, `current_people`, `deadline`, `pickup_location`, `status`, `owner_id`, `host_name`, `unit_price`, `shipping_fee`, `stage`, `created_at`으로 한다.
  - SQL 마이그레이션, `.env.example`, 서버 전용 Supabase 클라이언트를 준비한다.
  - `SUPABASE_URL`, 서버 전용 키가 없으면 서버 시작 시 명확히 실패하도록 한다.

  **References**:
  - `server/demo.js:18-36` — 현재 데이터 모양과 생성 API
  - `src/components/GroupBuyEditor.jsx:1-20` — 화면 입력 필드
  - `package.json` — Supabase 서버 의존성 추가 위치

  **Acceptance Criteria**:
  - [x] 비운영 Supabase 프로젝트에 마이그레이션을 실행할 수 있다.
  - [x] Express에서 테스트 행 1개를 insert/select/delete할 수 있다.
  - [x] 키가 Git 및 프론트엔드 번들에 포함되지 않는다.

  **QA Scenarios**:
  - Happy: 테스트 행 저장 → 같은 ID 조회 → 테스트 행 삭제.
  - Failure: 환경변수 없이 서버 실행 → 설정 누락 오류와 함께 종료.

  **Commit**: YES | `feat(db): add Supabase group buy schema and client`

- [x] 2. 화요일 — 공동구매 조회와 생성 영속화

  **GitHub 이슈 제목**: `[P0] 공동구매 목록 조회 및 생성 API를 Supabase에 연결`

  **What to do**:
  - `GET /api/group-buys`, `GET /api/group-buys/:id`, `POST /api/group-buys`를 비동기 Supabase 쿼리로 교체한다.
  - DB의 snake_case 컬럼을 기존 프론트엔드 camelCase 응답으로 변환한다.
  - 생성 시 `owner_id`는 현재 `X-User-Id` 값을 사용한다.
  - 예상치 못한 DB 오류는 내부 내용을 숨긴 500으로 응답한다.

  **References**:
  - `server/demo.js:33-36` — 현재 조회/생성 계약
  - `src/services/groupBuysApi.js:11-14` — 변경하지 않아야 할 프론트 API 형태
  - `src/pages/GroupBuysPage.jsx:25-50` — 조회/생성 후 재조회 흐름

  **Acceptance Criteria**:
  - [x] 화면에서 생성한 행이 Supabase에서 확인된다.
  - [x] 브라우저 새로고침과 Express 재시작 후에도 목록에 남는다.
  - [x] 잘못된 생성 값은 400으로 응답한다.

  **QA Scenarios**:
  - Happy: `주간계획 테스트 상품` 생성 → DB ID 확인 → 재시작 → GET 결과에 같은 ID 존재.
  - Failure: 이름이 빈 요청 → 400이며 DB 행 수가 증가하지 않음.

  **Commit**: YES | `feat(api): persist group buy reads and creates`

- [x] 3. 수요일 — 공동구매 수정과 삭제 영속화

  **GitHub 이슈 제목**: `[P0] 공동구매 수정 및 삭제 API를 Supabase에 연결`

  **What to do**:
  - `PATCH /api/group-buys/:id`, `DELETE /api/group-buys/:id`를 Supabase로 교체한다.
  - 기존처럼 개설자만 수정/삭제할 수 있도록 `owner_id`와 `X-User-Id`를 비교한다.
  - 없는 ID는 404, 다른 사용자는 403, 잘못된 수정값은 400을 유지한다.

  **References**:
  - `server/demo.js:37,42` — 현재 수정/삭제 규칙
  - `src/services/groupBuysApi.js:15,20` — 프론트 요청 계약
  - `src/pages/GroupBuysPage.jsx:52-64` — 수정/삭제 후 목록 갱신

  **Acceptance Criteria**:
  - [x] 수정 결과가 같은 DB 행에 반영되고 재시작 후 유지된다.
  - [x] 삭제한 행은 새로고침과 재시작 후에도 나타나지 않는다.
  - [x] 다른 사용자 헤더로 수정/삭제하면 403이다.

  **QA Scenarios**:
  - Happy: 화요일 테스트 상품 가격 수정 → 재시작 → 변경값 유지 → 삭제 → GET 404.
  - Failure: 다른 `X-User-Id`로 PATCH/DELETE → 403, DB 행은 그대로 유지.

  **Commit**: YES | `feat(api): persist group buy updates and deletes`

- [ ] 4. 목요일 — 화면 → Express → Supabase → 화면 완주

  **GitHub 이슈 제목**: `[P0] 공동구매 CRUD 수직슬라이스 화면 검증 및 오류 처리`

  **What to do**:
  - 공동구매 목록에서 생성, 상세 확인, 수정, 삭제를 차례대로 실행한다.
  - 로딩 중, API 연결 실패, 빈 목록, 저장 실패 상태가 화면에 보이도록 점검한다.
  - 성공 후에는 서버 응답을 기준으로 목록을 다시 불러와 오래된 화면 상태가 남지 않게 한다.

  **References**:
  - `src/pages/GroupBuysPage.jsx` — CRUD 화면
  - `src/components/GroupBuyEditor.jsx` — 생성/수정 폼
  - `src/services/groupBuysApi.js` — 오류 메시지 처리

  **Acceptance Criteria**:
  - [ ] 생성 → 새로고침 → 수정 → 서버 재시작 → 삭제 흐름이 전부 통과한다.
  - [ ] API 서버를 끄면 사용자가 이해할 수 있는 오류가 보인다.
  - [ ] `npm run lint`와 `npm run build`가 통과한다.

  **QA Scenarios**:
  - Happy: 실제 브라우저에서 전체 CRUD 수행, 단계별 화면과 DB 스크린샷 저장.
  - Failure: Express 종료 후 목록 새로고침 → 빈 화면 대신 오류/재시도 안내 확인.

  **Commit**: YES | `fix(ui): complete persisted CRUD feedback flow`

- [ ] 5. 금요일 — 검증 Agent 점검과 결과 정리

  **GitHub 이슈 제목**: `[P1] 수직슬라이스 기능 검증 및 실행 결과 정리`

  **What to do**:
  - 계획 Agent는 이슈별 완료 조건과 실제 결과를 비교한다.
  - 검증 Agent는 API 상태 코드, DB 행, 브라우저 화면을 각각 확인한다.
  - 테스트용 DB 행을 정리하고 실행 방법과 아직 남은 제한을 README 또는 이슈 댓글에 기록한다.
  - 모든 P0가 끝난 경우에만 `participants` 테이블 설계를 다음 주 이슈로 만든다.

  **References**:
  - `.omo/plans/campuscart-week3-vertical-slice.md` — 이번 주 완료 기준
  - `package.json` — lint/build 명령
  - `server/demo.js` — API 상태 코드

  **Acceptance Criteria**:
  - [ ] P0 이슈 네 개에 실행 결과 또는 스크린샷이 남아 있다.
  - [ ] 생성/조회/수정/삭제 및 새로고침/재시작 검증이 모두 통과한다.
  - [ ] 미완료 항목은 완료 처리하지 않고 다음 이슈로 이동한다.

  **QA Scenarios**:
  - Happy: 깨끗한 실행 상태에서 전체 흐름을 한 번 더 재현하고 DB 결과와 대조.
  - Failure: DB 연결 정보를 틀리게 설정 → 비밀 정보 없이 명확한 서버 오류 확인.

  **Commit**: YES | `docs: record vertical slice verification`

- [x] 6. 선택 작업 — 참여 정보 Supabase 저장

  **GitHub 이슈 제목**: `[P2][Stretch] 공동구매 참여 정보 DB 저장 설계`

  **What to do**:
  - 목요일 P0 검증이 모두 끝난 경우에만 시작한다.
  - `group_buy_participants` 테이블과 `(group_buy_id, user_id)` 중복 방지 규칙을 설계한다.
  - 이번 주 시간이 부족하면 구현하지 않고 다음 주 계획으로 넘긴다.

  **Acceptance Criteria**:
  - [x] 핵심 CRUD 완료를 방해하지 않는다.
  - [x] 참여 저장을 시작한다면 중복 참여 409와 재시작 후 참여 유지가 검증된다.

  **Commit**: OPTIONAL | `feat(db): persist group buy participation`

## Dependency Matrix

| Task | Blocked By | Blocks |
|---|---|---|
| 1 | 없음 | 2, 3 |
| 2 | 1 | 3, 4 |
| 3 | 1, 2 | 4 |
| 4 | 2, 3 | 5, 6 |
| 5 | 4 | 없음 |
| 6 | 4의 전체 통과 | 없음 |

## Final Verification Wave
- [ ] F1. 계획 Agent: P0 범위와 이슈 완료 조건 대조
- [ ] F2. 코드 품질 Agent: 비밀 키 노출, 오류 처리, 중복 코드 확인
- [ ] F3. 기능 검증 Agent: 실제 브라우저 CRUD와 서버 재시작 QA
- [ ] F4. 범위 점검: Auth/RLS/지도/디자인 작업이 핵심 일정을 밀어내지 않았는지 확인

## Commit Strategy
- 하루 한 이슈, 한 목적의 커밋을 기본으로 한다.
- `.env`와 실제 키는 절대 커밋하지 않는다.
- 목요일 검증 전에는 참여/투표 DB 작업을 같은 커밋에 섞지 않는다.

## Success Criteria
- 금요일에 “화면에서 만든 공동구매가 Express를 거쳐 Supabase에 저장되고, 새로고침과 서버 재시작 뒤에도 조회·수정·삭제된다”고 직접 보여줄 수 있다.
