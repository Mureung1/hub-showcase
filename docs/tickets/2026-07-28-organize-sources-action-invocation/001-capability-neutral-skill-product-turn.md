# 001 — Capability-neutral Skill Product Turn

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-28-organize-sources-action-invocation.md`

## What It Delivers

`@ay-ple/codex-chat-runtime`의 Node caller가 optional host-only Skill 하나와 bounded text를 Product Turn에 전달할 수 있다. Skill이 있는 호출은 official SDK의 `[SkillInput, TextInput]`, Skill이 없는 normal Chat은 기존 `[TextInput]`으로 실행되며, deterministic Runtime과 exact local-provider test가 같은 caller-visible contract를 검증한다.

## Spec Traceability

- User stories: 8, 9
- Implementation contract: `Capability-neutral Runtime input`, `Compatibility and documentation closeout`

## Slice-Specific Constraints

- Runtime contract는 bounded non-empty `name`과 absolute `SKILL.md` `path`를 가진 optional `skill`만 추가한다. `organize_sources`, source kind, Skill discovery policy와 Browser request 의미를 import하거나 해석하지 않는다.
- Runtime은 configured exact workspace 안의 normalized absolute path인지, real regular non-symlink `SKILL.md`인지 native mutation 전에 검증한다. Caller가 준 name과 path를 discovery catalog와 다시 대조하는 것은 Server ticket의 책임이다.
- Async filesystem validation을 시작하기 전 `skill`, `settings`와 `text`를 request-local value로 snapshot한다. Caller가 nested input을 mutate해도 validated value와 private command가 갈라지지 않아야 한다.
- Private Node→Python command의 `skillName`과 `skillPath`는 둘 다 있거나 둘 다 없어야 한다. Partial pair, extra field, malformed·oversized value는 strict protocol failure이며 native Turn을 시작하지 않는다.
- Python bridge의 action input 순서는 정확히 `[SkillInput(name, path), TextInput(text)]`다. Skill이 없으면 정확히 `[TextInput(text)]`다.
- `MentionInput`, file upload, file content carrier, thread-start Skill extra root, private MCP override, action-specific activity를 추가하지 않는다.
- Deterministic Runtime은 optional Skill을 defensive clone해 journal에 보존하지만 Browser-safe `CodexProductActivity`를 합성하지 않는다.
- Official SDK source와 ordered seven-patch stack, `unpatched.json`, `patched-source.json`은 바꾸지 않는다. Tracked bridge byte 변경에 필요한 production Runtime manifest의 bridge evidence와 whole-bundle roster만 갱신하고 ignored Runtime을 다시 materialize한다.
- Prototype `prototype/action-invocation-native-mapping@b7c1fcd45`은 input order와 provider oracle로만 사용하며 merge하거나 production source로 import하지 않는다.
- Runtime README의 text-only 설명, private command roster, production manifest·bundle digest와 verification guidance를 구현 결과에 맞춘다.

## Acceptance Criteria

- [ ] `StartProductTurnInput`이 exact optional Skill shape를 받고 malformed key roster, empty/oversized name과 unsafe path를 native mutation 전에 거절한다.
- [ ] Valid workspace-contained real non-symlink `SKILL.md`가 private bridge에 name·path pair로 전달되고 Python은 `[SkillInput, TextInput]` 순서를 사용한다.
- [ ] Normal Chat과 모든 no-Skill caller는 기존 `[TextInput]` behavior, settings, permission, activity와 terminal semantics를 유지한다.
- [ ] Python protocol test가 no-Skill/Skill field roster, partial pair, extra field와 bound를 고정한다.
- [ ] Deterministic Runtime journal은 optional Skill의 caller mutation에 영향받지 않으며 새 public activity를 만들지 않는다.
- [ ] Exact local-provider trace에서 provider input에 Skill name·path·body와 representative workspace-relative file-ref text가 나타나고 `MentionInput`은 나타나지 않는다.
- [ ] Production Runtime이 첫 asynchronous validation 전에 Skill·settings·text를 snapshot하고 이후 caller mutation이 native command나 deterministic journal을 바꾸지 않는다.
- [ ] Invalid Skill input, bridge process loss와 cleanup ambiguity가 existing bounded failure·unknown-outcome semantics로 수렴한다.
- [ ] Production Runtime manifest와 ignored bundle이 새 tracked bridge source에 일치하고 실행 전후 verification이 green이다.
- [ ] Official SDK patch roster와 source manifests의 digest는 변경되지 않는다.

## Verification

- Targeted test or command: Bundle-independent `npm run test:bridge-unit -w @ay-ple/codex-chat-runtime`, `npm run test:node-unit -w @ay-ple/codex-chat-runtime`
- Repository checks: 먼저 `npm run materialize:production-runtime -w @ay-ple/codex-chat-runtime -- --write-manifest`; 그 뒤 순서대로 `npm run validate:production-runtime -w @ay-ple/codex-chat-runtime`, `npm run test:runtime-local-provider`, `npm run validate:node-runtime -w @ay-ple/codex-chat-runtime`, `npm test -w @ay-ple/codex-chat-runtime`, `npm run typecheck`, `npm run build`
- Manual or live smoke: Ambient credential이나 live provider는 필요하지 않다. Bundle-backed `test:bridge`, local-provider와 `validate:*`는 materialization 뒤에만 실행하고 materialization과 Runtime actual gate를 병렬 실행하지 않으며 pre/post bundle non-mutation을 확인한다.

## Blocked By

None — can start immediately.

## Starting Points

- `packages/codex-chat-runtime/src/runtime-contract.ts`
- `packages/codex-chat-runtime/src/index.ts`
- `packages/codex-chat-runtime/src/runtime.ts`
- `packages/codex-chat-runtime/src/testing.ts`
- `packages/codex-chat-runtime/src/runtime.actual.test.ts`
- `packages/codex-chat-runtime/src/testing.unit.test.ts`
- `packages/codex-chat-runtime/src/local-provider.actual.test.ts`
- `packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/protocol.py`
- `packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/runtime.py`
- `packages/codex-chat-runtime/scripts/test_python_bridge.py`
- `packages/codex-chat-runtime/scripts/fake_python_bridge_app_server.py`
- `packages/codex-chat-runtime/manifests/production-runtime-darwin-arm64.json`
- `packages/codex-chat-runtime/type-tests/workspace-runtime-contract.ts`
- `packages/codex-chat-runtime/README.md`
