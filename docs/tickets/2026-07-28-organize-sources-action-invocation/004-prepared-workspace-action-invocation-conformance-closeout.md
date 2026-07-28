# 004 — Prepared SemesterWorkspace ActionInvocation conformance closeout

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

`docs/specs/2026-07-28-organize-sources-action-invocation.md`

## What It Delivers

Fresh temporary Git SemesterWorkspace의 완성된 Browser→public action→Server→exact Runtime→workspace Skill 흐름이 selected actual files를 읽고 같은 native Turn에서 existing Interaction MCP Review를 왕복한 뒤, 사용자 결과에 따라 AY-owned file mutation과 Git checkpoint로 수렴한다. Provider-free exact local-provider trace와 전체 repository gate를 정본 검증으로 남기고, 구현 지도·backlog·package 문서를 current completed capability에 맞춰 닫는다.

## Spec Traceability

- User stories: 1–9
- Implementation contract: `Data flow`, `Compatibility and documentation closeout`, `Actual prepared-workspace trace`, `Repository gates`

## Slice-Specific Constraints

- Fixture는 repository-owned native Bootstrap으로 fresh temporary Git workspace를 만들고 installed `ay-ple-first-assignment`, tracked project Interaction MCP, real built Adapter와 exact verified Runtime bundle을 사용한다.
- Public `organize_sources` action에는 두 selected Markdown/TXT refs만 보내고 unselected control, unrelated dirty tracked file과 untracked sentinel을 별도로 둔다.
- Provider trace는 exact `[SkillInput, TextInput]` order, workspace Skill name·path·body, rendered relative refs와 selected-only actual-file read를 확인한다. `MentionInput`, SDK patch와 hidden file-content carrier는 없어야 한다.
- 같은 native Turn에서 project-discovered `propose_state_patch` call이 Browser-safe Review로 투영되고 exact `accept | revise | reject` result가 same call로 돌아가야 한다.
- Review 전에는 target bytes·Git index·HEAD가 불변이다. Accept 뒤 mutation과 checkpoint는 AY 역할이 explicit intended pathspec으로 수행하고 unrelated dirty·untracked file을 보존한다.
- Reject, invalid interaction, disconnect·interrupt, Adapter/Runtime loss와 action preflight failure는 file mutation, checkpoint, synthetic success와 automatic retry를 만들지 않는다.
- Trace와 logs에는 private credential·binding, absolute workspace/Skill path, native identity, selected file content와 old Course·`RawMaterial`·`ModelingRun` identity가 노출되지 않는다.
- Teardown은 Node·Python·native child, Adapter response, Broker credential, listener와 temporary resource를 완전히 정산하고 temporary workspace 밖 byte를 바꾸지 않는다.
- Ambient dogfood workspace와 credential은 사용하지 않는다. Disposable live-provider smoke는 별도 safe auth가 명시된 경우에만 보조 evidence이며 필수 green이 아니다.
- Prototype branch는 merge하지 않고 oracle만 재구현한다. Exact SDK source, seven-patch roster와 `MentionInput` policy를 바꾸지 않는다.
- `docs/architecture/codex-chat-implementation-map.md`의 current gap과 `docs/product/ay-ple-development-backlog.md`의 ActionInvocation 상태는 모든 implementation·test gate가 green인 뒤 owning document에서 먼저 갱신한다.
- Runtime, product contract, Server와 Chat Shell README가 각자 소유한 final contract와 명령을 설명하는지 감사한다. 다른 formal document에 field roster나 backlog 상태를 복제하지 않는다.
- Removed academic/public-preview route, durable `ModelingRun`, source registry·copy와 App-owned apply가 되살아나지 않았음을 final public-surface regression으로 확인한다.

## Acceptance Criteria

- [x] Fresh Bootstrap workspace의 public action이 exact workspace-local Skill과 두 selected refs만 native Turn에 전달하고 unselected file을 읽지 않는다.
- [x] Exact provider evidence가 `[SkillInput, TextInput]`, Skill body·relative refs, no `MentionInput`과 unchanged SDK patch roster를 확인한다.
- [x] Action-started native Turn이 existing Interaction MCP와 Browser-safe Review를 사용하고 accepted result가 같은 MCP call과 Turn으로 돌아간다.
- [x] Review 전 bytes·index·HEAD가 불변이며 accept 뒤 AY-owned intended-file mutation과 meaningful checkpoint만 생기고 unrelated dirty·untracked state는 보존된다.
- [x] Revise는 fresh proposal로 이어질 수 있고 reject·preflight/interaction/continuity failure에는 mutation·checkpoint·retry·synthetic success가 없다.
- [x] Repeated trace teardown 뒤 child process, listener, held response와 reusable credential이 남지 않고 temporary root 밖 mutation이 없다.
- [x] Browser E2E, exact Runtime/local-provider trace, actual prepared-workspace trace와 repository-wide gates가 함께 green이다.
- [x] 구현 지도는 ActionInvocation을 current implemented topology로, backlog는 첫 ActionInvocation vertical을 완료 상태로 기록한다.
- [x] Package/App README와 root document index가 final document ownership과 current commands에 맞고 Markdown link·format 검사가 green이다.
- [x] Public surface와 persistence regression에서 old Course/material/First Assignment/retry route, `/api/product-mcp`, `/api/runtime/*`, `/api/codex-chat/*`, durable source/Run/apply state가 없다.

