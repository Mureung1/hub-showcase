# 016 — Codex Chat-only cutover 실행 gate

- 판정일: 2026-07-17
- 입력: [014 removal manifest](014-legacy-removal-manifest.md), [018 permanent local-state cleanup](../tickets/018-legacy-local-state-cleanup.md)
- 적용 대상: 후속 implementation spec과 그 implementation session
- 산출물 성격: 실행 가능한 gate 결정이며, 이 Wayfinder session 자체에서 production code나 local state를 변경하지 않는다.

## 결론

Codex Chat-only cutover는 implementation-ready다. Executable legacy exception은 0개이고, 세 approved ignored root는 full cutover gate가 모두 green인 뒤 **영구 삭제**한다. 필수 command·artifact·platform·consumer preflight가 없거나 실패하면 skip이나 partial green으로 처리하지 않고 해당 phase를 `blocked`로 판정한다.

Rollback은 code에만 존재한다. Tracked change는 immutable commit SHA와 gate log를 기준으로 Git revert할 수 있지만, 영구 삭제한 `.ay-ple` 계열 auth/config/session/history에는 data rollback이 없다. 여기서 permanent는 workflow가 recovery copy를 만들지 않고 지원하는 data rollback이 없다는 뜻이며 secure erase나 APFS snapshot·Time Machine·external backup 제거를 주장하지 않는다. 이후 live provider가 필요하면 새 isolated `CODEX_CHAT_*` roots를 만들고 재로그인한다.

## 확정 사실과 사용자 결정

| 구분 | 확정 내용 | 실행 시 의미 |
| --- | --- | --- |
| Repository consumer | Legacy Host production caller는 없고 Harness consumer는 삭제 대상인 Server·Inspector·root command 안에서 닫힌다. Bounded sibling scan에서도 caller를 찾지 못했다. | 사용자의 기억을 consumer 증명으로 요구하지 않는다. 실행 직전 repository·process·configuration preflight가 다시 확인한다. |
| Current process/config | 조사 시 project Server·Chat Shell·Inspector process와 `CODEX_CHAT_*` environment, repository/server `.env` override가 없었다. | Snapshot은 영구 보장이 아니므로 destructive phase 직전에 재검사한다. |
| Chat state ownership | Codex Chat은 six explicit absolute `CODEX_CHAT_*` roots를 요구하며 `.ay-ple` fallback이 없다. Manual T0만 legacy `codex-home`을 명시적으로 재사용했다. | 그 auth/config도 permanent deletion에 포함하며 자동 migration하지 않는다. |
| Delete authorization | 사용자는 recoverable quarantine/Trash를 기각하고 exact legacy roots의 영구 삭제를 승인했다. | Recovery copy, restore mapping, delayed purge와 data rollback을 만들지 않는다. |
| Gate strictness | 사용자는 survivor/default/browser/actual/residual full gate를 destructive action 전에 요구했다. | Missing prerequisite는 `blocked`다. Live provider OAuth만 필수 gate에서 제외한다. |
| Readiness | 추가 keep/migrate/remove 또는 architecture 선택은 남아 있지 않다. | 다음 actor는 `/to-spec`이며 014의 atomic order를 tracer-bullet implementation slice로 옮긴다. |

External consumer가 뒤늦게 발견되면 이 사실이 legacy 유지 예외를 자동 생성하지 않는다. Consumer owner, 호출 surface와 offboarding date를 기록하고 offboarding이 완료될 때까지 destructive phase를 block한다. 이번 audit에서 consumer를 찾지 못했다는 결론은 사용자 인증이 아니라 bounded repository·sibling·process·configuration evidence다.

## 실행 phase와 checkpoint

