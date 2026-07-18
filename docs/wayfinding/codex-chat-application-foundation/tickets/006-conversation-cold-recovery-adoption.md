# 006 — Conversation catalog와 cold recovery의 adoption surface를 확인한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [현재 Chat implementation과 prior-art overlap을 기준선으로 고정한다](002-current-chat-overlap-audit.md)

## Question

002가 선정한 bounded lookup candidate를 기준으로, pinned App Server·official SDK의 conversation catalog·history capability와 Codex first-party client·성숙한 Chat OSS의 cold recovery behavior는 Browser reload와 local service restart 뒤 무엇을 복원하고 무엇을 transient로 남기는가? Native durable identity를 우선 보존하면서 current Browser tab-memory projection에 direct reuse·adaptation할 수 있는 범위와 confirmed residual만 판정한다.

## Resolution evidence

- Exact App Server signature, SDK public seam, generated model, primary test와 on-disk ownership
- Codex first-party client와 relevant Chat OSS donor의 catalog·reload·restart·follow-up behavior, exact version·license·provenance
- List/read/resume, pagination·ordering·title/status와 history lossiness에서 donor assumption과 pinned native capability의 차이
- Native durable identity, process-local handle, Browser tab-memory projection의 current `keep | replace | delete` 후보
- Required multi-conversation·cold continuity surface의 `direct reuse | adapt | narrow port | confirmed residual` 판정, optional catalog feature의 `deferred | out-of-scope`와 representative trace를 구분한 `assets/conversation-cold-recovery-adoption.md`
- Target Browser read model과 routing 설계의 명시적 제외
