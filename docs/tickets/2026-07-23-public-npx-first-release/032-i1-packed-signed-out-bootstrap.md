# 032 — I1 — Packed signed-out bootstrap을 black-box로 검증한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

G1이 수락한 exact application `.tgz`를 repository source import 없이 설치하고, pre-seeded exact verified Runtime cache와 isolated roots에서 public host를 black-box로 실행한다. Fresh signed-out account read와 Browser login offer, mutation-before-preflight 0, dynamic same-origin host, normal/signal shutdown과 full process cleanup을 provider/public identity 없이 증명한다.

## Spec Traceability

- User stories: 2–6, 8, 9, 16, 17
- Implementation contract: `apps/ay-ple` public package/bin, production host/root invariants와 RuntimeResolver boundary
- Implementation decisions: `Parallel delivery contract`의 `G1 → I1`
- Testing decisions: `packed_black_box(I1)` evidence class, host tests와 package fixture exclusion

## Slice-Specific Constraints

- 입력 application은 G1 receipt가 가리키는 exact `.tgz` byte 하나다. Repository workspace source, symlinked package, rebuilt tarball 또는 moving version을 대신 사용하지 않는다.
- Network/provider identity를 검증하지 않는다. Exact Runtime cache를 G1-bound descriptor에 맞춰 미리 seed하고 resolver는 cache complete-tree를 검증해야 한다.
- Isolated packageRoot/appDataRoot/workspace parent/npm roots를 사용하고 ambient `HOME`, global Codex auth/cache/config와 repository cwd에 의존하지 않는다.
- Fresh signed-out `account/read`와 Browser login offer까지만 검증한다. OAuth completion, provider Turn, Ready나 public delivery success를 합성하지 않는다.
- Unsupported preflight, corrupt/missing resources와 descriptor mismatch에서 Browser/OAuth/workspace mutation 전에 fail closed해야 한다.
- Missing/corrupt package resource tamper case는 G1 candidate 자체가 아니라 명시적인 derived negative fixture로 표기하고 원본 RC digest와 분리한다.
- Public `.tgz`에 test hook, deterministic adapter, fixture 또는 evidence recorder를 추가하지 않는다. Harness는 repository-only I owner path에 둔다.
- Host의 dynamic loopback, secondary-instance join, Browser open failure, listener refusal, normal close와 `SIGHUP`/`SIGINT`/`SIGTERM` cleanup을 black-box process boundary에서 검증한다.
- 031 G1 acceptance가 기록된 integration `handoffSha`에서 branch를 만들고 sibling merge/cherry-pick을 하지 않는다. Shared delta는 C-owned serial path다.
- 전체 lane writer 최대 3명, worktree writer 1명, fixed-SHA independent review를 지킨다. External publication writes와 live OAuth/provider interaction은 0이다.

## Acceptance Criteria

- [ ] G1 receipt의 exact `.tgz`를 fresh isolated npm prefix/cache에 설치하고 exposed `ay-ple` bin 하나만 실행한다.
- [ ] Package metadata, packed file roster와 sidecar/candidateDigest가 G1 accepted byte와 일치한다.
- [ ] Pre-seeded exact Runtime cache가 descriptor와 complete-tree 검증을 통과하며 download, moving fallback과 global Runtime 탐색이 0건이다.
- [ ] Signed-out fresh account read와 actionable Browser login offer가 same-origin UI에 표시되고 OAuth success를 추측하지 않는다.
- [ ] Preflight 완료 전 appData/workspace/credential mutation과 Browser open이 0이다.
- [ ] Unsupported lane, descriptor/cache mismatch와 missing/corrupt derived resource fixture가 safe actionable failure로 끝난다.
- [ ] Dynamic `127.0.0.1:<port>`, private local origin, secondary-instance behavior와 Browser-open failure가 public host contract를 지킨다.
- [ ] Normal close, `SIGHUP`, `SIGINT`, `SIGTERM` 뒤 listener, lock, Node/Python/native descendants가 bounded하게 정리된다.
- [ ] Repository source import/test hook 없이 검증되고 public tarball의 forbidden harness/fixture roster가 0건이다.
- [ ] Evidence가 public/provider identity나 Ready를 주장하지 않고 exact G1 candidateDigest를 참조한다.

## Verification

- Black-box: fresh temp install에서 exact `.tgz` bin 실행, signed-out bootstrap와 login offer capture
- Host lifecycle: dynamic origin, secondary instance, Browser-open/listener failure와 normal/three-signal process-tree cleanup
- Root/mutation: isolated roots, ambient/global decoy, preflight-before-mutation과 no-workspace checks
- Package: `npm pack` file roster, forbidden test hook/fixture scan, G1 sidecar/candidateDigest equality
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`

## Blocked By

- [031-g1-coordinator-rc-assembly-acceptance.md](031-g1-coordinator-rc-assembly-acceptance.md) — G1 — Fixed-SHA RC assembly를 coordinator가 수락한다

## Starting Points

- 031 G1 acceptance receipt와 retained exact `.tgz`/Runtime cache artifacts
- `scripts/test-product-entrypoint.mts`
- `apps/server/src/testing/codex-chat-test-support.ts`
- `apps/server/src/testing/product-shutdown.actual.ts`
- `packages/codex-chat-runtime/src/testing-process-tree.ts`
- `apps/chat-shell/e2e/chat-shell-harness.ts`
- Predecessor-created public `apps/ay-ple` bin과 descriptor-only Runtime resolver

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `I1` / owner `I` |
| owner | Integration/QA lane writer 1명 |
| branch/worktree | `codex/public-preview-i1-packed-bootstrap` / `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/i1-packed-bootstrap` |
| handoffSha | G1 acceptance/closeout가 integration에 기록되고 gates가 green인 coordinator-recorded immutable full SHA. G1 artifact digest와 혼동하거나 SHA를 추측하지 않는다. |
| writablePaths | `apps/chat-shell/e2e/**`; `docs/tickets/2026-07-23-public-npx-first-release/032-i1-packed-signed-out-bootstrap.md` |
| consumedContracts | G1 exact tgz/candidate receipt; H1 public host; D1 resolver/cache; R account read; package/root/lifecycle invariants |
| predecessorEvidence | 031 `LOCAL_RC_ACCEPTED`, retained artifact paths/digests, exact Runtime cache descriptor와 independent review |
| requiredChecks | Packed black-box bootstrap, lifecycle/process-tree matrix, root/mutation isolation, package forbidden-roster scan, root four, docs links, `git diff --check` |
| reviewOwner | I1 author가 아닌 독립 black-box QA/process reviewer |
| handoffArtifact | `i1-packed-black-box-handoff.json`: G1 candidateDigest, installed tgz digest, commands/tool versions, signed-out and lifecycle trace roster, derived-fixture labels |
| delivery topology | Sibling merge/cherry-pick 금지; coordinator-only `--no-ff`; active lane writer 최대 3명; shared delta는 C 소유 |
| external writes | 0. No publication write, live OAuth completion or provider request. |