| Phase | 실행 내용 | 필수 exit condition | Failure owner |
| --- | --- | --- | --- |
| 0. Immutable baseline | 시작 `HEAD`의 full SHA, canonical repository absolute root와 device/inode, 현재 package graph, 세 local root의 metadata-only inventory와 tracked worktree 밖 Git-directory gate artifact 위치를 기록한다. Deployable release/tag가 실제 있으면 함께 기록한다. | Worktree가 clean committed state이고 `rollback_base_sha`, current-clone identity, inventory와 log destination이 모호하지 않다. Dirty면 block하며 local data mutation은 없다. | Implementation owner |
| 1. Camp detach | Static camp demo의 serve/export/test/typecheck tooling을 Inspector 밖 artifact-local owner로 옮긴다. | Inspector workspace 없이 camp unit/typecheck/E2E/export가 green이다. | Camp artifact owner |
| 2. Atomic code cutover | Server mixed legacy cluster, 네 legacy workspace, Host/generated pin, root graph·lock과 active docs를 014 manifest대로 제거한다. | Survivor code가 compile/run하고 package만 먼저 사라지는 broken intermediate state가 integration boundary에 남지 않는다. | Implementation owner |
| 3. Candidate checkpoint | Tracked cutover change를 review 가능한 commit range로 고정하고 full SHA를 기록한다. | `cutover_candidate_sha`와 diff scope가 gate log에 연결되고 candidate worktree가 clean하다. | Implementation owner |
| 4. Full pre-delete gate | Candidate SHA의 detached clean worktree에서 `npm ci`부터 default/browser/camp/code residual을 실행하고, pinned current clone에서 production bundle, actual-child, local-provider, Server actual과 bounded entrypoint gate를 실행한다. | 아래 required matrix가 전부 `green`이다. 하나라도 `blocked`/`red`이면 Phase 5로 진행하지 않는다. | Matrix별 owner |
| 5. Permanent local deletion | Current-clone identity, clean `HEAD == cutover_candidate_sha`와 destructive guard를 다시 통과한 뒤 세 literal exact root를 reviewed one-shot operator로 직렬 영구 삭제한다. | 세 root가 없고 partial failure나 scope expansion이 없다. 한 root라도 실패하면 다음 root는 untouched다. | Current-clone local operator |
| 6. Post-delete verification | Data residual, retained artifact, production bundle과 configuration/status-sensitive gate를 다시 확인한다. | 아래 post-delete oracle이 전부 green이고 log가 candidate SHA에 연결된다. | Local operator + Chat runtime owner |
| 7. Merge/handoff | Gate log와 known no-data-rollback 결과를 review artifact에 남긴다. | Code review가 SHA·commands·results·blocked 0건을 재현할 수 있다. | Implementation owner |

Phase 5는 install, start, CI, merge hook이나 application startup에 넣지 않는다. Local ignored state는 clone별 operator action이므로 implementation session에서 명시적으로 한 번 실행하고 결과를 기록한다.

Detached clean worktree gate와 ignored production bundle gate는 목적이 다르다. 전자는 stale workspace link·`node_modules`·build output 없이 candidate package graph를 증명하고, 후자는 current clone에 materialize된 exact bundle로 actual process path를 증명한다. 어느 쪽도 다른 쪽을 대체하지 않는다.

Gate artifact는 current clone의 Git directory 아래 `.git/codex-chat-cutover/<cutover_candidate_sha>/`에 두며 directory는 `0700`, JSONL log와 one-shot program은 `0600`으로 만든다. Log의 각 record는 `phase`, UTC `startedAt`/`finishedAt`, `cwd`, full SHA, exact argv, prerequisite, `green|red|blocked`, exit/status summary와 failure owner를 가진다. Environment value, credential, file content와 child stdout payload는 기록하지 않는다. Permanent deletion record에는 current-clone device/inode, target별 preflight metadata·descendant symlink count, command exit, ENOENT postcondition과 hard-stop 여부를 추가한다. 후속 spec이 제공하는 exact residual checker와 delete operator source, SHA-256도 이 directory에 기록하되 final product tree에는 두 program이나 legacy allowlist를 maintained script로 남기지 않는다.

## Required positive gate matrix

