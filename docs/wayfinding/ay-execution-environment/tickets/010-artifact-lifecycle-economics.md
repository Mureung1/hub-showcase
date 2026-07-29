# 010 — Work environment artifact의 lifecycle·비용을 확정한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [AY Python work environment의 구조를 검증한다](007-python-work-environment.md), [AY Node·common CLI work environment의 구조를 검증한다](008-node-cli-work-environment.md), [Turn 중 dependency install과 sandbox 정책을 결정한다](009-install-mutation-sandbox-policy.md)

## Question

선택한 rich work environment를 current materializer·verifier와 미래 App install/update에 결합할 때 artifact identity, dependency lock, cache, rebuild·rollback, startup verification 비용과 license·NOTICE 책임은 어떻게 달라지는가?

## Expected evidence

- Codex transport closure와 AY work dependency closure의 manifest·provenance ownership
- materialization download, two-clean offline install, complete-tree verification과 startup cost 변화
- runtime version, environment profile revision과 App version binding 대안
- corruption repair, atomic publish·rollback과 old artifact retention의 current·future 구분
- native binary·wheel의 supported platform matrix, SBOM·license·NOTICE gap
- 중단한 public release architecture에서 재사용할 invariant와 현재 복원하지 않을 infrastructure
