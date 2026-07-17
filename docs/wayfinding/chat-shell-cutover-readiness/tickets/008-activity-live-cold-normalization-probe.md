# 008 — 한 activity family로 live/cold 확장성을 검증한다

## Wayfinder ticket

- Type: prototype
- State: open
- Blocked by: [두 client와 resume로 conversation ownership을 검증한다](007-conversation-resume-ownership-probe.md)

## Question

대표 `commandExecution` activity family 하나의 started·output delta·completed 흐름을 official SDK의 typed item에서 browser-safe contract와 UI read model까지 추가하고, live event와 cold thread read의 차이를 raw event bus 없이 일관되게 표현할 수 있는가?

## Resolution evidence

- Typed SDK → bridge projection → Node discriminated union → transport → browser read model의 최소 change map
- Chunk size, opaque ID와 ordering을 변화시킨 live/cold paired trace와 invariant oracle
- Cold read에 없는 세부사항을 결손 상태로 표현하는 규칙과 duplicate/late event 처리
- 다른 activity family를 추가할 때 수정해야 하는 위치와 shotgun surgery 여부
- 모든 App Server event 노출, activity card UI 완성과 production integration은 제외한 throwaway evidence
