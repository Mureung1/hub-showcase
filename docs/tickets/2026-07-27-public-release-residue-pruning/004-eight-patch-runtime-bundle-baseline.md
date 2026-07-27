# 004 — Exact SDK patch stack과 production bundle을 8단계로 재고정한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-27-public-release-residue-pruning.md`

## What It Delivers

Verified production Runtime이 current product에 필요한 ordered patch `0001`–`0008`과 축소된 Python bridge만 포함한다. Managed ChatGPT login seam을 추가한 patch `0009`는 source authority, manifest와 materialized bundle에서 모두 사라지고 old nine-patch bundle은 fail closed한다.

## Spec Traceability

- User stories: 1, 3
- Implementation contract: Module Responsibilities and Seams, Interfaces and Invariants, Compatibility and Migration, Testing Decisions

## Slice-Specific Constraints

- 이 ticket은 Ticket 003에서 시작한 bridge·bundle integration sequence를 닫는다. Tracked source, patched-source manifest, production manifest와 ignored materialized bundle을 하나의 reduced identity로 맞춘다.
- `upstream/patches/0009-managed-chatgpt-login.patch`와 해당 ledger·generator·test expectation을 compatibility artifact 없이 제거한다.
- Earlier `0001`–`0008` patch의 order, exact immediate pre/postimage continuity와 turn/global behavior를 유지한다.
- Earlier router patch 안의 official login-route accounting은 이 ticket에서 재작성하지 않는다.
- Unpatched official SDK snapshot과 upstream 자체 login API를 삭제하거나 수정하지 않는다.
- Patched-source evidence와 production manifest는 documented generator·materializer를 사용해 결정적으로 재생성한다. Digest를 손으로 추측하거나 부분 수정하지 않는다.
- Production bundle은 Ticket 003의 exact tracked bridge source를 포함해야 한다.
- Old nine-patch or stale-bridge local bundle은 repair·fallback 없이 verification failure가 되어야 한다.
- Generated or ignored artifact mutation command를 shared-source verification command와 병렬 실행하지 않는다.

## Acceptance Criteria

- [ ] Ordered behavioral patch roster가 exact `0001`–`0008`이고 `0009` patch file·ledger entry·generator expectation이 제거된다.
- [ ] `manifests/patched-source.json`이 reduced stack의 deterministic stage continuity, source roster와 digest를 기록한다.
- [ ] `manifests/production-runtime-darwin-arm64.json`이 eight-patch wheel과 Ticket 003 bridge source의 exact roster·digest를 가리킨다.
- [ ] Production verifier와 synthetic fixtures가 eight-patch order를 authority로 사용하고 extra·missing·reordered patch를 거절한다.
- [ ] Old nine-patch bundle과 stale bridge bundle이 current source contract에 대해 fail closed한다.
- [ ] Reduced stack에서 official suite, response-last·bounded router, Plan interaction, model setting, standalone Skill과 provenance gates가 green이다.
- [ ] Materialized production bundle이 bridge·SDK·native version과 complete tree verification을 통과한다.
- [ ] Node actual-child, native-context와 exact local-provider product survivor behavior 및 process-group reap이 green이다.
- [ ] Source와 active manifest·tests·README ledger에서 `0009-managed-chatgpt-login`의 current reference가 0건이다.

## Verification

- Targeted test or command:
  - `npm run generate:exact-sdk -w @ay-ple/codex-chat-runtime`
  - `npm run validate:exact-sdk -w @ay-ple/codex-chat-runtime`
  - `npm run materialize:production-runtime -w @ay-ple/codex-chat-runtime -- --write-manifest`
  - `npm run validate:production-runtime -w @ay-ple/codex-chat-runtime`
  - `npm run validate:node-runtime -w @ay-ple/codex-chat-runtime`
- Repository checks:
  - `npm test`
  - `npm run typecheck`
  - `npm run build`
- Manual or live smoke:
  - External credential을 쓰는 live-provider trace는 필수가 아니다. Exact local-provider와 provider-free actual-child gate를 사용한다.

## Blocked By

- `docs/tickets/2026-07-27-public-release-residue-pruning/003-python-bridge-account-protocol-contraction.md` — Python bridge의 login·logout protocol을 제거한다

## Starting Points

- `packages/codex-chat-runtime/scripts/exact_sdk.py`
- `packages/codex-chat-runtime/scripts/test_exact_sdk.py`
- `packages/codex-chat-runtime/upstream/patches/0009-managed-chatgpt-login.patch`
- `packages/codex-chat-runtime/upstream/PATCHES.md`
- `packages/codex-chat-runtime/upstream/UPSTREAM.md`
- `packages/codex-chat-runtime/manifests/patched-source.json`
- `packages/codex-chat-runtime/manifests/production-runtime-darwin-arm64.json`
- `packages/codex-chat-runtime/scripts/production_bundle.py`
- `packages/codex-chat-runtime/src/production-bundle.ts`
- `packages/codex-chat-runtime/src/production-bundle.unit.test.ts`