| Gate family | Exact command 또는 evidence | 적용 checkpoint | 판정과 owner |
| --- | --- | --- | --- |
| Environment preflight | `uname -s`, `uname -m`, `node --version`, `npm --version`, exact `uv 0.8.13`, discoverable exact CPython `3.10.12`, Playwright version와 Chromium executable accessibility를 gate log에 기록 | 모든 gate 전 | `Darwin`/`arm64`, pinned Python/uv 또는 Chromium이 없으면 `blocked`. Provisioning은 local operator, manifest/tool identity mismatch는 Chat runtime owner. |
| Clean install | Candidate SHA의 새 detached worktree에서 `npm ci` | Pre-delete merge gate | Network/install prerequisite가 없거나 lock과 manifest가 불일치하면 `blocked`/red. 실패는 implementation owner, environment provisioning은 local operator. |
| Default survivor | `npm test` | Pre-delete merge gate | Merge-blocking. 실패는 implementation owner. |
| Type safety | `npm run typecheck` | Pre-delete merge gate | Merge-blocking. 실패는 implementation owner. |
| Build | `npm run build` | Pre-delete merge gate | Survivor와 artifact-local owner만 build해야 한다. 실패는 implementation owner. |
| Chat Shell lint | `npm run lint -w @ay-ple/chat-shell` | Pre-delete merge gate | Merge-blocking. 실패는 Chat Shell owner. |
| Browser | `npm run test:e2e` | Pre-delete merge gate | Chat Shell과 artifact-local camp E2E를 포함한다. Desktop workspace만 대상이다. 실패 suite의 Chat Shell 또는 camp artifact owner가 담당한다. |
| Camp export | `npm run export:camp-demo` | Pre-delete merge gate | Inspector import나 live Harness 없이 artifact가 export된다. 실패는 camp artifact owner. |
| Production bundle | `npm run verify:production-runtime -w @ay-ple/codex-chat-runtime` | Pre- and post-delete | Artifact 부재는 local operator의 provisioning `blocked`, 존재하는 artifact의 manifest/digest mismatch는 Chat runtime owner의 red다. |
| Node actual-child | `npm run test:node-actual -w @ay-ple/codex-chat-runtime` | Pre-delete release gate | Provider credential 없이 actual Node→Python→native process tree를 검증한다. 실패는 Chat runtime owner. |
| Exact local-provider | `npm run test:local-provider -w @ay-ple/codex-chat-runtime` | Pre-delete release gate | Official local Responses harness의 provider-free exact-native gate다. 실패는 Chat runtime owner. |
| Server actual shutdown | `npm run test:codex-chat-actual -w @ay-ple/server` | Pre-delete release gate | Listener refusal와 Python/native process-tree disappearance를 검증한다. 실패는 Server/Chat runtime owner. |
| Canonical entrypoint | 새 root `npm run test:dev-entrypoint` | Pre-delete local gate | 두 bounded case를 serial 실행한다. Origin만 주입되는 canonical `npm run dev`는 exact `invalid_configuration`; verified runtime root·current workspace·fresh four writable roots는 `configured`다. 각 case는 named test-only 60초 readiness bound, HTTP status와 Shell assertion, allowlisted Server+Chat Shell descendant argv, signal 뒤 10초 reap과 port release를 검증한다. 이 값은 product contract가 아니다. Timeout/port collision은 local operator `blocked`, behavior/process failure는 Server/Chat Shell owner의 red다. |
| Patch hygiene | `git diff --check "$rollback_base_sha" "$cutover_candidate_sha"`와 `npm run check:docs-links` | Pre-delete merge gate | Candidate range 전체와 changed/current Markdown link를 검사한다. 실패는 implementation owner. |
| Cutover residual | `node <absolute-git-dir>/codex-chat-cutover/<cutover_candidate_sha>/check-chat-only-residual.mjs --rollback-base <full-rollback-sha> --candidate <full-candidate-sha> --candidate-worktree <absolute-detached-worktree>` | Pre-delete merge gate | 아래 1~8을 programmatic assertion하고 exit 0만 green이다. Source/hash는 gate artifact에 고정하며 final tree에는 checker를 남기지 않는다. Exit 1 red는 implementation owner, exit 2 prerequisite `blocked`는 local operator가 담당한다. |

Live provider credential·remote network response·OAuth account 성공은 이번 deletion gate가 아니다. Exact bundle materialization, supported platform, Node/Python/native child, Playwright/browser와 command 자체는 필수 prerequisite다. Required prerequisite가 없으면 `skip`, `not run` 또는 unit-test green으로 대체하지 않고 `blocked`로 기록한다.

