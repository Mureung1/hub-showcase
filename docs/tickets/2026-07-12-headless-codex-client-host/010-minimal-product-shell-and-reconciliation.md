# 010 — 최소 제품 Host shell을 연결하고 구현 상태를 정합화한다

## Agent triage

- State: wontfix
- Surface: local-ticket
- Next actor: none

## Parent Spec

`docs/specs/2026-07-12-headless-codex-client-host.md`

## Superseded

이 ticket의 Host 제품 shell과 기존 inventory-stage reconciliation은 [ADR 0010](../../adr/0010-separate-codex-app-server-connection-from-conversation-runtime.md)의 runtime foundation 범위가 아니다. 제품 shell은 foundation conformance를 통과한 뒤 별도 제품 goal에서 결정하고, ledger/inventory migration은 새 runtime spec/tickets가 안전한 generator gate와 함께 소유한다. 아래 인수 조건은 당시 계획 근거로만 남긴다.

## What It Delivers

Runtime Inspector와 분리된 최소 제품 React entrypoint가 browser-safe adapter만 사용해 Host lifecycle start를 요청하고 loading, ready, stopped와 recoverable/non-recoverable failure 상태를 데스크톱 화면에 표시한다. Recoverable failure에서는 같은 adapter의 explicit restart action만 제공한다. 실제 server, Host와 deterministic fake App Server를 통과하는 Playwright gate가 loading-to-ready, restart recovery와 강제 failure 흐름을 증명한다.

Foundation 전체가 구현된 현재 사실에 맞춰 package/app README, Runtime Harness 구현 지도, canonical development backlog와 sparse method decisions/generated inventory를 정합화한다. Product UI에서 실제 소비한 method만 `product-ui`로 승격하며 thread list, transcript, approval controls와 학업 layer를 구현된 것처럼 표시하지 않는다.

## Spec Traceability

- User stories: 1–7
- Implementation contract: `Module Responsibilities and Seams`의 제품 React shell·Runtime Harness, `Browser-safe adapter and product shell`, `Compatibility and Migration`, `Testing Decisions`의 Product shell·PR-ready regression, `Further Notes`

## Slice-Specific Constraints

- 제품 shell은 Inspector와 별도 entrypoint/workspace여야 하며 `AgentRuntimeKernel`, Runtime Inspector state, Node process API, raw `@ay-ple/runtime-codex` entry와 generated type을 import하지 않는다.
- Browser-compatible contract/client seam만 사용한다. Exact app/package name은 구현 시 정할 수 있지만 dependency direction은 바꾸지 않는다.
- Initial start와 recoverable retry는 ticket 009의 lifecycle command를 사용하고 ticket 008의 snapshot/SSE로 결과에 수렴한다. UI가 Host lifecycle을 별도로 복제하거나 HTTP mutation을 직접 구성하지 않는다.
- UI 범위는 Host connection/loading/error 표현과 recoverable state의 explicit restart action으로 제한한다. Thread list, transcript, activity card, approval/user-input control, account, toolbar와 학업 UI를 추가하지 않는다.
- Desktop workspace를 검증 대상으로 하며 mobile·small-screen 최적화를 하지 않는다.
- Existing Inspector app, Runtime Diagnostic History와 `/api/runtime/*`는 developer-only 단일-run 도구로 유지한다.
- 각 method integration은 실제 도달한 가장 먼 단계만 기록한다. Generic transport, Host-only mapping 또는 web adapter를 일괄 `product-ui`로 올리지 않는다.
- Canonical backlog의 완료 상태는 모든 acceptance criteria와 regression gate가 충족된 뒤에만 갱신한다.
- Parent spec과 ticket closeout은 `/implement` lifecycle 규칙을 따른다. 이 ticket은 별도 completion document를 만들지 않는다.

## Acceptance Criteria

- [ ] 새 product React shell이 browser-safe lifecycle command와 snapshot/SSE client만 사용해 initial start, loading, ready, stopped와 sanitized failure state를 표시한다.
- [ ] Recoverable failure와 non-recoverable failure가 서로 구분되고 recoverable state에서만 explicit restart action이 나타나 adapter command로 새 ready generation에 수렴한다.
- [ ] Shell dependency/import audit에서 Runtime Inspector state, `AgentRuntimeKernel`, Node/raw protocol/generated type 의존이 없다.
- [ ] Playwright가 real server + Host + fake child로 desktop `1440x900` loading-to-ready, explicit restart recovery와 forced non-recoverable failure를 결정적으로 검증한다.
- [ ] Product test harness가 port, temporary roots, server, Host와 child를 성공·실패 모두에서 정리한다.
- [ ] Root workspace scripts가 새 product app의 test/typecheck/build를 포함하면서 기존 Inspector E2E를 계속 실행한다.
- [ ] 관련 package/app README와 Runtime Harness 구현 지도가 Host, product adapter, product shell의 현재 경계와 검증 명령을 설명한다.
- [ ] Canonical development backlog가 실제 완료된 Headless Codex Client Host 하위 capability와 top-level 상태만 `[x]`로 갱신한다.
- [ ] Sparse method decisions가 실제 `client-host`, `web-adapter`, `product-ui` 도달 단계와 일치하고 generated inventory가 deterministic하게 재생성된다.
- [ ] Thread list/read/resume, transcript, approval UI, account, academic state와 mobile work가 구현 또는 완료된 것으로 표시되지 않는다.
- [ ] Full PR-ready regression과 Inspector/product desktop browser gate가 모두 통과한다.

## Verification

- Targeted test or command: 새 product shell workspace의 unit/Playwright command와 `npm run test -w @ay-ple/server`
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/inspector`, 기존 Inspector desktop gate, 새 product shell desktop gate
- Manual or live smoke: 데스크톱 `1440px–1920px`에서 loading, ready와 두 failure 표현을 직접 확인한다. Live Codex parity는 ticket 007의 documented opt-in command 결과를 재사용한다.

## Blocked By

- `docs/tickets/2026-07-12-headless-codex-client-host/009-browser-safe-host-commands.md` — browser-safe Host command와 same-origin 경계를 제공한다

## Starting Points

- Ticket 008–009의 browser-safe DTO, SSE client contract와 product namespace
- `apps/inspector`의 Vite/Playwright process wiring은 참고만 하고 state/component를 재사용하지 않음
- `apps/inspector/e2e/inspector-harness.ts`의 temporary process cleanup pattern
- `docs/product/ay-ple-development-backlog.md`의 운영 규칙과 Headless Codex Client Host 항목
- `packages/runtime-codex/codex-method-decisions.json`과 method inventory generator
- `docs/architecture/runtime-harness-implementation-map.md`
