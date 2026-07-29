# 009 — Turn 중 dependency install과 sandbox 정책을 결정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [Pinned Codex의 environment·sandbox 의미를 확인한다](002-codex-environment-semantics.md), [App host와 AY work environment의 ownership seam을 정한다](005-environment-ownership-seam.md), [Rich environment의 dependency 선정 정책을 정한다](006-rich-environment-policy.md)

## Question

Preinstalled profile에 없는 도구가 필요할 때 AY가 package manager를 탐색·사용하는 것을 어떤 범위에서 허용하고, runtime immutable tree, workspace-local environment, network escalation과 사용자 전역 환경 중 어디를 writable authority로 둘 것인가?

## Expected evidence

- `pip`, npm/npx, Homebrew와 system installer별 allow·deny·ask policy
- network-restricted `workspace-write`, auto-review와 package install request의 실제 흐름
- verified Runtime mutation 금지와 post-run non-mutation gate
- workspace-local venv·cache가 학기 자료·Git history를 오염하는 scenario
- missing dependency에서 graceful fallback·사용자 질문·실패 표면의 책임
- 개인 dogfood 편의와 future distributable app safety의 분리
