# 001 — Materialize the exact official Python SDK baseline

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[Codex-native Chat Shell 첫 수직 흐름](../../specs/2026-07-16-codex-native-chat-shell.md)

## What It Delivers

Official `openai/codex` source commit `8c68d4c87dc54d38861f5114e920c3de2efa5876`에서 exact runtime `0.144.4`에 정렬된 official Python SDK source, generated contract, lock과 deterministic SDK wheel을 재현하는 새 `@ay-ple/codex-chat-runtime` workspace baseline을 만든다. 이 ticket은 standalone CPython/native runtime bundle을 만들지 않고 exact SDK distribution과 Apache-2.0 provenance까지만 독립 검증한다.

## Spec Traceability

- User stories: 6
- Implementation contract: Exact Official SDK Artifact, Compatibility and Migration

## Slice-Specific Constraints

- `references/openai-codex`는 generation/source oracle일 뿐 production runtime dependency가 아니다.
- Prototype branch의 script를 cherry-pick하거나 wholesale copy하지 않는다. 검증된 mechanics만 새 owner에 다시 작성한다.
- Committed source만 `git archive`로 export하며 dirty oracle, untracked/ignored file과 absolute path를 거부한다.
- Exact adaptation은 stale `openai-codex-cli-bin==0.137.0a4` pin, fixed resolver cutoff와 aligned official test expectation을 occurrence-count guard로 바꾼 뒤 official generator를 실행한다.
- Generated authority는 `generated/v2_all.py`, `generated/notification_registry.py`, `api.py`의 generated block 전체다.
- SDK distribution version은 upstream `0.0.0.dev0`을 유지한다. `0.144.4`는 generated contract와 native runtime pin이다.
- `LICENSE`, `NOTICE`, source/tag, runtime/Python/tool pin, generated/lock/wheel digest를 보존한다. `PATCHES.md`는 아직 behavioral patch가 없는 baseline으로 시작한다.
- SDK source/lock/manifest는 tracked할 수 있지만 wheel, installed environment와 cache는 package-local ignored artifact다.
- 일반 root `build`는 download/materialization을 실행하지 않는다. Exact generation은 별도 conformance command다.

## Acceptance Criteria

- [ ] 새 private ESM workspace가 `.`, `./contract`, `./testing`의 future export boundary와 Python artifact commands를 수용하되 아직 speculative runtime API를 구현하지 않는다.
- [ ] Source materialization이 exact SHA/tag와 clean oracle을 검증하고 필요한 upstream relative topology 및 Apache `LICENSE`/`NOTICE`를 보존한다.
- [ ] Exact `openai-codex-cli-bin==0.144.4`에서 official generator가 세 authority 위치와 lock을 재생성한다.
- [ ] 두 clean run이 identical generated source, lock, SDK wheel과 canonical unpatched manifest를 만든다.
- [ ] Complete aligned official Python unit suite와 Ruff가 real-provider test를 명시적으로 skip한 상태에서 green이다.
- [ ] Verifier는 tracked file을 수정하지 않고 source/generated/package/provenance drift를 탐지한다.
- [ ] Package README와 upstream ledger가 생성·검증 명령, ignored artifact, live gate 경계를 설명한다.
- [ ] Source·Standards·Spec review findings가 0건이다.

## Verification

- Targeted test or command: package의 source materialize/verify/wheel/Python suite/Ruff commands
- Repository checks: `npm run typecheck -w @ay-ple/codex-chat-runtime`, `npm run build -w @ay-ple/codex-chat-runtime`, non-mutating local Markdown link check, `git diff --check`
- Manual or live smoke: 없음. Provider/auth와 standalone runtime bundle을 사용하지 않는다.

## Blocked By

None — can start immediately.

## Starting Points

- `references/openai-codex/sdk/python/`
- `references/openai-codex/sdk/python-runtime/`
- `references/openai-codex/sdk/python/scripts/update_sdk_artifacts.py`
- `prototype/codex-python-sdk-reuse@3b3fa9e0:spikes/openai-codex-python-sdk-reuse/python/prepare_exact_sdk.py`

