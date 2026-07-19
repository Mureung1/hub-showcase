# 022 — Product Skill의 native catalog admission seam을 확인한다

## Wayfinder ticket

- Type: research
- State: claimed
- Blocked by: [Adopted local-web path의 runtime disposition을 확정한다](008-product-surface-runtime-disposition.md)

## Question

Exact `0.144.4` native App Server는 loaded·enabled Skill catalog와 `skills/list`를 소유하지만 high-level official Python SDK는 이를 public method로 노출하지 않는다. First vertical이 native start 전에 canonical `SKILL.md`의 loaded·enabled membership을 확인하려면 current official public surface를 직접 재사용할 수 있는가? 그렇지 않다면 verified newer-pin upgrade, upstream-compatible public extension, exact-pin narrow port 또는 product-owned invariant로 requirement를 낮추는 선택 중 어떤 disposition이 evidence와 assumption delta에 맞는가?

## Resolution evidence

- Exact `0.144.4` `AsyncCodex` high-level API, package-root export와 public API signature tests
- Internal `AsyncCodexClient.request`, generated `SkillsListParams`·`SkillsListResponse`가 public support contract인지에 대한 source 근거
- Native App Server `skills/list` protocol·processor·primary tests의 `cwds`, `forceReload`, loaded path와 enabled-state semantics
- Missing·disabled `SkillInput`을 native resolver가 조용히 제외하는 exact source·negative tests
- Codex first-party client가 Skill catalog와 explicit Skill selection을 소비하는 방식
- 최신 official Python SDK의 exact version·commit과 high-level Skill catalog surface 유무. 최신 surface가 존재해도 current primary pin upgrade와 full conformance 비용을 별도 판정한다.
- App-managed Skill file·digest·config receipt가 native loaded·enabled membership을 대체할 때 잃는 fail-fast·drift detection guarantee
- `direct reuse | verified upgrade candidate | upstream extension | narrow port | requirement relaxation` disposition과 009가 승인할 precise assumption
- Source·primary tests가 모순되거나 wire behavior가 불명확할 때만 별도 prototype ticket을 권고하고, 022에서는 prototype·production patch를 만들지 않는 범위
