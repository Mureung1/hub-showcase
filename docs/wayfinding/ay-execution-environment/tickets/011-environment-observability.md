# 011 — AY work environment의 observability feedback loop를 정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [현재 실행 그래프와 우연한 의존성을 고정한다](001-current-execution-graph.md), [Rich environment의 dependency 선정 정책을 정한다](006-rich-environment-policy.md), [AY Python work environment의 구조를 검증한다](007-python-work-environment.md), [AY Node·common CLI work environment의 구조를 검증한다](008-node-cli-work-environment.md), [Turn 중 dependency install과 sandbox 정책을 결정한다](009-install-mutation-sandbox-policy.md)

## Question

개발자가 실제 Product Turn의 environment drift와 반복되는 missing command/import를 관찰해 profile을 개선하되, raw command·path·사용자 자료와 reasoning을 과도하게 수집하지 않으려면 어떤 fingerprint·event·retention이 필요한가?

## Expected evidence

- startup environment fingerprint와 binary/package roster digest
- `command not found`, import failure, blocked install과 fallback cascade의 관찰 단위
- native item event, AY-PLE-owned journal과 developer log 중 적절한 owner
- Browser-safe activity와 developer-only diagnostic evidence의 분리
- absolute path, credential, source content와 raw reasoning redaction
- observed miss가 dependency profile 변경 후보로 승격되는 feedback rule
