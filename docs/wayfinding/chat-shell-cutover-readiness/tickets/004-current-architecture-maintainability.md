# 004 — 현재 architecture의 유지보수 위험을 감사한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: None

## Question

현재 Runtime Harness, legacy Host와 Codex Chat 경로에서 어떤 Module·Interface·Seam이 실제로 depth와 locality를 제공하고, 어떤 구조가 다음 change pressure에서 invalid state, 중복 수정, raw leakage 또는 이름 재설계를 유발하는가?

## Resolution evidence

- Workspace import와 runtime dependency direction, public export와 Server/browser coupling graph
- 각 Module의 Interface 학습 비용, 숨기는 implementation complexity, caller 수, deletion test와 실제 Adapter 수
- Process/runtime, HTTP lease와 browser presentation state machine의 책임 구분 및 중복 switch·settlement가 의미 중복인지 정당한 계층 분리인지에 대한 판정
- Optional-field impossible state, stringly native identity, duplicated failure settlement·safe-code validation·canonical JSON helper와 shotgun surgery 후보
- Production과 test의 identifier·type·function name을 stable native/domain vocabulary와 first-tracer/fixture-shaped vocabulary로 분류하고, resume·second-client·new activity에서 rename 또는 parallel abstraction이 필요한 이름을 기록한 change map
- 현재 first tracer를 일반화하기 위한 추상화 추가가 아니라 후속 seam 설계를 제약할 근거와 우선순위 없는 debt 목록
