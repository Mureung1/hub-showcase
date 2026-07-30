# CampusCart 참여 취소 기능 완성

## TL;DR
> **Summary**: 배포 전 핵심 완성도를 높이기 위해 공동구매 참여 취소를 화면·Express·Supabase까지 연결한다.
> **Deliverables**:
> - 원자적인 참여 취소 Supabase RPC
> - 참여 취소 API와 프론트엔드 버튼
> - 인원·모집 상태·투표 데이터 동기화
> - 단위·DB 통합·브라우저 검증
> **Effort**: Short
> **Parallel**: NO
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 → Task 5

## Context
### Original Request
- 실제 배포는 아직 하지 않고, 배포 직전 단계에 맞게 기능을 더 완성한다.

### Interview Summary
- 현재 참여 기능에는 취소 흐름이 없어 서비스 완성도가 떨어진다.
- 다음 기능은 `내 참여 확인 → 참여 취소 → 인원 감소 → DB 반영 → 새로고침 후 유지`로 정한다.
- PR은 사용자의 명시적 허락 없이는 생성하지 않는다.

### Metis Review (gaps addressed)
- 취소 시 기존 투표도 삭제한다.
- 정원이 찬 공동구매도 최종 수령 장소 확정 전에는 취소할 수 있고, 인원이 줄면 모집 상태를 `open`으로 되돌린다.
- `final_pickup`이 확정됐거나 진행 단계가 `모집 중`을 벗어나면 취소를 막는다.
- 개설자는 참가자 행이 아니므로 취소 대상이 아니다.
- 참가자 삭제, 투표 삭제, 인원 감소, 상태 변경은 하나의 DB RPC에서 처리한다.

## Work Objectives
### Core Objective
공동구매 참여자가 최종 진행 전 안전하게 참여를 취소하고, 모든 화면과 DB 상태가 즉시 일치하게 만든다.

### Deliverables
- `cancel_group_buy_participation` Supabase RPC와 새 migration
- repository `cancelParticipation` 메서드
- `DELETE /api/group-buys/:id/join` API
- 프론트엔드 `cancelGroupBuyParticipation` 요청 함수
- 상세 화면 참여 취소 버튼, 확인창, 성공·실패 메시지
- Activity/로컬 참여 기록 동기화
- 회귀 테스트와 실제 화면 검증

### Definition of Done
- 참여자가 취소하면 참가자 행과 기존 투표가 삭제된다.
- `current_people`이 정확히 1 감소하고 1 아래로 내려가지 않는다.
- 인원이 목표보다 적어지면 `status`가 `open`으로 복구된다.
- 새로고침 후에도 취소 상태가 유지된다.
- `npm test`, `npm run test:db`, `npm run lint`, `npm run build`가 통과한다.

### Must Have
- 로그인한 실제 참여자만 취소 가능
- DB 트랜잭션 수준 원자성
- 최종 수령 장소 확정 이후 취소 차단
- 사용자가 이해할 수 있는 오류 메시지