## Code residual oracle

Full pre-delete gate는 positive command뿐 아니라 다음 negative oracle을 모두 만족해야 한다.

후속 spec은 아래 1~8을 하나의 reviewed one-shot `check-chat-only-residual.mjs` exact source로 제공한다. Program은 base/candidate SHA와 detached/current worktree absolute path만 받고, shell interpolation 없이 Git/npm child argv와 HTTP probe를 구성한다. 모든 assertion이 참일 때만 exit 0, mismatch는 exit 1, missing tool/artifact는 exit 2와 `blocked` record를 낸다. Active-doc list와 historical allowlist, banned package/symbol/path set, survivor build roots와 expected Chat route set은 source 안의 폐쇄 상수이며 실행 중 자동 확장하지 않는다.

1. `git ls-files -- apps/inspector packages/runtime-core packages/runtime-fake packages/runtime-codex` 결과가 비어 있다.
2. Production source, tests, manifests와 root scripts에는 `@ay-ple/runtime-core`, `@ay-ple/runtime-fake`, `@ay-ple/runtime-codex`, `@ay-ple/inspector`, `AgentRuntimeKernel`, `CodexRawClient`, `HeadlessCodexClientHost`, `/api/runtime`, `RUNTIME_HISTORY_*`, `RUNTIME_FAKE_DELAY_MS`, `CODEX_RUNTIME_CWD`, `verify:codex-parity`, `smoke:codex`가 없다.
3. Clean worktree의 `npm ls --all --json`이 invalid/extraneous workspace link 없이 성공하고, package graph와 `package-lock.json` assertion은 deleted workspace, `@openai/codex@0.144.0`, legacy optional platform closure와 legacy-only `ajv`, `cors`, `@types/cors`가 없음을 확인한다.
4. Server route probe에서 `/api/runtime/*`와 legacy `/api/health`는 contract가 아니며 `/api/codex-chat/status`, `POST /api/codex-chat/threads`, `POST /api/codex-chat/threads/:threadId/turns`, `POST /api/codex-chat/threads/:threadId/turns/:turnId/interrupt` behavior는 유지된다.
5. Root `npm run test:dev-entrypoint`가 허용한 descendant argv에는 Server와 Chat Shell만 있고 Inspector, `dev:chat-shell` 또는 legacy child가 없다. Root demo는 artifact-only다.
6. Active architecture, product, package README와 agent instruction은 deleted path·command·owner를 current topology로 가리키지 않는다. Runtime Harness·Inspector·`0.144.0` 표현은 새 cutover ADR, completed historical docs, Wayfinder evidence와 static camp artifact처럼 명시된 history allowlist에서만 허용한다. Global zero-grep은 사용하지 않는다.
7. Detached clean worktree에서 `npm ci && npm run build` 뒤 survivor release/build roster를 enumerate했을 때 stale legacy JS/d.ts가 없다. Deleted workspace 아래 regenerable `dist`/`node_modules`는 tracked-source oracle와 분리해 제거한다.
8. Codex Chat default/runtime/config implementation에는 `.ay-ple` fallback, legacy env alias나 deleted package import가 없다.

현재형 문서와 agent navigation에서 legacy architecture가 사라지는 것이 완료 조건이다. 완료된 ADR/spec/Wayfinder와 static Week 1 artifact는 실행 경로나 current architecture source가 아닌 point-in-time history로만 남으며, 새 current 문서가 그 구조를 복제하지 않는다.

## Permanent-deletion guard

### Exact allowlist와 expected shape

| Literal repository-relative root | Expected top-level baseline | 승인된 operation |
| --- | --- | --- |
| `.ay-ple` | `runtime-codex`, `runtime-harness` | Root 전체 영구 삭제 |
| `apps/server/.ay-ple` | `runtime-harness` | Root 전체 영구 삭제 |
| `spikes/codex-runtime-ownership/runtime` | `codex-home`, `fake-bin`, `last-result.json`, `snapshots`, `sqlite` | Root 전체 영구 삭제 |

다음 조건을 모두 만족하지 않으면 destructive operation을 시작하지 않는다.

