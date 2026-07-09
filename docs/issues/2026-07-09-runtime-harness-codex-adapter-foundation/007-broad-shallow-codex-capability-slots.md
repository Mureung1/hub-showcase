## Agent triage

- State: ready-for-agent
- Surface: local-issue
- Next actor: agent

## Parent

`docs/prds/2026-07-09-runtime-harness-codex-adapter-foundation.md`

## What to build

Codex App Server endpoint와 일반 AI agent capability를 제품화하지 않고 broad-shallow하게 관측할 수 있는 slot을 둔다. 개발자는 Runtime Inspector 또는 raw client surface에서 `turn/steer`, thread read/list 계열, approval/profile/attachment/settings/thread slot의 존재와 raw/debug behavior를 확인할 수 있어야 한다.

이 slice는 제품 UX를 만들지 않는다. conflict handling algorithm, 학생-facing wording, approval workflow 완성, attachment ingestion은 이후 AY-PLE product layer에서 별도로 결정한다.

## Acceptance criteria

- [ ] `turn/steer`는 raw endpoint slot 또는 Inspector experiment slot으로 호출 가능하거나, generated schema상 확인된 상태로 명시된다.
- [ ] thread read/list 계열 capability는 raw endpoint slot 또는 Inspector experiment slot으로 관측 가능하거나, generated schema상 확인된 상태로 명시된다.
- [ ] approval, profile, attachment, settings, thread/session 관련 capability는 Inspector UI나 runtime model에서 예약 slot으로 표현되며 학생-facing product contract로 오해되지 않는다.
- [ ] 각 slot은 raw/debug log 또는 generated schema reference를 통해 확인 가능하다.
- [ ] runtime-core의 stable semantics는 run lifecycle 중심으로 유지되고, broad-shallow raw capability가 product-facing contract로 새지 않는다.
- [ ] conflict algorithm, full approval UX, attachment parsing, AY-PLE SourceSelection 연결은 구현하지 않는다.

## Blocked by

- `docs/issues/2026-07-09-runtime-harness-codex-adapter-foundation/004-codex-schema-and-raw-client-smoke.md`
- `docs/issues/2026-07-09-runtime-harness-codex-adapter-foundation/005-codex-runtime-adapter-prompt-parity.md`
