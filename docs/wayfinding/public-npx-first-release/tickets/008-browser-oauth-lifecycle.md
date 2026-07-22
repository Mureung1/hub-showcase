# 008 — Browser-launched Codex OAuth lifecycle을 설계한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [첫 public preview의 성공 여정을 고정한다](004-first-public-preview-success-journey.md), [npx production composition을 고른다](006-npx-production-composition.md)

## Question

Official SDK의 browser·device-code login start, matching completion wait, cancel·logout과 Account Readiness가 제공하는 실제 상태·failure를 어떤 Runtime·Server·Browser-safe product contract로 노출해야 하는가? npx가 연 local app이 auth token을 Browser·workspace·public log에 노출하지 않으면서 fresh login, expiry, cancel, CLI interrupt, logout, relaunch와 재인증 뒤 같은 app-managed account lifecycle로 수렴하려면 무엇이 durable하고 무엇이 transient해야 하는가?

## Answer

아직 조사하지 않음.