1. Phase 0에 `git rev-parse --show-toplevel`로 기록한 canonical absolute root와 device/inode가 current clone과 정확히 같고, `HEAD`가 `cutover_candidate_sha`이며 `git status --porcelain`이 비어 있어야 한다. 세 target은 기록한 root와 위 literal relative string으로만 조합한다. Glob, user input, unresolved environment variable, repository root·parent와 `git clean`을 target resolver로 사용하지 않는다.
2. 각 target의 `lstat`는 ordinary directory이고 root 자체가 symlink가 아니다. Canonical parent는 기대한 repository-relative parent이며 세 target은 서로 같거나 ancestor/descendant가 아니다.
3. `git ls-files -- <three exact roots>`는 비어 있다. Target 밖 tracked/ignored root를 cleanup 권한으로 확장하지 않는다.
4. Top-level child set은 위 baseline과 정확히 일치한다. 예상 밖 child가 있으면 내용을 열람하거나 자동 삭제하지 않고 owner와 disposition을 확인할 때까지 block한다.
5. Current project Server·Chat Shell·Inspector/legacy process와 target 아래 open handle이 없다.
6. Active environment, repository/server `.env`와 실행 command의 `CODEX_CHAT_RUNTIME_ROOT`, `CODEX_CHAT_RUNTIME_HOME`, `CODEX_CHAT_CODEX_HOME`, `CODEX_CHAT_SQLITE_HOME`, `CODEX_CHAT_TEMP_DIR`는 각 target과 양방향으로 disjoint하다. `CODEX_CHAT_WORKSPACE`가 target 안에 있거나 target과 같으면 block하고, canonical repository ancestor로 target을 포함하는 경우에만 project process/open handle 0 조건 아래 허용한다.
7. `find -P` 성격의 non-follow inventory가 두 legacy `codex-home` 아래 합계 6개를 포함한 **모든** descendant symlink와 target device boundary를 기록한다. Link target을 따라가지 않고 link object와 containing root만 삭제하며 current `packages/codex-chat-runtime/.artifacts`와 root `node_modules` target은 삭제 경계 밖이다.
8. Full pre-delete matrix와 code residual이 같은 `cutover_candidate_sha`에서 모두 green이며 gate log에 `blocked`가 없다.

후속 spec은 위 guard와 아래 operation을 그대로 구현한 reviewable one-shot Node operator의 exact source를 제공하고 그 SHA-256을 gate log에 남긴다. Operator는 target argument를 받지 않고 hard-coded relative allowlist·expected child set만 사용하며 shell을 거치지 않는다. 각 root 직전에 `lstat`와 current-clone/HEAD guard를 다시 확인하고 macOS `/bin/rm`을 argument vector `['-Rfx', '--', validatedAbsoluteRootWithoutTrailingSlash]`로 실행한다. `-x`는 nested mount/device boundary를 넘지 않고 internal symlink는 link object로 처리한다.

세 root는 표 순서대로 하나씩 실행하고 각 command 뒤 해당 root의 `lstat == ENOENT`를 확인한다. Command exit code가 0이 아니거나 stderr가 비어 있지 않거나 postcondition이 실패하면 **즉시 hard-stop하여 뒤 root를 건드리지 않는다**. Copy, move, Trash, quarantine, broad parent fallback이나 secure-erase 확장은 사용하지 않는다. 일부 target 삭제가 실패하면 다음과 같이 fail closed한다.

- 남은 exact root와 이미 삭제된 exact root를 구분해 기록한다.
- Permission 우회를 위해 parent나 sibling으로 scope를 넓히지 않는다.
- Full failure와 partial deletion을 숨기지 않고 Phase 6을 red로 남긴다.
- Data rollback을 만들기 위해 삭제된 root를 legacy code로 다시 생성하거나 stale backup을 복원하지 않는다.

## Post-delete oracle