### Must NOT Have
- 개설자 인원 제거
- 클라이언트에서만 숫자를 임의로 감소
- 기존 migration 수정
- 실제 배포 또는 사용자 허락 없는 PR 생성

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after, 기존 Node test 및 Supabase integration test 사용
- QA policy: 각 작업에 성공·실패 시나리오 포함
- Evidence: `.omo/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
- Wave 1: DB 취소 규칙
- Wave 2: repository/API 연결
- Wave 3: 화면 및 캐시 동기화
- Wave 4: 전체 회귀·브라우저 검증

### Dependency Matrix
| Task | Blocked By | Blocks |
|---|---|---|
| 1 | - | 2, 4 |
| 2 | 1 | 3, 4 |
| 3 | 2 | 4 |
| 4 | 1, 2, 3 | 5 |
| 5 | 4 | Final Verification |

## TODOs

- [ ] 1. 참여 취소 Supabase RPC 추가

  **What to do**: 새 migration에 `cancel_group_buy_participation(target_group_buy_id uuid, participant_user_id text)`를 추가한다. 대상 공동구매를 `for update`로 잠그고 공동구매 존재, 개설자 여부, 참여 여부, `final_pickup`, `stage`를 검사한다. 참가자의 투표와 참가자 행을 삭제하고 `current_people`을 1 감소시키며 목표보다 적어지면 `status = 'open'`으로 갱신한다.
  **Must NOT do**: 기존 migration을 수정하거나 `current_people`을 1 아래로 내리지 않는다.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2, 4 | Blocked By: -

  **References**:
  - Pattern: `supabase/migrations/202607210001_create_group_buy_participants.sql:21` - join RPC의 행 잠금과 오류 처리
  - Pattern: `supabase/migrations/202607220002_secure_vote_workflow.sql:1` - 투표·확정 RPC 권한 설정
  - Schema: `supabase/migrations/202607200001_create_group_buys.sql` - 인원과 상태 제약

  **Acceptance Criteria**:
  - [ ] 참가자·투표 삭제와 인원·상태 변경이 단일 RPC에서 처리된다.
  - [ ] service role만 실행 가능하다.
  - [ ] 미참여, 개설자, 최종 확정·진행 중 상태는 명시적 오류로 거절된다.

  **QA Scenarios**:
  ```
  Scenario: 정원이 찬 공동구매 참여 취소
    Tool: Supabase integration test
    Steps: 목표 2명 공동구매 생성 → 1명 참여 → 취소 RPC 실행
    Expected: current_people=1, status=open, 참가자 행 0개
    Evidence: .omo/evidence/task-1-cancel-reopens.txt

  Scenario: 최종 장소 확정 후 취소
    Tool: Supabase integration test
    Steps: 참여 → 투표 → 최종 장소 확정 → 취소 RPC 실행
    Expected: 명시적 CANCEL_NOT_ALLOWED 오류, 기존 데이터 유지
    Evidence: .omo/evidence/task-1-cancel-blocked.txt
  ```

  **Commit**: NO | Files: `supabase/migrations/<new>_cancel_group_buy_participation.sql`

- [ ] 2. Repository와 Express 취소 API 연결

  **What to do**: repository에 취소 RPC를 호출하고 갱신된 공동구매를 반환하는 `cancelParticipation`을 추가한다. Express에 인증이 필요한 `DELETE /api/group-buys/:id/join`을 추가해 404·409·500을 구분하고 성공 시 갱신된 `groupBuy`를 반환한다.
  **Must NOT do**: 클라이언트가 넘긴 사용자 ID를 신뢰하지 않고 인증 토큰의 사용자 ID를 사용한다.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 3, 4 | Blocked By: 1

  **References**:
  - Pattern: `server/group-buy-repository.js:108` - join RPC wrapper
  - Pattern: `server/demo.js:73` - 참여 권한·중복 오류 처리
  - Auth: `server/demo.js:35-44` - 인증 사용자 구성과 `requireUser`

  **Acceptance Criteria**:
  - [ ] 참여자가 취소하면 HTTP 200과 `userJoined: false`인 최신 공동구매를 받는다.
  - [ ] 인증 없음은 401, 미참여·취소 불가 상태는 409, 없는 공동구매는 404다.

  **QA Scenarios**:
  ```
  Scenario: 인증된 참여자의 정상 취소
    Tool: curl
    Steps: 참여 토큰으로 DELETE /api/group-buys/{id}/join 호출
    Expected: 200, currentPeople 감소, userJoined=false
    Evidence: .omo/evidence/task-2-api-cancel.json

  Scenario: 참여하지 않은 사용자의 취소
    Tool: curl
    Steps: 다른 사용자 토큰으로 같은 endpoint 호출
    Expected: 409와 이해 가능한 오류 메시지
    Evidence: .omo/evidence/task-2-api-not-joined.json
  ```

  **Commit**: NO | Files: `server/group-buy-repository.js`, `server/demo.js`

- [ ] 3. 상세 화면 참여 취소 UX 구현

  **What to do**: API client에 취소 함수를 추가한다. 상세 화면에서 `userJoined`이고 취소 가능한 경우 참여 완료 안내와 취소 버튼을 표시한다. 확인창을 거친 뒤 서버 응답으로 `item`을 교체하고 성공·실패 메시지를 표시한다. 취소 성공 시 `campus-cart-joined`에서도 ID를 제거한다.
  **Must NOT do**: 요청 성공 전에 화면 숫자를 먼저 감소시키지 않는다.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 4 | Blocked By: 2

  **References**:
  - API pattern: `src/services/groupBuysApi.js:20`
  - UI state: `src/pages/GroupBuyDetailPage.jsx:18-29`
  - Joined panel: `src/pages/GroupBuyDetailPage.jsx:40-43`

  **Acceptance Criteria**:
  - [ ] 참여자는 상세 화면에서 취소 버튼과 취소 결과를 확인한다.
  - [ ] 취소 후 참여 입력 폼이 다시 나타나고 인원이 감소한다.
  - [ ] 새로고침 후에도 미참여 상태가 유지된다.
  - [ ] 최종 확정 이후에는 취소 버튼이 나타나지 않는다.

  **QA Scenarios**:
  ```
  Scenario: 상세 화면에서 참여 취소
    Tool: browser
    Steps: 로그인 → 참여한 공동구매 상세 → 취소 확인 → 새로고침
    Expected: 참여 폼 재표시, 인원 감소, 참여자 목록에서 닉네임 제거
    Evidence: .omo/evidence/task-3-ui-cancel.png

  Scenario: 사용자가 확인창에서 취소
    Tool: browser
    Steps: 참여 취소 클릭 → 확인창에서 아니오
    Expected: 서버 요청 없이 기존 참여 상태 유지
    Evidence: .omo/evidence/task-3-ui-confirm-cancel.png
  ```

  **Commit**: NO | Files: `src/services/groupBuysApi.js`, `src/pages/GroupBuyDetailPage.jsx`, 필요 시 `src/App.css`

- [ ] 4. DB 통합 테스트와 회귀 테스트 보강

  **What to do**: 기존 integration test에 정상 취소, 투표 정리, 상태 재개방, 최종 확정 후 거절, 취소 후 재참여를 추가한다. repository mock 테스트가 필요하면 RPC 인자와 재조회 동작을 검증한다.
  **Must NOT do**: 테스트 데이터나 인증 사용자를 Supabase에 남기지 않는다.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: 5 | Blocked By: 1, 2, 3

  **References**:
  - Integration pattern: `server/group-buy-repository.integration.test.js:34`
  - Unit pattern: `server/group-buy-repository.test.js`
  - Script: `package.json`의 `test`, `test:db`

  **Acceptance Criteria**:
  - [ ] 정상 취소 후 참가자·투표·인원·상태가 모두 검증된다.
  - [ ] 취소 후 같은 사용자가 다시 참여할 수 있다.
  - [ ] 실패 시 데이터가 부분 변경되지 않는다.

  **QA Scenarios**:
  ```
  Scenario: 참여 → 투표 → 취소 → 재참여
    Tool: npm run test:db
    Steps: 통합 fixture로 전체 순환 실행
    Expected: 모든 assertion 통과, 마지막 cleanup 완료
    Evidence: .omo/evidence/task-4-integration.txt

  Scenario: 확정 후 취소 거절의 원자성
    Tool: npm run test:db
    Steps: 확정 후 취소 시도 뒤 참가자·표·인원 재조회
    Expected: 오류 발생, 모든 기존 값 유지
    Evidence: .omo/evidence/task-4-atomic-failure.txt
  ```

  **Commit**: NO | Files: `server/group-buy-repository.integration.test.js`, 필요 시 `server/group-buy-repository.test.js`

- [ ] 5. 전체 품질 검사와 실제 브라우저 검증

  **What to do**: 단위·DB 통합·lint·build를 실행한다. 로컬 Vite와 Express를 실행하고 실제 로그인 사용자로 참여 취소와 새로고침, 내 참여 필터 반영을 확인한다. 발견한 회귀만 최소 수정한다.
  **Must NOT do**: 실제 배포, push, PR 생성을 수행하지 않는다.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Final Verification | Blocked By: 4

  **References**:
  - Commands: `package.json`
  - My participation filter: `src/services/groupBuyFilters.js`
  - Detail flow: `src/pages/GroupBuyDetailPage.jsx`

  **Acceptance Criteria**:
  - [ ] `npm test` 통과
  - [ ] `npm run test:db` 통과
  - [ ] `npm run lint` 통과
  - [ ] `npm run build` 통과
  - [ ] 브라우저에서 취소 후 상세·목록·새로고침 상태가 일치

  **QA Scenarios**:
  ```
  Scenario: 실제 사용자 전체 흐름
    Tool: browser
    Steps: 로그인 → 모집 참여 → 내 참여 확인 → 상세에서 취소 → 새로고침 → 내 참여 확인
    Expected: 취소한 공동구매가 내 참여에서 사라지고 상세에 참여 폼 표시
    Evidence: .omo/evidence/task-5-browser-flow.png

  Scenario: 비로그인 취소 API
    Tool: curl
    Steps: Authorization 없이 DELETE endpoint 호출
    Expected: 401, DB 상태 변화 없음
    Evidence: .omo/evidence/task-5-unauthorized.json
  ```

  **Commit**: YES | Message: `feat: 공동구매 참여 취소 기능 추가` | Files: 위 작업의 source, migration, test 파일
## Final Verification Wave
- [ ] F1. Plan Compliance Audit
- [ ] F2. Code Quality Review
- [ ] F3. Real Manual QA
- [ ] F4. Scope Fidelity Check

## Commit Strategy
- 기능과 migration, 테스트를 하나의 `feat: 공동구매 참여 취소 기능 추가` 커밋으로 묶는다.
- push와 PR은 별도 사용자 지시를 따른다.

## Success Criteria
- 참여, 취소, 재참여가 실제 Supabase에서 정상 순환한다.
- 취소 후 상세 화면과 내 참여 목록이 동일한 상태를 표시한다.
- 최종 확정 이후 취소 요청은 409로 거절된다.
- 모든 자동 검사와 실제 브라우저 시나리오가 통과한다.
