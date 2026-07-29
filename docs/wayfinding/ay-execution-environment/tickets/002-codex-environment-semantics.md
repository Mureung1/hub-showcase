# 002 — Pinned Codex의 environment·sandbox 의미를 확인한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: None

## Question

Pinned Codex `0.144.4`, reused official Python SDK와 current public Codex 문서에서 client가 제공한 environment, `cwd`, shell command, sandbox·approval·network, `CODEX_HOME`과 tool discovery는 각각 어떤 의미를 가지며 AY-PLE이 직접 소유해야 하는 부분은 어디까지인가?

## Expected evidence

- Exact source/generated schema·tests와 current official Codex manual의 구분
- App Server child environment가 spawned command와 MCP에 전달되는 흐름
- `workspace-write`, `auto_review`, network restriction과 command escalation의 pinned semantics
- Native bundled helper와 client `PATH`가 각각 공급하는 executable
- `CODEX_HOME`·project config·Skill·session authority와 interpreter package environment의 분리
- AY-PLE이 upstream behavior로 재사용할 수 있는 것과 host가 명시해야 하는 것의 closed list
