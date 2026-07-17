# 002 — Tracked repository를 Codex Chat-only graph로 수축한다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[Codex Chat-only runtime cutover](../../specs/2026-07-17-codex-chat-only-cutover.md)

## What It Delivers

Server mixed composition, 네 legacy workspace, executable runtime-ownership spike, root command/dependency edge, lockfile와 active documentation을 하나의 merge/revert 가능한 tracked cutover range에서 제거한다. Root `npm run dev`는 Server와 Chat Shell만 시작하고, repository의 source/build/install/navigation graph는 Codex Chat만 maintained runtime으로 표현한다.

Current Chat의 browser-safe contract, native identity·streaming·terminal·interrupt behavior, actual process lifecycle, exact `0.144.4` runtime bundle과 Server의 local `.env`·`PORT` startup behavior는 보존한다. 일곱 local residue root의 permanent cleanup은 Ticket 004 전까지 수행하지 않는다.

## Spec Traceability

- User stories: 1, 2, 3, 4, 7
- Implementation contract: `Module Responsibilities and Seams`, `Interfaces and Invariants > 보존할 Codex Chat contract`, `Root command와 artifact contract`, `Current documentation과 history invariant`, `Data and State Flow > Product execution flow`과 Slice 2, `Compatibility and Migration`

## Slice-Specific Constraints

- 이 ticket은 넓지만 하나의 wiring cause cluster를 제거하는 atomic contraction이다. Package별 또는 docs-only implementation ticket으로 나누지 않는다. Current `codex/chat-shell-cutover` branch에서 focused checkpoint commit을 만들 수 있지만 최종 range는 함께 merge/revert 가능해야 한다.
- `apps/inspector/**`, `packages/runtime-core/**`, `packages/runtime-fake/**`, `packages/runtime-codex/**`, tracked `spikes/codex-runtime-ownership/**`와 Server/root/lock 연결 edge를 함께 제거한다. Compatibility export, alias, redirect와 executable archive를 남기지 않는다.
- `createServerApplication()`이 유일한 Server application composition이다. `/api/runtime/*`, `/api/health`, generic CORS, legacy persistence/SSE/status/capability/parity surface를 Chat alias로 바꾸지 않는다.
- Root `dev`는 exact Chat Origin과 Server+Chat Shell만 소유한다. `dev:chat-shell`, Inspector lint/dev, legacy smoke/parity/generation command를 남기지 않는다.
- Server entrypoint는 caller environment 우선, local `.env` fallback, `PORT` 미지정 시 `3000` 동작을 유지한다. Origin-only와 valid six-root canonical dev status도 spec의 exact behavior를 지킨다.
- Lockfile은 survivor manifests에서 재생성하고 손으로 편집하지 않는다. Root build는 세 survivor `dist`만 literal-path clean build한다.
- Current docs는 새 Chat-only ADR과 survivor implementation map을 owner로 삼는다. Historical ADR/spec/ticket/Wayfinder/static evidence의 당시 본문은 history classification 또는 cutover banner 아래 보존한다.
- Legacy test를 filename, fixture literal 또는 test count 기준으로 이관하지 않는다. 삭제가 survivor regression을 드러낼 때만 current Chat vocabulary와 가장 강한 seam에 최소 test를 추가한다.
- `packages/codex-chat-runtime/.artifacts`와 root `.gitignore`의 `.ay-ple/` 보호 규칙을 유지한다. 일곱 local residue root에는 permanent deletion, migration 또는 recovery copy를 수행하지 않고 Ticket 003의 safety inventory 대상으로 남긴다. Target-local `.gitignore` 삭제 뒤 일부 child가 untracked로 보인다는 이유로 새 ignore rule을 추가하지 않는다. Runtime source, ordered patches와 manifest 변경은 scope drift다.
- General Server state refactor, interrupt redesign, second engine abstraction과 unrelated cleanup을 포함하지 않는다.

## Acceptance Criteria

- [ ] 네 legacy workspace와 tracked `spikes/codex-runtime-ownership/**`가 Git index와 npm workspace/install graph에서 사라진다.
- [ ] Server에는 Chat application lifecycle과 `/api/codex-chat/*`만 남고 legacy composition, routes, stores, helpers, fixtures와 dependencies가 없다.
- [ ] Root `npm run dev`가 Server+Chat Shell만 시작하며 final root command roster가 spec의 survivor/camp contract와 일치한다.
- [ ] Regenerated `package-lock.json`과 `npm ls --all`이 세 survivor workspace와 필요한 artifact-local camp tooling만 해석한다.
- [ ] Current Chat status, HTTP/NDJSON, native identity, interrupt, disconnect와 shutdown invariant가 유지된다.
- [ ] Canonical entrypoint test가 origin-only `invalid_configuration`, valid six-root `configured`, local `.env` 우선순위와 `PORT=3000` fallback을 검증한다.
- [ ] 새 Chat-only ADR, renamed survivor implementation map, active product/architecture/package docs와 navigation이 current topology를 설명하고 deleted current owner link가 없다. Generated legacy method inventory는 redirect/archive copy 없이 삭제된다.
- [ ] Historical allowlist 밖 production source, manifest, current docs와 executable command에 legacy owner·route·pin residual이 없다.
- [ ] Exact Chat runtime source, `0.144.4` pin, patch stack, production manifest와 ignored bundle bytes가 바뀌지 않는다.
- [ ] Permanent-delete operator가 실행되지 않고 일곱 local residue root가 Ticket 003의 safety inventory 대상으로 남는다.

## Verification

- Targeted test or command: `npm install`, `npm ls --all`, Server/Chat Shell targeted suites, `npm run test:dev-entrypoint`, `npm run check:docs-links`, tracked legacy-root `git ls-files` zero check
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run test:e2e`, `npm run export:camp-demo`, `git diff --check`
- Manual or live smoke: Canonical entrypoint behavior는 automated gate로 검증한다. Live provider OAuth와 permanent local deletion은 수행하지 않는다.

## Blocked By

- [001-detach-camp-demo-from-inspector.md](001-detach-camp-demo-from-inspector.md) — Camp demo를 Inspector에서 분리한다

## Starting Points

- `apps/server/src/server.ts`
- `apps/server/package.json`
- `apps/server/src/server.test.ts`
- `apps/server/src/server-startup.test.ts`
- `apps/server/src/codex-chat-lifecycle.test.ts`
- `package.json`
- `package-lock.json`
- `docs/architecture/runtime-harness-implementation-map.md`
- `docs/architecture/codex-app-server-method-inventory.md`
- `docs/adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md`
- `docs/product/ay-ple-development-backlog.md`
- `docs/wayfinding/chat-shell-cutover-readiness/assets/014-legacy-removal-manifest.md`
