# 005 — Local web workspace selection의 donor와 platform seam을 조사한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [현재 Chat implementation과 prior-art overlap을 기준선으로 고정한다](002-current-chat-overlap-audit.md)

## Question

002가 선정한 bounded lookup candidate를 기준으로, 성숙한 macOS local Agent·IDE·web companion은 사용자가 명시적으로 선택한 folder를 local service가 검증하고 다시 여는 흐름을 어떻게 구현하며, Apple·Browser platform seam은 각 donor의 consent·path disclosure·persistence assumption을 어떻게 지원하는가? Existing donor를 먼저 평가한 뒤에도 남는 bounded alternative만 비교한다.

## Resolution evidence

- Relevant local Agent·IDE·web companion donor의 exact version·license·provenance와 workspace selection·reopen trace
- Apple·Browser primary documentation과 donor가 사용하는 platform capability matrix
- User consent, path disclosure, missing·moved folder와 재선택에서 donor assumption과 current local entrypoint의 차이
- Required explicit selection·reopen surface의 `direct reuse | adapt | narrow port | confirmed residual` 판정과 optional platform capability의 `deferred | out-of-scope` 구분
- Current explicit config flow의 `keep | replace | delete` 후보와 cited `assets/workspace-selection-donor-options.md`
- 학업 file indexing, target picker UI와 Host Interface 설계의 명시적 제외