## Verification

- Targeted: `npm run test:prepared-workspace-product-actual` — public action exact Runtime trace와 direct Adapter failure matrix 2/2 green. `npm run test:runtime-local-provider` — exact native local-provider 4/4 green. `npm run test:first-assignment-skill` — 5/5 green.
- Runtime: `npm run validate:node-runtime -w @ay-ple/codex-chat-runtime` — production bundle pre/post digest `f387600fe960173a36b29bde6b96dfa5500faebdced243afee64d27599cf2799`, Node actual 101 tests, native context 23 tests와 local-provider 4 tests green. First Assignment conformance provider cleanup unit을 포함한 Node unit 148 tests와 locked Ruff bridge check도 green.
- Repository: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell` — green. Public-surface·persistence regression을 포함한 workspace package 전체 suite가 removed route와 durable academic workflow residue 없이 통과했다.
- Browser·docs: `npm run test:e2e -w @ay-ple/chat-shell` — Chromium desktop 3/3 green. `npm run check:docs-links` — active 28·historical 2 green. `git diff --check` — green.
- Review: fixed point `d8fc1f3a088e6a1b6f583169f54b006e6922a107` 이후 Standards·Spec 병렬 검토의 actionable finding을 `8dfff3db2`, `9b66b62ad`, `7bdeae0f9`에서 모두 해소했고 최종 재검토는 두 축 모두 0건이다.
- Manual/live: Provider-free exact local-provider와 disposable temporary Git workspace만 사용했다. Ambient dogfood workspace·credential과 external live-provider smoke는 수행하지 않았다.

## Blocked By

- `./003-source-workbench-organize-sources-action.md` — Source workbench `organize_sources` action

## Starting Points

- `apps/server/src/testing/prepared-workspace-product.actual.ts`
- `apps/server/src/prepared-server-application.ts`
- `apps/server/src/prepared-server-application.test.ts`
- `apps/server/src/testing/codex-chat-test-support.ts`
- `packages/codex-chat-runtime/src/local-provider.actual.test.ts`
- `packages/codex-chat-runtime/src/first-assignment-conformance-provider.ts`
- `packages/codex-chat-runtime/src/testing-first-assignment-conformance.ts`
- `packages/codex-chat-runtime/scripts/official_local_provider.py`
- `apps/chat-shell/e2e/prepared-public-cutover.spec.ts`
- `apps/chat-shell/e2e/fixtures/first-assignment-semester-workspace/`
- `.agents/skills/semester-workspace-init/SKILL.md`
- `skills/ay-ple-first-assignment/`
- `docs/architecture/codex-chat-implementation-map.md`
- `docs/product/ay-ple-development-backlog.md`
- `packages/codex-chat-runtime/README.md`
- `packages/product-contract/README.md`
- `apps/server/README.md`
- `apps/chat-shell/README.md`

## Result

- Fresh native Bootstrap Git workspace의 public `organize_sources` route를 exact verified Runtime에 연결했다. 두 selected TXT만 actual-file digest read에 포함되고 unselected control은 제외되며, workspace-local First Assignment Skill body·canonical path·relative refs·no `MentionInput`을 확인한다.
- Test-only TypeScript Responses provider와 fixture가 exact Runtime boundary의 ordered Skill→text input, MCP `call_id`별 `revise | accept | reject` 결과와 feedback, `auto_review`, accepted intended-path write·commit을 journal로 남긴다. Graceful close 실패, setup failure와 개별 cleanup failure에서도 Runtime process group, provider listener와 temporary root 정산을 끝까지 시도한다.
- 같은 action-started Turn에서 revise→fresh Review→accept와 별도 reject를 왕복한다. Review 전 target bytes·Git index·HEAD, selected·unselected·dirty·untracked bytes가 불변이고 accept 뒤 `assignment.md`만 meaningful checkpoint가 되며 reject와 direct failure matrix는 no-mutation을 유지한다.
- 구현 지도·backlog·root index·제품 문서와 package/App README를 완료된 양방향 seam 및 문서 소유권에 맞췄다. Python exact-provider controller, official SDK source·seven-patch roster, old academic/public route와 durable workflow state는 변경하거나 복원하지 않았다.
- 구현 checkpoint: `9f7a7907f`(public exact trace), `bdf8ad6fa`(current topology closeout), `8dfff3db2`(TypeScript provider·oracle 강화), `9b66b62ad`와 `7bdeae0f9`(review cleanup).
