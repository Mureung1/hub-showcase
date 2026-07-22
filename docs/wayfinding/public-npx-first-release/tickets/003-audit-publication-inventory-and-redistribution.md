# 003 — 공개 inventory와 provenance gap을 조사한다

## Wayfinder ticket

- Type: research
- State: resolved
- Blocked by: None

## Question

첫 public repository, npm package와 Runtime release 후보에 포함되는 first-party source, generated·vendored OpenAI SDK, Git submodule, brand asset, standalone CPython, native Codex·`rg`·`zsh`, wheels와 npm dependency의 exact inventory·source·version·current license/NOTICE evidence는 무엇인가? Missing provenance, ambiguous ownership, absent license metadata, secret·private data와 재생성 또는 제외 검토가 필요한 gap을 machine-readable inventory와 human review 목록으로 어떻게 분류할 것인가? 실제 재배포 조건과 publication 허용 판정은 [Third-party 재배포 evidence와 release notice gate를 확정한다](003a-third-party-redistribution-evidence.md)가 소유한다.

## Answer

감사 기준 revision `022bd4e71f2f2f515864f4a77fafb96e35a3a00b`의 tracked source 493 entries, npm 외부 package records 139개, exact OpenAI SDK source·8-patch derivation, verified macOS arm64 Runtime closure, raster assets 11개와 repository history·ignored private state의 gap을 조사했다. Exact 수치·digest·잠정 분류는 [machine-readable inventory](../assets/publication-inventory-index.json), 판단 근거와 publication blocker handoff는 [human review audit](../assets/publication-inventory-audit.md)가 소유한다.

현재 public `npx` package와 AY-PLE first-party root license는 없으며, verified Runtime도 archive boundary와 native `codex-code-mode-host`·`rg`·`zsh`의 component별 license·NOTICE evidence가 미완성이다. 따라서 이 결과는 publication 허가가 아니다. Third-party 실제 재배포 조건과 fail-closed notice checklist는 [Ticket 003a](003a-third-party-redistribution-evidence.md), public clean snapshot·first-party license·brand provenance는 [Ticket 005](005-public-repository-authority-and-license.md), package·Runtime·publication artifact gate는 Tickets 006·007·015로 넘겼다.
