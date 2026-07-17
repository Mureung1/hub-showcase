# 007 — 두 client와 resume로 conversation ownership을 검증한다

## Wayfinder ticket

- Type: prototype
- State: open
- Blocked by: [Product conversation seam을 세 가지로 설계한다](006-target-conversation-seam-alternatives.md)

## Question

선택한 Seam은 두 browser client가 서로의 idle native handle을 교체하지 않게 격리하고, Server restart 뒤 workspace-filtered list → read → resume → follow-up을 raw protocol type이나 remapped identity 없이 표현할 수 있는가?

## Resolution evidence

- Thin client A/B와 opaque native ID를 사용한 ownership·wrong-owner rejection trace
- Server restart 전후 list/read/resume/follow-up sequence와 Seam별 변경 위치
- Current official SDK public surface로 가능한 동작과 bridge extension이 필요한 동작의 구분
- Live stream과 cold `thread/read` projection의 lossiness를 명시적으로 표현하며 완전한 byte-for-byte parity를 성공 조건으로 삼지 않는 transcript contract sketch
- 실패 시 runtime mechanics, Server lifecycle/ownership 또는 browser read model 중 어느 Seam이 원인인지 판별한 결과
