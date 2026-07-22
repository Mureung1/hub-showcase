# 008 — Browser-launched Codex OAuth lifecycle을 설계한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [첫 public preview의 성공 여정을 고정한다](004-first-public-preview-success-journey.md), [npx production composition을 고른다](006-npx-production-composition.md)

## Question

[Ticket 006](006-npx-production-composition.md)의 workspace 없이 시작 가능한 dynamic single-origin host, verified-but-not-yet-started Runtime, at-most-one active Runtime supervisor와 app-managed state root를 고정 입력으로 둔다. Official SDK의 ChatGPT browser login start, matching completion wait, cancel·logout과 Account Readiness가 제공하는 실제 상태·failure를 그 한 Runtime·Server·Browser-safe product contract로 어떻게 노출해야 하는가? OAuth 전 Runtime을 lazy start할 non-workspace cwd를 app data 아래 어떻게 격리하고, 이후 admitted `SemesterWorkspace`로 전환할 때 기존 Runtime을 언제 bounded close·recreate해야 하는가? npx가 연 local app이 auth token을 Browser·workspace·public log에 노출하지 않으면서 fresh login, expiry, cancel, CLI interrupt, logout, relaunch와 재인증 뒤 같은 app-managed account lifecycle로 수렴하려면 무엇이 durable하고 무엇이 transient해야 하는가? 첫 preview는 별도 OAuth web server·port, API key·access token·device-code login과 전역 `~/.codex` credential import를 제공하지 않으며, matching completion success와 fresh `account/read` 없이는 인증 성공을 합성하지 않는다.

## Answer

아직 조사하지 않음.
