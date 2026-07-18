# 015 — 첫 Chat foundation의 sandbox와 approval policy를 결정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [Account lifecycle과 native config authority의 official surface를 확인한다](003-official-account-config-capabilities.md), [Live turn rejoin과 pending interaction capability를 확인한다](007-official-live-rejoin-pending-capabilities.md), [Local companion의 위협과 보호 자산을 고정한다](008-local-companion-threat-model.md), [Workspace activation과 chat-readiness state machine을 결정한다](010-workspace-readiness-state-machine.md), [Conversation ownership과 client cardinality를 결정한다](011-conversation-ownership-cardinality.md)

## Question

Foundation 완료 envelope와 official pending-interaction capability 아래에서 첫 Chat application을 fixed `deny_all + read_only`로 닫을지, unexpected schema-valid request를 어떻게 client-side fail closed할지, interactive approval과 additional input을 어떤 조건에서 이번 spec 또는 후속 effort에 포함할지 결정해야 하는가?

## Resolution evidence

- Current trusted-server effective policy와 unexpected default-accept residual 구분
- Read-only baseline, fail-closed defense, upstream public extension과 interactive path 대안 비교
- Original request identity, exactly-once response, timeout·disconnect·wrong-owner invariant
- Account auth, Browser authorization와 command approval의 owner 분리
- 지원·defer·재조사 trigger에 대한 사용자 판정
