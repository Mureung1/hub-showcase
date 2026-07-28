# 002 — 검증된 `organize_sources` Product operation

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

`docs/specs/2026-07-28-organize-sources-action-invocation.md`

## What It Delivers

Closed `POST /api/product/actions` request가 exact active SemesterWorkspace의 current text files와 workspace-local `ay-ple-first-assignment` Skill을 fresh 검증한 뒤, startup-approved thread에서 기존 Product operation stream으로 Turn 하나를 시작한다. Public caller는 raw Skill·native input을 알지 않으며 deterministic Runtime에서 exact `workspace_write`, optional settings, resolved Skill과 bounded action text를 관찰할 수 있다.

## Spec Traceability

- User stories: 5, 7, 8, 9
- Implementation contract: `Public ActionInvocation request`, ``organize_sources` action definition`, `Request-scoped file resolution`, `Workspace-local Skill resolution`, `Bounded action text`, `Product operation lifecycle`, `Failure and security behavior`

## Slice-Specific Constraints

- `@ay-ple/product-contract`는 exact `action`, `files`, optional `codexSettings`만 허용하는 closed `organize_sources` union을 소유한다. File ref는 ordered unique POSIX workspace-relative path `1..16`개이고 기존 path·`16 KiB` JSON bounds를 재사용한다.
- Chat request decoder는 action·files·material field를 계속 거절한다. Browser contract에는 workspace root, absolute path, content·digest, Skill name·path, native type, permission, operation identity와 retry identity가 없다.
- Server action definition은 static `organize_sources` 하나만 제공한다. Text source, workspace-local `ay-ple-first-assignment`, `workspace_write`, one Skill 뒤 one text라는 policy를 소유하되 dynamic action manifest나 generic native-input builder를 만들지 않는다.
- Source preflight는 exact root identity, exclusion policy, non-symlink regular-file identity, realpath containment, `O_NOFOLLOW` open과 pre/post-open device·inode, current text classification을 fresh 확인한다. File bytes·digest·snapshot을 읽거나 open handle을 Turn lifetime까지 보존하지 않는다.
- 모든 ref가 request order대로 통과해야 한다. Missing·renamed·unsafe·non-text ref를 삭제하거나 partial action으로 낮추지 않는다.
- Skill preflight는 invocation마다 bounded `listEffectiveSkills({signal})`를 호출해 enabled exact workspace root의 expected Skill만 허용한다. Expected Skill root directory와 그 안의 `SKILL.md`가 각각 canonical non-symlink directory·regular file이고 exact workspace 안에 포함되는지 확인한다. Global/user/hub copy, same-name wrong root, disabled·moved·symlink Skill로 fallback하거나 workspace copy를 rewrite하지 않는다.
- Rendered action text는 Parent Spec의 fixed header, JSON-escaped ordered paths, `\n`, no trailing newline과 `32 KiB` UTF-8 bound를 정확히 따른다. Content·digest·absolute root·Skill path와 workflow prompt를 넣지 않는다.
- `PreparedProductOperationCoordinator`는 `sendChat()`과 별도 `invokeAction()`을 제공하되 admission, account/settings, preparing, native start, stream, Interaction Broker binding, disconnect·interrupt·terminal, unknown recycle와 lease release를 private shared executor 하나로 유지한다.
- 순서는 strict HTTP decode → reserve → account/settings → all file refs → expected Skill → all file refs → render → client continuity recheck → `operation.preparing` → all file refs → effective Skill → all file refs·rendered input dispatch revalidation → client continuity recheck → native Turn이다. Initial preflight failure는 NDJSON stream과 native Turn을 만들지 않고, late dispatch-gate failure는 native Turn 없이 streamed `failed` terminal로 닫는다.
- Preflight 관찰은 shutdown에서 abort되고 disconnect를 bounded observation 뒤 다시 확인한다. Accepted Turn 이후에는 existing Review·general clarification·interrupt·unknown lifecycle만 사용한다.
- Initial HTTP failure mapping은 Parent Spec의 exact status/code를 유지한다: malformed request는 `400 invalid_request`, stale filesystem context는 `409 action_context_stale`, unsupported/current-invalid context는 `409 action_context_invalid`, missing/unsafe expected Skill은 `409 action_unavailable`, Runtime observation·cleanup failure는 `503 product_unavailable`, busy operation은 `409 action_busy`, account failure는 `409 account_not_ready`, settings failure는 `400 action_invalid`다. Late dispatch gate는 같은 safe action code 중 `action_context_stale | action_context_invalid | action_unavailable | product_unavailable`을 200 NDJSON `failed` terminal로 투영한다.
- Action POST는 existing loopback socket·Origin mutation admission과 JSON body limit를 그대로 통과해야 한다. Public error에는 absolute path, selected content, Skill path/body, native identity, Broker credential, traceback과 raw protocol payload가 없다.
- App-owned mutation, Git command, durable selection, retry ledger, source registry와 `ModelingRun`을 추가하지 않는다.
- 이 ticket은 Browser selection UI와 exact local-provider conformance closeout을 포함하지 않는다.

## Acceptance Criteria

