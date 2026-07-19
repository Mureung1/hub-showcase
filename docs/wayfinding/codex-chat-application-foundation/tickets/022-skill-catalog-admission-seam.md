# 022 — Product Skill의 native catalog admission seam을 확인한다

## Wayfinder ticket

- Type: research
- State: resolved
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

## Answer

[Skill catalog admission seam 조사](../assets/skill-catalog-admission-seam.md)에 exact `0.144.4` Python SDK, native App Server, first-party TUI와 2026-07-19 기준 latest official Python SDK를 primary source로 대조했다.

Native `skills/list`는 `cwd`, `forceReload`, canonical loaded path, enabled state와 load error를 authoritative하게 제공하며 first-party TUI도 이 catalog에서 enabled exact path를 고른 뒤 structured `SkillInput`을 만든다. 반면 current high-level `Codex`·`AsyncCodex`에는 catalog read method가 없고, internal generic request와 generated `SkillsList*` model은 wire call 재료일 뿐 public support contract가 아니다. Missing·disabled structured Skill이 native resolver에서 오류 없이 제외되므로 `SkillInput` receipt만으로 Recipe injection을 증명할 수도 없다.

Latest stable `python-v0.144.4`와 조사 시점 official `main`에도 같은 high-level gap이 남아 있어 verified upgrade candidate는 없다. Durable target은 native semantics를 그대로 올리는 upstream-compatible public extension이고, 009가 fail-fast admission을 유지하면서 upstream release를 기다릴 수 없다고 승인할 때만 exact-pin one-method narrow port를 bounded fallback으로 사용한다. App-managed file·digest receipt만으로 requirement를 낮추는 선택은 native discovery·disablement·load error·cache drift의 pre-start detection을 잃는다.

Protocol·processor·primary tests, silent-skip negative tests와 first-party consumption이 일치하므로 별도 wire prototype은 필요하지 않다. 022는 production patch나 runtime test·build를 수행하지 않았으며, 최종 tradeoff와 precise implementation assumption은 009가 승인한다.
