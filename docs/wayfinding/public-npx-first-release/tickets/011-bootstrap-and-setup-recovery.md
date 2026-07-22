# 011 — Bootstrap과 setup의 durability·recovery contract를 확정한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [npx production composition을 고른다](006-npx-production-composition.md), [Runtime release delivery·integrity·versioning을 정한다](007-runtime-release-delivery-integrity.md), [Browser-launched Codex OAuth lifecycle을 설계한다](008-browser-oauth-lifecycle.md), [재개 가능한 setup과 Installer bundle의 authority를 정한다](010-resumable-setup-authority.md)

## Question

Download·cache·OAuth·workspace setup과 첫 action 사이에서 CLI interrupt, browser close, Server·Runtime loss와 반복 `npx` 실행이 발생해도 성공을 합성하거나 사용자 원본을 덮어쓰지 않으려면 어떤 identity·version·digest·Review decision·operation receipt를 어디에 기록해야 하는가? Resume, already-ready, already-applied, corrupt-cache repair, source/setup conflict, recovery-required와 App-owned artifact rollback을 어떤 observable contract로 구분해야 하는가?

## Answer

아직 조사하지 않음.