- [x] Contract decoder가 valid 1개·16개 refs와 optional settings의 order를 보존하고 unknown action, extra/native field, empty·duplicate·17개 refs, invalid path와 oversized envelope를 거절한다.
- [x] Chat decoder는 action·files field를 계속 거절하며 source list·preview와 existing operation/review frame contract는 backward-compatible하다.
- [x] Source resolver가 current safe text refs만 stat/open preflight하고 order를 보존하며 content·digest·snapshot을 반환하지 않는다.
- [x] Missing·renamed·symlink·root escape·hidden/managed/secret/scaffold·non-regular, root replacement, PDF·unsupported·size drift와 inode race가 all-or-nothing preflight failure다.
- [x] Expected enabled workspace-local Skill의 real non-symlink `SKILL.md`만 resolve하며 missing, disabled, global-only, wrong-root와 unsafe Skill은 `action_unavailable`로 Turn 전에 실패한다.
- [x] Renderer가 exact fixed format, JSON escaping, request order와 `32 KiB` bound를 지킨다.
- [x] Public action route가 `workspace_write`, current optional settings, resolved Skill과 rendered text를 deterministic Runtime에 한 번 전달한다.
- [x] Initial File·Skill·account·settings·render failure와 preflight disconnect는 Runtime start와 `operation.preparing` frame을 0회로 유지하고 safe JSON error만 반환한다. `operation.preparing` 대기 중 생긴 File·Skill·render drift는 final dispatch gate에서 Runtime start 0회와 safe streamed `failed` terminal로 닫는다.
- [x] Chat과 action이 같은 one-at-a-time lease를 경쟁하며 accepted action은 existing activity, Review, clarification, interrupt, disconnect와 authoritative terminal projection을 재사용한다.
- [x] Normal Chat은 Skill 없이 기존 text behavior를 유지하고 removed academic/runtime route는 alias로 복원되지 않는다.
- [x] Action failure가 exact initial HTTP 및 late streamed failure-code matrix로 투영되고 loopback·Origin admission을 우회하지 않으며 public body와 logs에 path/content/Skill/native/credential/protocol detail을 누출하지 않는다.
- [x] Product contract와 Server README가 구현된 action route, trust boundary와 지원 source kind를 자신의 범위에서 설명한다.

## Verification

- Targeted test or command:
  - `npm test -w @ay-ple/product-contract`: 19/19 passed
  - `npm test -w @ay-ple/server`: 148/148 passed
  - `npm run typecheck -w @ay-ple/product-contract`, `npm run build -w @ay-ple/product-contract`, `npm run typecheck -w @ay-ple/server`, `npm run build -w @ay-ple/server`: passed
- Repository checks:
  - `npm test`, `npm run typecheck`, `npm run build`: passed
  - `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`: passed
- Manual or live smoke: Public JSON/NDJSON boundary에서 deterministic Runtime과 temporary safe/hostile filesystem fixture를 사용해 exact native input, failure matrix, Review·clarification·interrupt·disconnect와 shutdown abort를 검증했다. Ambient workspace와 credential은 사용하지 않았다.
- Review:
  - Fixed point `9c9b46f17f48eda0e97483d1910aac5cc10d865f` 이후 diff를 Standards와 Spec 두 축으로 병렬 검토했다.
  - Standards의 implementation map 불일치, filesystem open 검사·test fixture 중복과 불명확한 error translator 이름을 수정했다.
  - Spec의 same-inode size drift finding을 pre/post-open exact size 비교와 regression test로 수정하고 root replacement의 stale-context 분류를 보강했다.
  - 최종 follow-up은 Standards 0건, Spec 0건이다.

## Blocked By

- `./001-capability-neutral-skill-product-turn.md` — Capability-neutral Skill Product Turn

## Starting Points

- `packages/product-contract/src/target-request.ts`
- `packages/product-contract/src/workspace-sources.ts`
- `packages/product-contract/src/index.ts`
- `packages/product-contract/src/index.test.ts`
- `packages/product-contract/README.md`
- `apps/server/src/workspace-source-projection.ts`
- `apps/server/src/workspace-source-projection.test.ts`
- `apps/server/src/codex-chat-service.ts`
- `apps/server/src/codex-chat-service.test.ts`
- `apps/server/src/prepared-product-operation-coordinator.ts`
- `apps/server/src/prepared-product-http.ts`
- `apps/server/src/prepared-server-application.ts`
- `apps/server/src/prepared-server-application.test.ts`
- `apps/server/src/testing/codex-chat-test-support.ts`
- `apps/server/README.md`

## Result

- `@ay-ple/product-contract`에 ordered unique text file ref `1..16`개와 optional settings만 받는 closed `organize_sources` ActionInvocation을 추가하고 Chat request와 native-only field를 분리했다.
- Server는 current file마다 exact root·exclusion·canonical containment·non-symlink regular file·`O_NOFOLLOW` open·device/inode/size를 fresh 검증하고, invocation마다 enabled exact workspace-local `ay-ple-first-assignment` Skill과 real `SKILL.md`를 다시 확인한다.
- Public `POST /api/product/actions`는 shared Product operation lease에서 account/settings→files→Skill→bounded renderer→continuity 순서를 지킨 뒤 startup-approved thread에 `workspace_write`, optional settings, Skill 하나와 fixed text를 전달한다. Preflight failure는 safe JSON으로 Turn 전에 닫히고 accepted action은 activity, clarification, Semantic Review, interrupt·disconnect와 terminal projection을 재사용한다.
- Product contract·Server README와 current implementation map을 구현 topology에 맞췄으며 Browser source selection UI와 exact local-provider closeout은 후속 ticket 범위로 남겼다.
- 구현 커밋: `2501d9851`, `6a45e2f1f`, `6d9516ab4`, `e4a165859`, `6c7d0b29d`, `7824cc930`
