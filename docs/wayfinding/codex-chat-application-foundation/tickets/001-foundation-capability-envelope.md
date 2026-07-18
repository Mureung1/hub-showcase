# 001 — Codex Chat application foundation의 완료 envelope를 확정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: None

## Question

AY-PLE 학업 product layer를 시작하기 전에 일반 Codex Chat application이 독립적으로 운영 가능하다고 판정하려면 어떤 사용자 journey, failure·recovery scenario와 safety constraint를 resulting spec이 반드시 닫아야 하며, 어떤 capability를 명시적으로 후속으로 남겨야 하는가?

## Resolution evidence

- Empty app data에서 app 시작, account 준비, workspace 선택과 첫 conversation까지의 대표 journey
- 여러 conversation, reload, Server restart, 두 Browser client, accepted turn disconnect를 required·deferred로 나눈 표
- Activity, pending interaction, interactive approval과 local web entrypoint의 포함·제외 판정
- Desktop Chat 완료 조건과 3-pane·학업 product layer의 명시적 non-goal
- 사용자가 승인한 destination 문장과 spec readiness를 판단할 falsifiable outcome
