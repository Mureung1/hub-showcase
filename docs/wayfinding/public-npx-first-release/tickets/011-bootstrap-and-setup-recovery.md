# 011 — Bootstrap과 setup의 durability·recovery contract를 확정한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [npx production composition을 고른다](006-npx-production-composition.md), [Runtime release delivery·integrity·versioning을 정한다](007-runtime-release-delivery-integrity.md), [Browser-launched Codex OAuth lifecycle을 설계한다](008-browser-oauth-lifecycle.md), [재개 가능한 setup과 workspace instruction/Skill bundle의 authority를 정한다](010-resumable-setup-authority.md)

## Question

[Ticket 006](006-npx-production-composition.md)의 foreground supervisor, `appDataRoot` 단위 single-instance lease와 signal cleanup을 process-level baseline으로 두고 duplicate process ownership을 다시 정하지 않는다. [Ticket 007](007-runtime-release-delivery-integrity.md)의 `RuntimeResolver`가 download·cache receipt·complete-tree reuse·corrupt generation repair·Runtime recovery-required를 전부 소유하므로 이 ticket은 그 내부 transaction을 다시 정하지 않는다. [Ticket 010](010-resumable-setup-authority.md)이 승인한 exact setup plan만 durable하게 만들고 matching evidence는 자동 resume하며, preverified workspace instruction/Skill bundle의 declared Skill root complete tree와 effective native context를 Ready gate로 검증하도록 정했으므로 이 policy도 다시 열지 않는다. Resolver outcome, OAuth와 workspace setup부터 `Semester Ready` 사이에서 CLI interrupt, browser close, Server·Runtime loss와 반복 `npx` 실행이 발생해도 성공을 합성하거나 app-owned workspace를 불완전하게 남기지 않으려면 verified package·bundle identity를 포함한 어떤 identity·version·digest·operation receipt를 어디에 기록해야 하는가? Admitted workspace·valid bundle의 pending result와 Runtime 전환·fresh account read까지 끝난 active Ready pointer를 어떤 phase·commit으로 분리하고, transition 실패는 workspace·bundle을 보존한 retry·reauth·provider-unavailable outcome으로 어떻게 수렴시킬 것인가? Automatic resume가 mutation임을 전제로 single-instance host startup 또는 exact-Origin command에서만 수행하고 여러 Browser tab·repeat command가 한 transaction에 join하게 하려면 어떤 serialization·idempotency가 필요한가? First-run 뒤 같은 exact application version의 명령이 Runtime cache·격리 OAuth session·workspace registry를 재사용하고 `WorkspaceManifest`·bundle·effective-context validation 뒤 setup wizard 없이 workbench를 여는 `ready-relaunch`를 보장하려면 resume, already-ready, resolver failure passthrough·retry, setup conflict, recovery-required와 App-owned artifact rollback을 어떤 observable contract로 구분해야 하는가?

## Answer

아직 조사하지 않음.
