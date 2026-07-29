# 005 — App host와 AY work environment의 ownership seam을 정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [이번 effort의 support envelope와 성공 조건을 결정한다](004-target-support-envelope.md)

## Question

App와 product-owned child process를 실행하는 Node·Server dependency, Codex transport를 위한 Python·SDK·native binary, AY가 작업에 사용하는 Python·Node·CLI는 어떤 Module과 artifact가 소유해야 하며 caller와 actual AY command가 알아야 할 최소 Interface는 무엇인가?

## Expected evidence

- App Host Environment, Codex Transport Runtime과 AY Work Environment의 responsibility table
- Interaction MCP 같은 product-owned child entrypoint와 AY가 임의로 실행하는 command의 ownership 분리
- 하나의 verified bundle 내부 분리, sibling toolchain artifact, host prerequisite 재사용 대안 비교
- Bridge-private dependency가 AY import surface를 오염하거나 반대로 AY package가 bridge를 깨뜨리지 않는 seam
- `process.execPath`, system `/usr/bin`, user-global package와 appData Runtime 각각의 허용·금지 역할
- production과 test가 같은 Interface를 통과하는 verification seam
