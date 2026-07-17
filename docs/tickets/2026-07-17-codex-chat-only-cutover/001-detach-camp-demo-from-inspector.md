# 001 — Camp demo를 Inspector에서 분리한다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement (current session)

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

## Preflight Evidence

- Starting SHA: `a4c5d7e41ee75bd4d9e5addd3f0a7df765ab9b5d`
- 시작 시점의 `codex/chat-shell-cutover` working tree는 clean committed state였다.

| 확인 표면 | 수행한 read-only 확인 | 결과 |
| --- | --- | --- |
| Repository production caller와 package graph | Tracked tree에서 legacy package/path/API와 camp command를 `rg`로 검색하고 `npm ls @ay-ple/inspector @ay-ple/runtime-core @ay-ple/runtime-fake @ay-ple/runtime-codex --all`을 실행했다. | Parent spec이 소유한 Server·Inspector·root legacy graph와 이 ticket이 분리할 camp tooling edge만 확인했다. Published package 또는 owner가 불명확한 repository consumer는 0건이었다. |
| CI와 deploy | `git ls-files`의 workflow·Docker·compose·hosting·deploy filename roster를 확인하고 발견된 `.github/workflows/auto-merge.yml`을 읽었다. | PR merge automation 외 build/deploy consumer는 없고 tracked deploy configuration도 없다. Known 0건, unresolved 0건이다. |
| Active docs와 owner-known workflow | `docs/README.md`가 분류한 active docs, root·package·camp README와 root `package.json`의 current command reference를 검색했다. Branch·remote도 current clone의 documented fork workflow와 대조했다. | Legacy 명령은 모두 이 repository 내부의 current workflow이며 parent spec의 tracked cutover 범위에 포함된다. 별도 운영 job이나 unresolved owner는 0건이다. |
| Current process와 configuration | Repository path, workspace package와 camp path를 기준으로 `ps`를 확인했다. Literal `.env`, `apps/server/.env`, `apps/inspector/.env`의 존재와 active environment의 relevant key name만 검사했다. | 실행 중인 project process가 없었다. 세 `.env`가 없고 `CODEX_CHAT_*`, `CODEX_RUNTIME_*`, `RUNTIME_HISTORY_*`, `RUNTIME_FAKE_*` key도 0건이었다. |

결론: 이 spec이 승인한 current clone·tracked CI/deploy·active docs·current process/configuration·repository-owned workflow 범위에서 known legacy consumer 0건, unresolved consumer 0건이므로 cutover graph를 시작할 수 있다. Exact allowlist 밖 local data content, 광범위한 machine surface와 사용자 questionnaire로 범위를 확장하지 않았으며, 이 결론을 승인 범위 밖 모든 외부 system에 대한 전수 조사로 해석하지 않는다.

## Starting Points

- `package.json`
- `apps/inspector/package.json`
- `apps/inspector/playwright.config.ts`
- `apps/inspector/e2e/vite-test-server.ts`
- `artifacts/camp-demo/e2e/camp-demo.spec.mts`
- `artifacts/camp-demo/export-pdf.mts`
- `artifacts/camp-demo/README.md`
- `docs/wayfinding/chat-shell-cutover-readiness/assets/016-cutover-execution-gates.md`
