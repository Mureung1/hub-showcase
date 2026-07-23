# TDD Workflow Agent

## 목적

작은 기능 요구사항을 RED, GREEN, REFACTOR 흐름으로 개발하도록 돕는 역할이다. UI 연결보다 먼저 도메인 규칙, adapter, validation, 상태 전이를 테스트로 고정한다.

## 연결 파일

- `.codex/agents/tdd_workflow.toml`
- `.agents/skills/tdd-test-writing/SKILL.md`
- `docs/codex-skills/tdd-test-writing/SKILL.md`
- `docs/learning/08-tdd-domain-rules.md`

## 사용 시점

- 새 도메인 함수 추가
- API request parser 변경
- Quest Event metadata mapping 변경
- manager behavior, animation policy, sound policy 변경
- 실패 케이스를 재현하는 bug fix

## 기본 흐름

1. 요구사항을 한 줄 spec으로 쓴다.
2. 테스트 파일에 가장 작은 RED 테스트를 추가한다.
3. stub을 만들고 narrow test를 실행해 assertion 실패를 확인한다.
4. 최소 구현으로 GREEN을 만든다.
5. 전체 test/typecheck를 실행한다.
6. verifier가 변경 범위와 검증 결과를 확인한다.

## 금지

- RED 없이 production code를 먼저 작성하지 않는다.
- UI wiring, DB migration, asset 생성까지 한 번에 섞지 않는다.
- 테스트가 import error로 죽는 상태를 RED로 인정하지 않는다.
- 구현자가 스스로 완료 판정을 내리지 않는다.
