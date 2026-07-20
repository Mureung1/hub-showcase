# 011 — Official SDK patch stack의 유지 비용을 측정한다

## Wayfinder ticket

- Type: research
- State: out-of-scope
- Blocked by: None

## Question

현재 ordered official SDK patch stack의 규모·소유자·regression oracle·upstream 상태는 무엇이며, 다음 채택 가능한 official source/runtime pin에서 각 patch의 생존 상태와 검증된 rebase 비용은 얼마인가?

## Resolution evidence

- Patch별 source paths, 규모, rationale, regression oracle, owner와 upstream issue/PR disposition
- 다음 후보 pin에서 clean apply 여부, unpatched RED/GREEN oracle, generated contract delta와 실제 조사 시간
- Legacy `0.144.0` raw roster와 Chat path `0.144.4` 또는 후보 pin을 같은 wire contract로 오인하지 않은 비교
- Upgrade를 실제 채택하지 않고 maintenance budget, rollback pin과 architecture 재검토 threshold의 추천안을 제시한 research asset
- Official source, release와 repository-local provenance를 우선한 인용

## Map reconciliation

- 분류: 병합
- 현재 `0.144.4` exact bundle·patch owner·source path·기존 regression oracle의 maintenance baseline은 [Codex Chat target fitness와 legacy deletion blocker를 감사한다](004-current-architecture-maintainability.md)에 흡수했다.
- 구체 후보 pin이 없는 next-pin clean apply·rebase 비용 측정은 이번 deletion checkpoint 밖이다. Upgrade owner와 후보 pin이 정해질 때 새 research ticket을 만든다.
