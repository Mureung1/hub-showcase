# 011 — Official SDK patch stack의 유지 비용을 측정한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: None

## Question

현재 ordered official SDK patch stack의 규모·소유자·regression oracle·upstream 상태는 무엇이며, 다음 채택 가능한 official source/runtime pin에서 각 patch의 생존 상태와 검증된 rebase 비용은 얼마인가?

## Resolution evidence

- Patch별 source paths, 규모, rationale, regression oracle, owner와 upstream issue/PR disposition
- 다음 후보 pin에서 clean apply 여부, unpatched RED/GREEN oracle, generated contract delta와 실제 조사 시간
- Legacy `0.144.0` raw roster와 Chat path `0.144.4` 또는 후보 pin을 같은 wire contract로 오인하지 않은 비교
- Upgrade를 실제 채택하지 않고 maintenance budget, rollback pin과 architecture 재검토 threshold의 추천안을 제시한 research asset
- Official source, release와 repository-local provenance를 우선한 인용
