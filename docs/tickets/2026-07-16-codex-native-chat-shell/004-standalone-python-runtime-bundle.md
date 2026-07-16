# 004 — Package the verified patched Python runtime bundle

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[Codex-native Chat Shell 첫 수직 흐름](../../specs/2026-07-16-codex-native-chat-shell.md)

## What It Delivers

Ticket 003까지 ordered behavioral patch가 적용된 deterministic SDK wheel을 reviewed macOS arm64 standalone CPython, dependency wheel set과 exact native Codex runtime wheel에 offline 설치할 수 있는 package-private production bundle로 만든다. Production이 system Python, ambient `PATH`, source submodule이나 network fallback 없이 exact patched runtime을 발견하고 검증할 수 있는 canonical production manifest를 제공한다.

## Spec Traceability

- User stories: 5, 6
- Implementation contract: Exact Official SDK Artifact, Source-Guided Router Corrections, Bridge Protocol and Lifecycle

## Slice-Specific Constraints

- 첫 target은 macOS arm64, standalone CPython `3.10.18` build `20250818`, native runtime `0.144.4`다. 다른 platform 지원을 암시하지 않는다.
- CPython archive, native runtime wheel, dependency wheel, installed environment와 cache는 tracked하지 않고 package-local ignored artifact로 둔다.
- Download가 필요한 materialization과 이미 받은 artifact의 non-mutating verification을 별도 command로 분리한다.
- 모든 artifact는 reviewed file name, size와 SHA-256으로 검증하며 offline install roster가 manifest와 exact 일치해야 한다.
- Ticket 001 unpatched manifest는 immutable provenance로 유지하고, production manifest는 ordered router+bounds patch digest와 patched wheel digest를 별도로 소유한다.
- Production startup API나 Python bridge는 아직 구현하지 않는다. 일반 root `build`는 bundle을 내려받거나 재생성하지 않는다.

## Acceptance Criteria

- [ ] Ticket 003의 complete ordered router+bounds patch stack이 적용된 SDK wheel을 source epoch에서 두 번 build해 identical name/size/digest를 얻는다.
- [ ] Reviewed standalone CPython, exact native runtime wheel과 complete dependency wheel set이 digest 검증 뒤 materialize된다.
- [ ] Network가 차단된 clean environment에서 production wheel roster만으로 SDK를 설치하고 Python/runtime version을 확인한다.
- [ ] Canonical production manifest가 platform, Python/runtime version, source/unpatched manifest digest, ordered patch digest와 모든 wheel name/size/digest를 상대 경로로 기록한다.
- [ ] Clean subprocess import가 installed `openai_codex` source에 Ticket 003 manifest의 complete ordered patch stack이 포함됐고 unpatched source나 submodule을 import하지 않음을 digest와 module path로 증명한다.
- [ ] Missing, extra, renamed, truncated, wrong patch order 또는 digest-mismatched artifact를 verifier가 fail closed한다.
- [ ] 두 clean materialization이 identical manifest와 installed file roster를 만들고 tracked file을 수정하지 않는다.
- [ ] Package README가 download boundary, cache/ignored path, offline verification과 unsupported platform을 설명한다.
- [ ] Source·Standards·Spec review findings가 0건이다.

## Verification

- Targeted test or command: package의 patched-wheel build, runtime materialize, offline-install/import and verify commands
- Repository checks: runtime workspace typecheck/build, non-mutating local Markdown link check, `git diff --check`
- Manual or live smoke: bundled `python`과 `codex --version`만 확인하며 provider/auth는 사용하지 않는다.

## Blocked By

- [003-bounded-python-sdk-routing.md](003-bounded-python-sdk-routing.md) — Bound official SDK notification routing

## Starting Points

- Ticket 001 immutable unpatched manifest와 Ticket 003 ordered patch ledger
- `references/openai-codex/sdk/python-runtime/`
- `prototype/codex-python-sdk-reuse@3b3fa9e0:spikes/openai-codex-python-sdk-reuse/python/package_exact_sdk.py`
