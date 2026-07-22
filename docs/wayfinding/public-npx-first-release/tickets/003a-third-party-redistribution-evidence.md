# 003a — Third-party 재배포 evidence와 release notice gate를 확정한다

## Wayfinder ticket

- Type: research
- State: resolved
- Blocked by: [공개 inventory와 provenance gap을 조사한다](003-audit-publication-inventory-and-redistribution.md)

## Question

003의 exact inventory에서 public source와 binary Runtime archive로 실제 재배포할 항목마다 어떤 upstream license·NOTICE·attribution·source 제공 또는 보존 조건을 충족해야 하는가? First-party root license와 분리해 어떤 파일을 원문 보존, 재생성, archive 내 `licenses/`·root `NOTICE`·`THIRD_PARTY_NOTICES`·SBOM·artifact provenance에 포함하거나 release에서 제외해야 하며, 검토되지 않은 항목이 publication을 fail-closed하도록 어떤 evidence checklist를 만들 것인가?

## Answer

OpenAI source·patched SDK, native `codex`·`codex-code-mode-host`·`rg`·patched zsh, standalone Python·wheels·vendored package와 npm source·browser bundle의 exact license·NOTICE·source-availability evidence를 조사했다. 판정과 artifact별 logical material contract, canonical component roster schema, `REDIST-01`부터 `REDIST-12`까지의 blocking checklist는 [Third-party 재배포 evidence와 release notice gate](../assets/third-party-redistribution-evidence.md)에 고정했다.

조사한 top-level license에는 조건부 재배포 경로가 있지만 현재 candidate는 release-cleared가 아니다. Patched OpenAI source의 per-file modification notice, native Rust closure, `rg`·zsh 원문 license, stripped Python의 matching `PYTHON.json`·license tree, pip vendor notice, browser bundle origin·license set이 닫히기 전에는 publication을 fail-closed한다. First-party root license·public source allowlist는 Ticket 005, npm composition은 Ticket 006, Runtime archive layout·verifier는 Ticket 007, 자동 publication gate는 Ticket 015로 넘겼다.

여기서 `resolved`는 opaque Rust·vendored dependency closure가 cleared됐다는 뜻이 아니다. Exact closure를 canonical roster로 생성해 검토하지 못하면 component 전체가 `blocked`가 되고, 후속 설계·구현은 이 gate를 완화할 수 없다.
