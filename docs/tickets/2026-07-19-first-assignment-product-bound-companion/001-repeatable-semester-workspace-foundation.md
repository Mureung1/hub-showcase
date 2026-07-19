# 001 — 반복 가능한 SemesterWorkspace 기반을 연다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement (current session)

## Parent Spec

[First Assignment Product-bound Codex Companion](../../specs/2026-07-19-first-assignment-product-bound-companion.md)

## What It Delivers

개발자와 테스트가 같은 대표 TXT 자료를 repository 밖의 실제 `SemesterWorkspace`로 안전하게 materialize하고, local companion이 그 workspace를 명시적으로 활성화해 workspace-local store와 `Course`를 다시 열 수 있게 한다. Tracked seed, 개발 workspace, E2E workspace와 native `cwd`의 의미를 섞지 않는다.

## Spec Traceability

- User stories: 1, 11, 12
- Implementation contract: Workspace activation and material admission; Development and E2E workspace materialization; Compatibility and Migration

## Slice-Specific Constraints

- Canonical seed는 `apps/chat-shell/e2e/fixtures/first-assignment-semester-workspace/`에 두고 selected `lms-outline-notice.txt`, selected `problem-solving-syllabus.txt`, unselected negative-control TXT를 포함한다.
- Seed는 immutable input이며 product store나 native `cwd`가 아니다. 실제 workspace로 복사한 materialized canonical directory만 activation 결과가 될 수 있다.
- Manual development 기본 위치는 `<dirname(packageRoot)>/.ay-ple-dev-workspaces/first-assignment-semester-workspace`다. Materializer가 발급한 marker가 있는 exact leaf만 초기화·reset할 수 있다.
- 명시적인 `CODEX_CHAT_WORKSPACE` override는 caller-owned directory다. Seed copy, reset 또는 cleanup 대상이 아니며 Browser/product identity로 노출하지 않는다.
- E2E는 ambient development workspace를 상속하지 않고 실행별 fresh temp copy를 만들며 exact owned run root만 cleanup한다.
- Browser가 absolute path를 만들거나 제출하지 않는다. Product activation은 Server-owned macOS chooser seam을 사용하고 headless test는 그 선택 결과만 주입한다.
- Missing·relative·symlink path, root overlap과 ancestor·descendant 관계를 거절한다. `process.cwd()`나 package root로 fallback하지 않는다.
- Workspace-local store는 format version과 confirmed revision을 가지며 app data를 잃어도 settled product state를 다시 열 수 있어야 한다. Physical schema와 storage library는 public contract가 아니다.
- 지원하지 않는 newer store version은 write·downgrade·repair하지 않고 actionable read-only/incompatible 상태로 연다.
- First vertical은 one active `Course`를 만들거나 선택한다. Course ID는 opaque하고 directory identity가 아니다.

## Acceptance Criteria

- [ ] Repository-owned 개발 command가 canonical seed를 기본 sibling workspace에 materialize하고 선택된 canonical path를 명시적으로 출력한다.
- [ ] Marker가 없는 directory, broad parent와 caller-owned override를 reset·삭제하지 않으며 unsafe root 관계를 fail closed로 거절한다.
- [ ] E2E materializer가 두 실행에 서로 다른 workspace를 만들고 ambient `CODEX_CHAT_WORKSPACE`를 읽지 않으며 각 owned run root만 정리한다.
- [ ] Tracked seed digest가 materialization, Server test와 cleanup 전후에 동일하다.
- [ ] Valid chooser result가 workspace를 활성화하고 cancel·invalid selection은 기존 activation을 바꾸지 않는다.
- [ ] Empty workspace-local store에서 one Course를 만들거나 선택하고 restart/reopen 뒤 같은 opaque identity와 confirmed revision을 읽는다.
- [ ] App data를 제거한 뒤에도 materialized workspace만으로 Course와 settled product snapshot을 다시 연다.
- [ ] Unsupported newer store version을 변경하지 않고 read-only/incompatible outcome과 actionable error로 표시한다.
- [ ] Current Chat runtime을 시작하지 않고도 workspace/product foundation tests가 deterministic하게 통과한다.

## Verification

- Targeted test or command: repository-owned workspace materializer tests, workspace activation/store/Course reopen integration tests, `npm run test:dev-entrypoint`
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: 기본 개발 workspace와 explicit override를 각각 열어 출력된 canonical path와 세 fixture를 확인한다. Provider credential은 사용하지 않는다.

## Blocked By

None — can start immediately.

## Starting Points

- `scripts/test-dev-entrypoint.mts`
- `apps/server/src/codex-chat-config.ts`
- `apps/server/src/codex-chat.ts`
- `apps/server/src/testing/codex-chat-test-support.ts`
- `apps/chat-shell/e2e/chat-shell-harness.ts`
- `docs/adr/0006-separate-package-app-data-and-semester-workspace-roots.md`
