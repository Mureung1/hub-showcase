# 011 — Bootstrap과 setup의 durability·recovery contract를 확정한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [npx production composition을 고른다](006-npx-production-composition.md), [Runtime release delivery·integrity·versioning을 정한다](007-runtime-release-delivery-integrity.md), [Browser-launched Codex OAuth lifecycle을 설계한다](008-browser-oauth-lifecycle.md), [재개 가능한 setup과 Installer bundle의 authority를 정한다](010-resumable-setup-authority.md)

## Question

[Ticket 006](006-npx-production-composition.md)의 foreground supervisor, `appDataRoot` 단위 single-instance lease와 signal cleanup을 process-level baseline으로 두고 duplicate process ownership을 다시 정하지 않는다. Download·cache·OAuth·workspace setup과 `Semester Ready` 사이에서 CLI interrupt, browser close, Server·Runtime loss와 반복 `npx` 실행이 발생해도 성공을 합성하거나 app-owned workspace를 불완전하게 남기지 않으려면 어떤 identity·version·digest·operation receipt를 어디에 기록해야 하는가? First-run 뒤 같은 명령이 exact Runtime cache·격리 OAuth session·workspace registry를 재사용하고 `WorkspaceManifest` validation 뒤 setup wizard 없이 workbench를 여는 `ready-relaunch`를 보장하려면 resume, already-ready, corrupt-cache repair, setup conflict, recovery-required와 App-owned artifact rollback을 어떤 observable contract로 구분해야 하는가?

## Answer

아직 조사하지 않음.
