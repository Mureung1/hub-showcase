# 006 — Current integration adapter로 first-vertical representative trace를 검증한다

## Wayfinder ticket

- Type: prototype
- State: claimed
- Blocked by: [First-vertical runtime contract와 existing Codex surface의 overlap을 확인한다](005-first-vertical-runtime-overlap.md)

## Question

일반 Chat 기능을 추가하지 않고 frozen current adapter 또는 005가 확인한 가장 얇은 official seam으로 대표 Assignment 실행을 수행할 때, 004의 required runtime outcome과 failure settlement가 실제 trace에서 성립하는가? 실패한 exact invariant만 confirmed residual candidate로 남긴다.

## Resolution evidence

- 두 representative TXT, explicit test workspace와 bounded account/runtime fixture
- `SourceSelection + Recipe input → native execution → validated structured Assignment candidate`의 UI-less throwaway trace
- Opaque execution correlation을 `ModelingRun` receipt에 연결하되 product DB·StatePatch implementation을 만들지 않는 test harness
- 004가 required로 둔 terminal·interrupt·crash·retry 또는 unknown-outcome negative control
- Current adapter를 확장하지 않은 falsifying result, 충족한 outcome과 exact missing seam
- Production code로 승격하지 않는 `/prototype` evidence와 008이 판정할 `keep | replace | delete` 후보
