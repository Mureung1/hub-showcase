# 002 — 병렬 delivery collision과 초기 lane boundary를 조사한다

## Wayfinder ticket

- Type: research
- State: resolved
- Blocked by: None

## Question

현재 monorepo의 module·test·generated artifact·root lockfile ownership에서 동시에 수정하면 충돌하거나 authority가 갈라지는 표면은 무엇인가? Public repository/release, npx composition/Runtime delivery, OAuth/setup backend, onboarding·Semester Ready UX와 integration/QA 중 지금 독립적으로 조사·구현 가능한 초기 lane, single-owner shared surface와 contract-spine 후보를 식별하고, 주요 seam 결정 전에도 안전한 worktree·branch·read-only review 규칙과 즉시 중단할 collision 조건을 어디에 둘 수 있는가? Exact final lane ownership·merge order·gate는 이 ticket에서 고정하지 않고 [최종 병렬 delivery contract와 integration protocol을 정한다](014-final-parallel-delivery-contracts.md)로 넘긴다.

## Answer

이번 조사 session의 4개 동시 slot은 coordinator 1명과 read-only investigator 최대 3명으로 운영했다. 이는 현재 research capacity일 뿐 구현 단계의 동시 writer 수 결정이 아니다. Wayfinder 동안에는 한 명만 map·ticket을 쓰고 병렬 agent는 read-only research·review를 맡는다. 구현 단계에서는 같은 contract-spine SHA에서 갈라진 별도 attached worktree마다 writer 한 명을 두고, lane-local 변경은 병렬화하되 shared contract와 합류는 단일 integrator가 직렬화한다.

초기 lane 후보는 Runtime core·OAuth adapter, distribution composition, product backend·setup, product UI·onboarding, landing·public release와 integration/QA다. 이들을 모두 동시에 열지 않고 현재 dependency frontier와 merge cost에 맞춰 선택·교대한다. Exact 동시 writer 수는 Ticket 014가 결정한다. `packages/product-contract/**`, root `package.json`·`package-lock.json`, Runtime generated source·patch·manifest·`.artifacts`, shared release descriptor와 cross-surface E2E harness는 single-owner surface다.

Runtime-private auth Interface, Browser-safe setup/bootstrap contract, Runtime release descriptor, production host Interface, public release identity와 deterministic cross-surface fixture를 contract-spine 후보로 식별했다. Exact field, file ownership, branch naming, merge order와 gate cadence는 후속 seam 결정 뒤 [Ticket 014](014-final-parallel-delivery-contracts.md)가 확정한다.

근거, lane별 금지 경계, worktree·review 규칙, 잠정 verification cadence와 stop-the-line 조건은 [병렬 delivery collision audit](../assets/parallel-delivery-collision-audit.md)에 기록했다.