1. `.ay-ple`, `apps/server/.ay-ple`, `spikes/codex-runtime-ownership/runtime`의 `lstat`가 모두 `ENOENT`다.
2. Recovery/quarantine copy나 새 legacy default root가 repository·approved operation output에 생기지 않았다.
3. Root `.gitignore`의 `.ay-ple/` 보호 규칙은 남아 있다.
4. `packages/codex-chat-runtime/.artifacts`와 exact production bundle은 존재하며 production bundle verifier가 green이다.
5. Current clone에서 `npm run test:dev-entrypoint`를 다시 실행한 직후 `node <absolute-git-dir>/codex-chat-cutover/<cutover_candidate_sha>/check-chat-only-residual.mjs --post-delete --rollback-base <full-rollback-sha> --candidate <full-candidate-sha> --candidate-worktree <absolute-current-clone>`를 실행한다. Canonical origin-only Chat status는 safe `unavailable/invalid_configuration`, configured smoke는 verified runtime root·current workspace·fresh four writable roots의 `configured`이며 checker는 deletion log의 pre-smoke ENOENT와 current post-smoke ENOENT를 함께 확인해 `.ay-ple`이 재생성되지 않았음을 증명한다.
6. Root process tree와 Server route/package/doc residual은 pre-delete 결과와 동일하게 Chat-only다.
7. Gate log에는 `rollback_base_sha`, `cutover_candidate_sha`, exact commands, result, prerequisite, failure owner, permanent deletion 결과와 no-data-rollback acknowledgment가 있다.

## Rollback과 incident ownership

| Failure class | 즉시 조치 | Owner와 rollback |
| --- | --- | --- |
| Code/default/E2E/residual red | Permanent deletion을 시작하지 않는다. | Implementation owner가 candidate를 고치거나 commit range를 revert한다. |
| Bundle/actual runtime red | Permanent deletion을 시작하지 않는다. | Chat runtime owner가 pin, materialized artifact와 process-tree failure를 진단한다. Legacy Host를 fallback으로 되살리지 않는다. |
| Tool/platform/materialization blocked | Missing prerequisite를 해결하기 전 destructive phase를 중단한다. | Current-clone local operator가 supported environment를 제공한다. Skip으로 승인하지 않는다. |
| External consumer 발견 | Consumer surface를 변경하지 않고 offboarding을 block item으로 기록한다. | Consumer owner와 implementation owner가 replacement/offboarding date를 확정한다. Dormant keep 예외로 자동 전환하지 않는다. |
| Permanent deletion partial failure | Scope를 확장하지 않고 남은 exact root를 기록한다. | Local operator가 exact permission/handle 원인만 해결한다. 삭제된 data는 복구하지 않는다. |
| Merge 후 code regression | 002 observable contract까지 다시 검증한다. | Candidate commit range를 Git revert하거나 실제 pre-recorded release를 재배포한다. Partial legacy resurrection이나 dual-run은 금지한다. |
| 삭제 후 live login 필요 | Fresh isolated `CODEX_CHAT_*` roots를 만든다. | Local operator가 재로그인한다. Local deletion은 remote OAuth revoke가 아니며 revoke는 별도 scope다. |

## `/to-spec` handoff

후속 spec은 014의 Phase 1~4 code order와 이 문서의 Phase 0~7 gate를 결합한다. 다음은 재결정하지 않는다.

- Codex Chat은 유일한 maintained product runtime이다.
- Executable legacy exception은 0개다.
- 세 exact local roots는 full gate green 뒤 영구 삭제하며 recovery copy와 data rollback은 없다.
- Current Chat `.artifacts`, root `.gitignore`, exact allowlist 밖 external root와 explicit historical allowlist는 삭제 대상이 아니다.
- Live provider OAuth는 deletion gate가 아니지만 exact local-provider와 actual process gates는 필수다.
- External consumer 사실은 user questionnaire가 아니라 execution preflight로 검증하고 발견 시 offboarding으로 block한다.
- Permanent deletion은 reviewed one-shot non-follow operator로 수행하고 그 source/hash와 결과를 operation log에 남기되, final product tree에 legacy cleanup utility를 maintained surface로 남기지 않는다.
- Code/data residual은 같은 gate artifact의 reviewed one-shot checker로 실행하고 post-delete entrypoint 뒤 다시 호출하되, legacy banned list를 final product script나 current agent navigation으로 남기지 않는다.

따라서 이 Wayfinder map에는 미해결 architecture decision이나 grilling question이 남지 않았다.
