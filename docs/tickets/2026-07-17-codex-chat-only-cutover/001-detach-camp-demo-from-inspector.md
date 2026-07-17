# 001 — Camp demo를 Inspector에서 분리한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[Codex Chat-only runtime cutover](../../specs/2026-07-17-codex-chat-only-cutover.md)

## What It Delivers

Static camp demo의 serve, export, unit, typecheck와 desktop Playwright ownership을 Inspector workspace에서 분리한다. Root camp command는 Server, Runtime Harness와 Inspector process 없이 presentation artifact만 실행하며, 뒤이은 tracked cutover가 Inspector 전체를 삭제해도 camp demo는 독립적으로 유지된다.

첫 tracked 변경 전에는 starting SHA와 repository·CI/deploy·active docs·현재 process/configuration·owner-known workflow의 legacy consumer 여부를 read-only로 확인한다. Known 또는 unresolved consumer가 발견되면 이 ticket과 전체 cutover graph를 시작하지 않는다.

## Spec Traceability

- User stories: 1, 4, 8
- Implementation contract: `Module Responsibilities and Seams`, `Root command와 artifact contract`, `Data and State Flow > Cutover implementation slicing`의 precondition과 Slice 1, consumer 관련 `Failure Behaviour`

## Slice-Specific Constraints

- Camp demo의 product-flow, deck content, visual behavior와 desktop validation target은 바꾸지 않는다. Current-vs-history operational copy만 ownership 변경에 맞게 갱신할 수 있다.
- Camp tooling과 tests는 `apps/inspector/**`를 import하거나 `@ay-ple/inspector`, Server, Runtime Harness process를 실행 전제로 삼지 않는다.
- `npm run demo`는 live runtime 없이 static camp demo convenience command로 동작한다.
- Inspector source, 네 legacy workspace와 ignored local state는 이 ticket에서 삭제하지 않는다.
- Preflight는 exact deletion allowlist 밖 local data의 content를 열람하거나 광범위한 machine scan으로 확장하지 않는다.
- Mobile과 small-screen 대응은 포함하지 않는다. Browser 검증은 1440px급 desktop workspace를 사용한다.

## Acceptance Criteria

- [ ] Mutation 전 preflight가 starting SHA와 known/unresolved legacy consumer 0건을 기록하거나, consumer가 있으면 아무 tracked 변경 없이 block한다.
- [ ] Camp serve, export, unit, typecheck와 Playwright config/helper의 owner가 artifact/root tooling이며 Inspector package가 아니다.
- [ ] `npm run demo`와 `npm run serve:camp-demo`가 Server·Harness·Inspector 없이 static artifact만 시작한다.
- [ ] Camp unit, typecheck, desktop E2E와 PDF export가 독립적으로 green이다.
- [ ] Inspector는 Ticket 002 전까지 유지되고 기존 Harness behavior를 의도치 않게 변경하지 않는다.
- [ ] Root orchestration이 camp suite를 한 번만 호출하며 Inspector script를 우회 호출하지 않는다.

## Verification

- Targeted test or command: `npm run test:camp-demo`, `npm run test:camp-demo:e2e`, `npm run export:camp-demo`, artifact-local camp typecheck command
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/inspector`, `npm run lint -w @ay-ple/chat-shell`, `git diff --check`
- Manual or live smoke: `npm run serve:camp-demo`로 deck과 product-flow가 열리는지 확인한 뒤 bounded shutdown한다. Live provider smoke는 수행하지 않는다.

## Blocked By

None — can start immediately.

## Starting Points

- `package.json`
- `apps/inspector/package.json`
- `apps/inspector/playwright.config.ts`
- `apps/inspector/e2e/vite-test-server.ts`
- `artifacts/camp-demo/e2e/camp-demo.spec.mts`
- `artifacts/camp-demo/export-pdf.mts`
- `artifacts/camp-demo/README.md`
- `docs/wayfinding/chat-shell-cutover-readiness/assets/016-cutover-execution-gates.md`
