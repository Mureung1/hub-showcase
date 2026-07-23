# 001 — Public npx release 경로를 채택한다

## Wayfinder ticket

- Type: grilling
- State: resolved
- Blocked by: None

## Question

2026-07-31 첫 public release를 paid Apple Developer credential이 필요한 signed·notarized public DMG로 제공할 것인가, Node/npm prerequisite를 명시한 public landing·npm launcher·versioned Runtime release 기반 local web app으로 제공할 것인가?

## Answer

2026-07-22 사용자는 Apple Developer 비용이 필요한 signed·notarized public DMG를 release 기준에서 제외했다. Ad-hoc DMG가 기술적으로 무료일 수 있다는 사실과 별개로 `.app`·`.dmg` 전체를 이번 scope에서 내리고, 새 public `AY-PLE` repository, landing, public npm launcher와 GitHub Release Runtime payload를 사용하는 경로를 선택했다. 첫 release는 macOS arm64와 Node/npm prerequisite를 정직하게 표시하는 public preview이며, Developer ID signing·notarization은 완료 조건이 아니다.

이 결정은 exact repository history·license, npm package identity, Runtime archive와 manifest authority, OAuth·setup 사용자 여정 또는 clean-machine release gate를 미리 확정하지 않는다. 해당 질문은 후속 ticket이 소유한다.
