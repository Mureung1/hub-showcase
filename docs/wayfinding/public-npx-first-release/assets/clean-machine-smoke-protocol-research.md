# Clean-machine public `npx` smoke protocol 연구

작성일: 2026-07-23

상태: Ticket 016의 primary-source research evidence

## 결론

첫 public preview의 clean-machine smoke는 local checkout이나 fixture package를 검증하는 테스트가 아니다. **지원 macOS의 새 사용자 또는 초기화된 VM에서 G1/S2가 public README·release card에 고정한 exact package version을 실제 public npm과 GitHub Release에서 받아, 기본 Gatekeeper 정책을 바꾸지 않은 채 `Semester Ready`와 완전한 process-tree cleanup까지 관찰하는 black-box release gate**여야 한다. Pages Landing은 이 smoke 뒤에 열리고 같은 command body인지는 Ticket 015의 S9가 판정한다.

실제 public bytes와 결정론적으로만 만들 수 있는 fault를 한 종류의 증거로 부르면 안 된다. `resolver_scripted`, `setup_deterministic(I0)`, `packed_black_box(I1)`, `prepublication_live(I2)`, `exact_public(S7)`의 다섯 evidence class를 candidate digest로 묶는다. `S7`만 actual public smoke이며 [Ticket 015](../tickets/015-publication-release-gates.md)의 `S5 green ∧ 모든 injected GAT retired` 뒤에만 실행한다. 앞의 네 class는 public npm·GitHub readback을 주장하지 않는다. Real managed OAuth와 pinned native conformance는 I2가 소유하고 S7은 같은 candidate의 public delivery를 추가로 닫는다.

`npx` cache와 AY-PLE Runtime cache는 다른 authority다. npm은 cache를 영속 저장소로 보장하지 않으므로 warm npm cache가 있다는 사실만으로 “같은 user command의 전체-network offline relaunch”를 제품 계약으로 선언할 수 없다. Runtime cache·retained archive 검사는 GitHub delivery만 선택적으로 차단하고 npm registry와 provider network는 열어 둔다. AY-PLE은 exact Runtime archive·manifest·hash를 자체 verified cache에서 검증해야 하며 npm package 자체의 offline 실행은 non-blocking 관찰값이다.

`codesign`·`spctl`·`xattr` 결과도 실제 실행을 대신하지 않는다. 특히 현재 delivery가 top-level `.app`이 아닌 archive 안의 command-line Mach-O 집합이면 Apple의 Gatekeeper 문서가 그 조합의 사용자 경험을 완전히 규정하지 않는다. 실제 download path에서 xattr를 수정하지 않고 실행한 결과가 최종 oracle이며, 불명확하면 green을 합성하지 않는다.

## Evidence class와 candidate binding

| Evidence class | 실행 입력 | 소유하는 판정 | 소유하지 않는 판정 |
| --- | --- | --- | --- |
| `resolver_scripted` | Fake HTTP transport와 synthetic descriptor | `200/206/416`, malformed range, validator change, retry, corrupt cache/archive, unavailable exact asset와 synthetic prior exact pair | 실제 GitHub CDN behavior, 실제 quarantine·native launch |
| `setup_deterministic(I0)` | Production setup Module + test-only fault injector | 모든 durable commit 직전·직후, response loss, duplicate approve, discard replay, transition lease race의 old-or-new complete state | 실제 Browser·OAuth·OS process death |
| `packed_black_box(I1)` | G1 exact `.tgz`와 Runtime candidate, test hook 없는 product host | signed-out bootstrap, package resource tamper의 mutation-before-preflight 0, foreground host와 normal/signal cleanup | public registry·release identity |
| `prepublication_live(I2)` | I1과 같은 candidate digest의 retained local bytes | real managed OAuth, actual pinned Codex, hostile ancestor/user context, quarantine control, representative `SIGKILL`, Ready·relaunch | public npm/GitHub readback |
| `exact_public(S7)` | 실제 npm exact version과 실제 immutable GitHub Runtime asset | G1/S2 public user command, public download·execution, clean first-run, Ready, same-version relaunch, cleanup | exhaustive fault matrix나 아직 존재하지 않는 이전 public pair rollback |

모든 class는 하나의 `candidateDigest`를 참조한다. 최소 binding은 source SHA, npm name/version/`dist.integrity`/tarball SHA-256, Runtime release ID/tag/asset/archive/manifest digest, workspace bundle descriptor/complete-tree digest를 포함한다. I1의 tampered derivative나 scripted descriptor는 원본 candidate와 파생 관계를 기록하되 그 실행을 exact public identity로 표시하지 않는다.

S7에는 두 command receipt가 필요하다.

1. 새 profile에서 G1/S2 release card·public README의 사용자 표시 command인 `npx ay-ple@<exact-version>`을 그대로 붙여 넣고 npm install prompt를 사람이 승인한다.
2. 정상 종료 뒤 자동 수집 가능한 `npx --yes ay-ple@<exact-version>`으로 `ready-relaunch`를 실행한다.

두 command는 `--yes` 유무 외에는 같은 exact package spec이어야 한다. Pages는 S7 뒤에 열리므로 첫 attempt의 command source는 G1/S2가 고정한 release card와 public README다. 실제 Landing body와의 equality는 Ticket 015의 S9가 판정한다.

## Primary-source platform truth

| Surface | 공식 문서에서 직접 확인한 사실 | Smoke consequence |
| --- | --- | --- |
| `npx` exact execution | `npx`는 npm 7부터 `npm exec`를 사용한다. `<pkg>@<version>`을 지정할 수 있고, local dependency는 exact name/version일 때만 match한다. missing package는 npm cache 아래에 설치되어 `PATH`에 추가되며 `--yes`로 prompt를 억제한다. `npx` option은 positional argument 앞에 와야 한다. [npm exec v10](https://docs.npmjs.com/cli/v10/commands/npm-exec/) | Golden manual run은 repo 밖 cwd에서 G1/S2의 public user command를 그대로 붙여 넣는다. 자동 companion이 `--yes`를 더하더라도 manual exact-command receipt를 대체하지 않는다. Node/npm version과 argv를 보존한다. |
| npm offline/cache | `prefer-offline`은 stale check만 생략하고 missing data는 network에서 받는다. `offline`만 network를 금지하며 missing cache는 error다. npm cache는 content-addressable이고 insertion/extraction 시 integrity를 검증하지만, persistent reliable store가 아니며 이전 data의 존속을 보장하지 않는다. `npm cache verify`는 cache integrity를 검사한다. [npm exec caching](https://docs.npmjs.com/cli/v10/commands/npm-exec/#a-note-on-caching), [npm cache v10](https://docs.npmjs.com/cli/v10/commands/npm-cache/) | `same command + network denied`는 supported Node/npm 조합의 black-box observation이다. `npx --offline`은 control lane이지 public user command success의 대리 증거가 아니다. npm cache와 AY verified Runtime cache를 별도 root·evidence로 기록한다. |
| HTTP Range | Server는 `Range`를 무시하고 full representation을 보낼 수 있다. satisfiable range는 보통 `206`, unsatisfiable range는 보통 `416`이며 `416`의 `Content-Range: bytes */N`은 current length를 뜻한다. invalid `Content-Range`는 stored bytes와 결합하면 안 된다. [RFC 9110 Range](https://www.rfc-editor.org/rfc/rfc9110.html#name-range), [Content-Range](https://www.rfc-editor.org/rfc/rfc9110.html#name-content-range) | Resume response를 status별로 판정하고, `200`을 partial 뒤에 append하지 않는다. `206` start/total mismatch와 malformed range는 fail closed다. `416`만으로 download 완료를 인정하지 않고 expected size와 full SHA-256을 다시 확인한다. |
| `If-Range` | Representation이 같으면 range, 다르면 full representation을 보내는 조건이다. Client는 weak ETag를 `If-Range`에 넣으면 안 되고 HTTP date도 strong validator일 때만 쓸 수 있다. [RFC 9110 If-Range](https://www.rfc-editor.org/rfc/rfc9110.html#name-if-range) | Sidecar에는 exact asset identity와 strong validator만 저장한다. validator가 없거나 부적합하면 safe full restart를 허용하고 partial을 다른 representation과 결합하지 않는다. |
| GitHub asset redirect | Public release asset은 unauthenticated download가 가능하다. `Accept: application/octet-stream` API는 direct `200` 또는 `302` redirect를 반환할 수 있어 client가 둘 다 처리해야 한다. [GitHub Release Assets REST API](https://docs.github.com/en/rest/releases/assets?apiVersion=2022-11-28#get-a-release-asset) | 매 retry는 authoritative release asset URL에서 다시 resolve한다. redirect query credential은 log·cache하지 않고, redirect chain과 final `200/206/416`만 redacted evidence로 남긴다. Actual asset의 range behavior는 release마다 다시 관찰한다. |
| Gatekeeper | Downloaded app·plugin·installer를 처음 열 때 identified developer, notarization, alteration을 검사하고 user approval을 요청한다. Gatekeeper는 downloaded software가 쓴 file의 provenance도 추적한다. [Apple Platform Security: Gatekeeper](https://support.apple.com/guide/security/gatekeeper-and-runtime-protection-sec5599b66df/web) | 기본 보안 정책을 유지하고 `xattr -d`, Gatekeeper override, `spctl --add/disable`을 사용하지 않는다. archive와 extracted executable의 quarantine/provenance xattr를 opaque observation으로 남긴다. |
| Signing/notarization | macOS 10.15+에서 App Store 밖 app은 default Gatekeeper 아래 Developer ID signing과 notarization이 필요하다. Signing과 notarization은 별개이며 notarization ticket은 online 또는 stapled일 수 있다. [Apple app code signing](https://support.apple.com/guide/security/app-code-signing-process-sec3ad8e6e53/web), [Apple notarization](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution) | Archive hash가 green이어도 native code trust가 green인 것은 아니다. 각 declared Mach-O의 bytes·mode·signature identity와 actual launch를 별도 gate로 둔다. |
| `codesign`/`spctl` 한계 | `codesign -v`는 signature와 sealed content의 basic consistency를 확인한다. `spctl`은 local policy의 영향을 받는다. Apple은 실제 shipping package를 quarantining channel로 다시 받아 launch하는 최종 Gatekeeper test를 권고하며, TN2206의 `spctl` guidance는 top-level app bundle을 대상으로 한다. [Apple Code Signing Tasks](https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/Procedures/Procedures.html), [TN2206](https://developer.apple.com/library/archive/technotes/tn2206/) | Individual Mach-O에는 `codesign --verify --strict --verbose=4`와 identity dump를 사용한다. top-level `.app`이 있을 때만 bundle-level `--deep`/`spctl`을 의미 있는 보조 evidence로 사용한다. Raw CLI archive는 actual execution을 authority로 둔다. |
| Node child lifecycle | `subprocess.kill()`은 signal을 보낼 뿐 termination을 보장하지 않고, `subprocess.killed`도 signal delivery만 뜻한다. `'close'`는 process 종료와 stdio close 뒤 발생하며 `'exit'` 시점에는 stdio가 열려 있을 수 있다. [Node 22 child_process](https://nodejs.org/download/release/v22.17.1/docs/api/child_process.html) | Product는 shell wrapper 대신 owned child를 직접 spawn하고 child `close`까지 기다린다. macOS descendant cleanup은 Node 문서에서 추론하지 않고 actual process graph로 판정한다. Harness는 PID뿐 아니라 PPID/PGID, run marker, listening port와 lock을 기록한다. |
| Node signals | POSIX에서 `SIGHUP`·`SIGINT`·`SIGTERM` listener를 설치할 수 있고, `SIGINT`/`SIGTERM` listener를 설치하면 Node의 default exit가 제거된다. `SIGKILL`에는 listener를 설치할 수 없고 Node를 무조건 종료한다. [Node 22 process signal events](https://nodejs.org/download/release/v22.17.1/docs/api/process.html#signal-events) | Terminal/session close의 `SIGHUP`을 별도 actual lane으로 검증한다. Graceful handlers는 bounded cleanup 뒤 명시적으로 종료해야 한다. Primary `SIGKILL` 뒤 zero-orphan은 handler로 만들 수 없으며 parent-death/pipe/lease 같은 architecture가 실제로 수렴시키는지 관찰해야 한다. Harness cleanup은 pass evidence가 아니다. |
| macOS process group | macOS `kill(2)`은 negative PID를 해당 absolute process-group ID 전체에 보내는 것으로 정의한다. [Apple `kill(2)` manual](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/kill.2.html) | 외부 harness는 product 밖 별도 process group에서 실행하고, 실패 evidence를 채취한 뒤에만 exact test PGID를 cleanup한다. broad name match나 stale PID kill은 금지한다. |
| Codex state/auth | `CODEX_HOME`은 app-server를 포함한 Codex config, auth, logs, sessions, skills 등의 root이며 지정 시 directory가 이미 존재해야 한다. Managed ChatGPT auth는 Codex가 OAuth·token persistence·refresh를 소유한다. `account/login/start`, completion/update notification, cancel/logout, refresh 가능한 `account/read`가 public surface다. [Codex environment variables](https://learn.chatgpt.com/docs/config-file/environment-variables), [App Server auth endpoints](https://learn.chatgpt.com/docs/app-server#auth-endpoints) | Clean profile마다 app-owned `CODEX_HOME`을 사전 생성한다. Token·auth URL query·user code를 trace에 남기지 않고 method, redacted login identity와 terminal result만 기록한다. |
| App Server action boundary | Connection마다 `initialize`와 `initialized`가 먼저 필요하다. Conversation은 `thread/start`/`thread/resume`, model action은 `turn/start`에서 시작한다. [Codex App Server lifecycle](https://learn.chatgpt.com/docs/app-server#lifecycle-overview) | Auth-only Runtime의 initialization/account calls는 허용하되 `Semester Ready` 전 outgoing `thread/start`, `thread/resume`, `turn/start`와 Skill input count가 정확히 0이어야 한다. JSONL method trace로 판정한다. |
| Project boundary | Codex는 기본적으로 `.git`을 project root marker로 사용한다. `project_root_markers = []`이면 parent search를 생략하고 current working directory를 root로 취급한다. [Codex advanced configuration](https://learn.chatgpt.com/docs/config-file/config-advanced#project-root-detection) | Parent Git fixture 안 workspace smoke는 app-owned config의 fixed boundary가 실제 pinned Codex에서 ancestor `AGENTS.md`와 `.codex/`를 배제하는지 unique canary로 검증한다. |
| Instructions/Skills | `AGENTS.override.md`가 같은 scope의 `AGENTS.md`보다 우선하며 project root부터 cwd까지 instruction을 합친다. Skills는 repo의 cwd→repo root뿐 아니라 `$HOME/.agents/skills`, `/etc/codex/skills`, system에서도 발견되고 duplicate name도 merge되지 않는다. [Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [Build skills](https://learn.chatgpt.com/docs/build-skills#where-to-save-skills) | Unexpected workspace override·extra Skill은 bundle-valid와 별개의 effective-context blocker다. `CODEX_HOME`만으로 `$HOME/.agents/skills`가 격리된다고 주장할 수 없다. |

## Actual public smoke protocol

| Phase | 필수 실행·evidence | Blocking result |
| --- | --- | --- |
| C0 clean proof | 초기화한 Apple Silicon macOS VM snapshot 또는 새 standard OS user, default Gatekeeper, supported `node --version`·`npm --version`·Chrome, npm project/repository 밖 cwd를 기록한다. `ay-ple` npx entry, AY app data·app-owned `CODEX_HOME`/auth·Runtime cache·workspace가 없음을 root별 manifest로 증명한다. 환경변수로 `HOME`만 바꾼 것은 clean Mac 증거가 아니다. OS의 `/usr/bin/python3` 존재 자체를 fail로 삼지 않고 process executable audit로 repository/system Python을 전혀 사용하지 않았음을 판정한다. | Existing AY package/cache/auth/workspace, repo-local resolution, modified Gatekeeper policy가 있으면 시작하지 않는다. |
| C1 exact public entry | G1/S2 release card·public README command를 그대로 실행하고 exact package name/version, npm registry response, resolved tarball integrity, PID/PPID/PGID와 argv를 기록한다. Automation-only `--yes` run은 별도 receipt다. | Local package/link/workspace dependency, moving tag, 다른 version 실행은 fail이다. |
| C2 preflight | Unsupported Node/npm/arch, disk, writable roots를 확인한다. Preflight부터 immutable bundle source capture까지 workspace path mutation journal을 연다. | Unsupported prerequisite 또는 package resource missing/corrupt 때 workspace mutation이 0이 아니면 fail이다. |
| C3 Runtime delivery | Original GitHub asset URL, redacted redirect chain, `200/206/416`, partial sidecar, expected bytes/SHA-256, retained archive, extracted complete-tree·mode·Mach-O signature와 untouched xattr를 기록한다. Verified 뒤에만 atomic cache promotion한다. | Hash/manifest/tree mismatch, exact pair가 아닌 fallback, automatic downgrade, unverified executable launch는 fail이다. |
| C4 managed OAuth | S7 golden은 App Server initialize, `account/read`, managed login과 matching completion/update, fresh ChatGPT account read를 method trace로 기록한다. Actual cancel·Browser close·reconnect는 I2가, expiry·response-loss·race matrix는 I0가 별도 profile에서 검증한다. | Secret material log, 다른 Codex home 재사용, auth terminal state 합성은 fail이다. |
| C5 scaffold/pre-Ready native gate | Ticket 011 transaction identity 아래 app mutation만으로 manifest, `AGENTS.md`, declared Skill complete tree를 no-clobber install·verify해 `prepared`를 commit한다. Auth-only Runtime을 완전히 닫고 exact workspace Runtime을 시작한 뒤 internal non-Browser port로 `config/read(cwd, includeLayers=true)`, `skills/list(cwds=[workspace], forceReload=true)`와 fresh ChatGPT account read를 통과해야 `active_ready`를 commit한다. | Ready 전에 thread/turn/Skill input, partial tree, undeclared overwrite, unverified config layer·repo Skill set·account가 있으면 fail이다. |
| C6 I2 post-Ready instruction-source conformance | I2 product Ready 뒤 exact Runtime launch attestation을 freeze하고 product host·Runtime·lease를 완전히 닫는다. Public tarball에서 제외된 repository-only harness가 같은 executable digest·argv/config·canonical cwd·controlled `HOME`·app-owned `CODEX_HOME`으로 Runtime 하나를 재현한다. `thread/start(cwd=<workspace>, ephemeral=true)` 1회의 `instructionSources`만 읽고 Turn 없이 unsubscribe·Runtime close한다. S7은 이 harness를 실행하지 않고 same-candidate I2 receipt를 참조한다. | Response cwd 불일치, `thread.ephemeral != true`, `thread.path != null`, Turn 존재, rollout byte 생성, ancestor/user source 또는 process/session 잔존은 candidate fail이다. 이 conformance는 Ready precondition을 소급 대체하지 않는다. |
| C7 relaunch/cleanup | Browser tab close는 host/operation을 취소하지 않으며 exact Origin을 다시 열면 같은 transaction을 observe/join해야 한다. 정상 host 종료 뒤 automated command로 exact application/Runtime/account/workspace를 재사용하고 wizard 없이 compact status center를 연다. 매 relaunch마다 manifest·bundle·effective context·fresh account를 다시 검증한다. 종료 뒤 owned PID 0, listening port 0, lock reacquire green을 기록한다. | Browser close가 operation을 취소하거나 불필요한 Runtime 재다운로드·reauth, stale receipt만으로 Ready 합성, orphan/port/lock 잔존이면 fail이다. |

Happy path phase state는 다음 순서를 건너뛰지 않는다.

```text
candidate_bound
  → clean_baseline
  → preflight_passed
  → runtime_verified
  → local_ui_available
  → account_connected
  → workspace_approved_prepared
  → workspace_runtime_context_verified
  → semester_ready
  → i2_instruction_sources_conformed
  → ready_relaunch
  → clean_shutdown
```

`account_connected`까지 workspace mutation이 0이고 `semester_ready`까지 `thread/start`, `thread/resume`, `turn/start`, Skill input은 모두 0이다. `prepared`는 app-side manifest·seam·bundle·workspace-local conflict의 fresh validation이다. 그 뒤 auth-only Runtime의 완전한 종료, exact workspace Runtime start, native `config/read`·`skills/list`와 fresh ChatGPT account read가 `workspace_runtime_context_verified`를 만들며, 그 뒤에만 `active_ready`를 atomic commit한다. I2 conformance thread에는 Turn이 없고 학생의 학업 state를 만들지 않는다. S7 direct phase sequence는 `semester_ready → ready_relaunch`이며 retained I2 receipt의 candidate equality를 별도 blocking assertion으로 확인한다.

Trace는 append-only JSONL로 `runId`, monotonic sequence/time, phase, PID graph, redacted request identity, filesystem mutation, hash, protocol method, terminal outcome을 가진다. OAuth tab·verification URL·user code의 screenshot은 만들지 않는다. Gatekeeper와 local product UI의 screenshot만 owner-only artifact로 보존한다.

### Native context oracle

Exact pinned generated protocol은 `config/read`의 `cwd`·`includeLayers`, `skills/list`의 `cwds`·`forceReload`와 returned `path`·`scope`, `thread/start` response의 `instructionSources`를 가진다. 이는 [generated protocol types](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/generated/v2_all.py)로 pin한다. 현재 high-level Python SDK에 모두 노출된 product method라는 뜻은 아니므로 implementation은 두 internal non-Browser seam을 만든다.

1. Production pre-Ready guard는 workspace Runtime의 narrow `config/read`·`skills/list` port를 사용한다. Static complete-tree/conflict scan과 이 native result가 모두 green이어야 Ready를 commit한다. 이 product-private port는 Browser/API에 노출하지 않는다.
2. Release-only post-Ready conformance는 I2에서만 실행한다. Product host는 ordinary production launch path가 실제 사용한 executable/manifest digest, root-aliased argv·cwd와 allowlisted fixed session-config digest, controlled `HOME`·`CODEX_HOME` root alias를 secret-free launch attestation으로 남긴다. Credential·auth state와 arbitrary environment는 attestation 입력이 아니다. Host·Runtime·lease가 모두 사라진 뒤 repository-only harness가 attestation과 exact-match하는 환경으로 pinned Runtime 하나를 시작한다. Harness는 public tarball·candidate digest에 들어가지 않으며 product behavior를 patch하지 않는다.
3. Harness는 `thread/start(cwd=<canonical-workspace>, ephemeral=true)`를 호출하고 response의 top-level/thread cwd equality, `thread.ephemeral == true`, `thread.path == null`, empty turns와 `instructionSources` projection만 확인한다. `turn/start`·archive·delete는 호출하지 않고 `thread/unsubscribe` 뒤 Runtime을 완전히 닫는다. `CODEX_HOME` before/after manifest에서 rollout byte 0, process/session 0을 확인한다. Exact pin은 active ephemeral thread의 `thread/delete`를 거절하므로 delete success를 oracle로 삼지 않는다.

Hostile fixture는 다음을 함께 둔다.

- 선택한 workspace parent의 Git root에 unique ancestor `AGENTS.md`, `.codex/config.toml`, `.agents/skills/<ancestor-canary>`를 둔다.
- ambient user home의 `.agents/skills/<user-canary>`를 두되 product child는 별도 controlled `HOME`과 app-managed `CODEX_HOME`으로 실행한다.
- workspace에는 package-declared `AGENTS.md`와 declared built-in Skill roots만 둔다.

Pre-Ready oracle은 `project_root_markers=[]` session override가 effective config에 존재하고 repository scope의 Skill path set이 descriptor와 exact equality임을 요구한다. App-side scan은 unexpected workspace override·`.codex/`·descriptor-outside Skill을 먼저 막는다. I2 post-Ready oracle은 `instructionSources`의 workspace/repository subset이 declared source와 exact equality인지 확인한다. 두 oracle 모두 ancestor·ambient-user canary가 0이어야 한다. Official SYSTEM/ADMIN source·Skill은 기록 대상이지 “제거됨”의 대상이 아니다.

## Actual-vs-scripted boundary

| Scenario | Actual public Mac | Scripted resolver/fault harness |
| --- | --- | --- |
| First download | 실제 npm·GitHub Release·redirect·full hash·native execution | DNS/HTTP unavailable, timeout과 truncated body |
| Resume | S7에서 실제 transfer를 중단하고 재실행해 observed `200` 또는 `206`를 처리 | `200` safe restart, valid/malformed `206`, exact/short/long `416`, validator change 전체 matrix |
| Cache | S7 public bytes에서 GitHub delivery만 차단한 exact generation reuse·retained archive repair, GitHub를 다시 연 exact asset reacquisition | I1/I2의 non-public candidate transport와 scripted corrupt tree/archive, missing exact asset, different cached version |
| Rollback | 첫 release에는 rollback command 미노출와 current descriptor→executed Runtime identity equality만 검사 | unavailable current + seeded older의 no-auto-downgrade와 synthetic prior exact-pair rollback; 실제 prior public pair 뒤 actual lane 추가 |
| macOS trust | exact public path와 별도 quarantining download control에서 xattr·dialog·launch 관찰 | code-sign/hash fixture만 담당하고 Gatekeeper success를 합성하지 않음 |
| Browser lifecycle | 모든 tab을 닫아도 foreground host와 operation이 유지되고 exact Origin reopen이 같은 transaction을 observe/join | duplicate tab·approve·response loss |
| Host signals/crash | `SIGHUP`, `SIGINT`, `SIGTERM`, primary `SIGKILL`의 대표 externally observable checkpoint | Ticket 011의 모든 commit 전후, discard replay와 account race를 결정론적으로 주입 |

HTTP resume oracle은 다음과 같이 고정한다.

- `206`: `Content-Range.first == localLength`이고 total이 descriptor bytes와 같을 때만 append한다.
- `200`: Range가 무시되었거나 representation이 바뀐 것이므로 old partial에 append하지 않고 byte 0부터 새 temp file로 교체한다.
- `416`: returned total, local length, expected bytes가 모두 같을 때만 full file SHA-256을 검사한다. 그 외에는 discard 후 full restart다.
- Content coding이 있으면 range는 encoded bytes 기준이므로 archive identity와 다른 encoding은 거절하거나 `identity` transfer로 고정한다.
- Final SHA-256·manifest·complete tree가 모두 green이 되기 전에는 verified cache 이름으로 rename하거나 실행하지 않는다.

## Fault trace family와 합격 invariant

| Trace family | 실행 class | 필수 invariant |
| --- | --- | --- |
| F0 clean public golden + relaunch | S7 | 하나의 strict complete state, exact public bytes, `Semester Ready`, wizard 없는 relaunch, clean shutdown |
| F1 package bundle/context | I1·I2 | package resource failure는 workspace mutation 0, no-clobber install, declared complete tree와 model-free context oracle |
| F2 atomic envelope cut | I0 + representative I2/S7 `SIGKILL` | `approved → prepared → active_ready`, 모든 deterministic boundary에서 old-or-new complete state만 존재 |
| F3 discard replay | I0 | 어떤 unlink보다 durable `discard_requested`가 먼저이고 exact known-owned entry만 no-follow 정리한 뒤 같은 captured root identity만 제거 |
| F4 Browser/concurrency | I0·I1·I2·S7 | same-plan join, different-plan conflict, tab close 뒤 host/operation 지속, 최대 host/listener/Runtime/writer 1 |
| F4b process lifecycle | I1·I2·S7 | `SIGHUP`·`SIGINT`·`SIGTERM`·representative `SIGKILL` 뒤 product-owned bounded child/port/lease cleanup |
| F5 auth/Runtime transition lease | I0·I2 | auth-only Runtime 완전 종료 뒤 workspace Runtime, ambiguous close는 restart 요구, same-process second Runtime 금지 |
| F6 resolver/delivery | scripted·I2·S7 | 모든 class에서 current exact Runtime만 실행하고, scripted lane이 fallback·auto-downgrade 0을 닫으며 S7은 public identity equality를 닫음 |
| F7 Browser-safe projection | I0·I1 | UI/API가 allowlisted coarse state만 노출하고 receipt를 authority로 승격하지 않음 |

Single-envelope fault injection은 temp write·file sync·rename·directory sync·readback의 직전·직후, success response 유실과 duplicate request를 모두 가진다. Exhaustive exact `SIGKILL` timing을 black-box claim으로 만들지 않는다. I2/S7은 `approved`, `prepared`, `active_ready`처럼 외부에서 식별 가능한 checkpoint의 대표 process kill만 수행한다.

Discard replay 판정은 다음처럼 고정한다.

- target absent는 cleanup complete 후 empty state commit이다.
- Matching `owned_incomplete`에서 `discard_requested`와 root device/inode/birthtime을 어떤 unlink보다 먼저 durable하게 남긴다. Receipt-known app-created entry의 type·digest·identity가 fresh match할 때만 no-follow leaf-first unlink/empty-directory removal을 수행하고 마지막에 same-identity empty root를 `rmdir`한다.
- I0는 `discard_requested` 직전·직후, 각 known-entry unlink 직전·직후, final root `rmdir`과 final envelope clear 직전·직후를 모두 fault-inject한다.
- `discard_requested`가 durable하고 같은 captured root identity인 markerless empty는 final `rmdir`을 재개할 수 있다.
- mkdir 뒤 marker가 생기기 전 crash처럼 durable discard evidence가 없는 markerless empty는 보존하고 manual recovery로 간다.
- Unknown·modified entry가 있는 nonempty root, symlink, identity drift, admitted/prepared/Ready target은 bytes를 보존하고 delete/discard를 제안하지 않는다.

Missing declared workspace file은 explicit absent-only recovery를 허용한다. Modified byte, in-root extra entry, symlink, workspace-local `AGENTS.override.md`·`.codex/`, descriptor 밖 Skill은 자동 덮어쓰기·삭제 없이 `manual_recovery_required`로 action을 막는다.

Transition 중 login·cancel·logout·workspace start는 하나의 account/Runtime lease 아래 직렬화한다. Runtime close 결과가 모호하면 current process에서 두 번째 Runtime을 시작하지 않고 process restart 뒤 reconcile한다.

첫 public release에는 실제 이전 public pair가 없고 S7 clean baseline에도 older generation이 없다. 따라서 S7은 rollback command가 UI/CLI/public README·release card에 없고 current descriptor가 pin한 Runtime identity와 실제 실행 identity가 같은지만 확인한다. `200/206/416` 전체 matrix, unavailable exact asset + seeded older의 no-auto-downgrade, synthetic prior still-supported exact-pair rollback은 scripted resolver가 소유한다. 실제 이전 public pair가 생긴 뒤에만 S7에 actual rollback/no-downgrade lane을 추가한다.

### Isolated profile matrix

각 destructive/network/auth profile은 fresh OS user 또는 reverted VM snapshot을 기본으로 하고 시작 전 baseline manifest를 남긴다. Public black-box path에 실제 지원되는 root selector가 생기기 전에는 `HOME` override나 test-only env만으로 clean profile을 합성하지 않는다. Profile마다 npm cache, Browser profile, app-data root, app-managed `CODEX_HOME`·auth, Runtime cache, workspace parent/hostile parent fixture, process group·listener·lease namespace가 겹치지 않아야 한다. Independent OAuth case는 credential/session을 공유하지 않는다. P0의 normal close→same-version relaunch와 P3b의 의도적인 cache seed처럼 같은 lifecycle을 검증하는 단계만 앞 단계 state를 재사용한다. I0의 pure deterministic Module test는 OS profile 대신 isolated temp roots를 쓸 수 있다.

| Profile | Evidence class | 주입·행동 | Expected observable outcome |
| --- | --- | --- | --- |
| P0 clean golden | S7 | 사용자 표시 exact command → OAuth → 승인 → Ready → normal close → automated relaunch | Guided → Compact Ready, exact Runtime/account/workspace 재검증, orphan 0 |
| P1 unsupported prerequisite | I1 | 범위 밖 Node/npm/arch 또는 insufficient disk/read-only app root | actionable preflight error, Runtime/OAuth/workspace mutation 0 |
| P2 interrupted public delivery | S7 | actual GitHub transfer를 partial sync 뒤 중단하고 같은 exact command 재실행 | observed valid `206` resume 또는 `200/416` safe restart, final exact SHA; status 전체 matrix claim 금지 |
| P3 local cache fault | scripted·I1·I2 | retained non-public candidate transport에서 generation/archive missing·corrupt, unavailable current + seeded older | valid generation reuse·archive repair·controlled reacquisition, seeded older 실행 0; public identity claim 0 |
| P3b exact public cache | S7 | P0과 별도 profile에서 verified public generation/archive를 seed한 뒤 GitHub selectively blocked/open | exact generation reuse, retained archive repair와 public exact asset reacquisition |
| P4 managed auth | I0·I2 | actual cancel·Browser close·reconnect, deterministic expiry/response loss와 concurrent login/cancel/logout | pre-workspace `login_required` 또는 pending/Ready bytes 보존 `account_required`; matching completion + fresh ChatGPT read 전 진전 0 |
| P5 package/workspace context | I1·I2 | package resource missing/corrupt, declared file absent, modified/extra/symlink, hostile parent/user canary | package fault는 workspace mutation 0; absent-only explicit repair; 그 외 byte-preserving `manual_recovery_required` |
| P6 setup transaction | I0 | 모든 envelope/fsync boundary, duplicate approve/tab, response loss, different plan, discard replay | same transaction join, different plan `setup_conflict`, old-or-new complete envelope, unsafe delete 0 |
| P7a Browser lifecycle | I1·I2·S7 | operation 중 모든 tab close, exact Origin reopen, duplicate invocation | host/operation은 계속되고 reopen/duplicate가 same transaction·Origin을 observe/join; Runtime/host/writer 1개 |
| P7b host lifecycle | I1·I2·S7 | `SIGHUP`, `SIGINT`, `SIGTERM`, representative primary `SIGKILL` | bounded child/process/port/lease cleanup 또는 명시적 non-green; harness cleanup은 pass 아님 |
| P8 macOS trust | I2·S7 | untouched actual download와 별도 quarantine-channel control에서 verify/launch | exact digest·`codesign --verify --strict`·actual native execution green; xattr/`spctl`은 관찰값 |

OAuth expiry timing과 모든 race는 I0가 결정론적으로 닫고 I2는 실제 cancel·close·reconnect 표본을 닫는다. S7 golden에 장시간 expiry를 억지로 유도하지 않는다. S7의 actual GitHub negative lane도 production release asset을 삭제하거나 바꾸지 않으며, corrupt/tamper case는 명시적인 derived candidate로 격리한다.

## Evidence record와 privacy

```text
SmokeRun
  schemaVersion
  evidenceClass
  runId / caseId / releaseAttemptId / candidateDigest
  candidate
    sourceSha
    npm name/version/dist.integrity/tarballSha256
    runtime releaseId/tag/asset/archive/manifest digests
    workspaceBundle descriptor/tree digests
  environment
    macOS/arch/Node/npm/browser/tool versions
    clean-profile assertions
  phases[]
    phaseId, timestamps, expected/observed outcome, assertionRefs
  fault
    boundary, injection/kill method, durable state before/after
  process
    role graph, listener/origin, signal/exit, cleanup result
  artifacts[]
    kind, sha256, privacyClass
  result
    passed | failed | blocked
```

Owner-only evidence bundle은 `index.json`, `machine-attestation.json`, `events.jsonl`, relative filesystem manifests, process graph, network receipts, native method counts, redaction report와 artifact SHA index를 가진다. Full local paths·PIDs·UI screenshots는 owner-only다. Public receipt는 root alias, coarse outcome, candidate/evidence digest만 가진다.

Native RPC raw request/response와 raw config layer를 evidence에 저장하지 않는다. Allowlisted projection은 method/count, effective `project_root_markers`, layer source type·version과 root-aliased source path, relative Skill name/path·scope·enabled state·complete-tree digest, root-aliased `instructionSources`, thread의 ephemeral/path/turn-count assertion뿐이다. Config의 arbitrary value, Skill description/content와 absolute native path는 보존하지 않는다.

OAuth verification URL, user code, native login ID, token/JWT, auth file bytes·hash, account email, signed redirect query와 raw provider error는 owner-only bundle에도 보존하지 않는다. S7 publication receipt는 redacted evidence bundle digest만 Ticket 015의 application binding ledger에 연결한다.

Green은 모든 blocking class가 같은 candidate binding을 가리키고 필수 trace family가 `passed`이며, S7가 실제 public bytes로 끝났을 때만 성립한다. `unknown`, inferred source, manual security override, broad cleanup command나 harness cleanup으로만 process가 사라진 경우는 green이 아니다.

## Blocking oracle gaps

| Gap | Green을 합성할 수 없는 이유 | Ticket 016에서 요구할 closure |
| --- | --- | --- |
| Same-command full offline relaunch | npm은 cache retention을 보장하지 않고 ordinary exact command의 no-network success도 보장하지 않는다. | 첫 release contract로 약속하지 않는다. Runtime-cache lane은 GitHub만 차단하고 exact public package와 provider network는 계속 사용할 수 있게 분리한다. |
| Node-downloaded quarantine | Apple 문서는 Node downloader가 archive·extracted CLI에 어떤 xattr를 부여·전파하는지 규정하지 않는다. | Product path와 quarantining-channel control을 모두 실제 Mac에서 관찰하고 차이를 기록한다. |
| Mixed CLI Gatekeeper | TN2206의 definitive `spctl` flow는 top-level app bundle 중심이며 mixed Developer ID/ad-hoc CLI archive의 사용자 경험을 확정하지 않는다. | Actual untouched launch가 green이어야 한다. Block되면 packaging/signing decision을 다시 연다. |
| `SIGKILL` descendants | `SIGKILL` cleanup handler는 불가능하고 parent kill이 descendants를 자동 종료한다는 Node 보장도 없다. | Product-owned parent-death/pipe/lease 수렴과 bounded zero-orphan을 actual trace로 증명한다. |
| User Skill exclusion | Official discovery는 `$HOME/.agents/skills`를 읽으며 `CODEX_HOME`과 별도다. | Ambient user canary가 있는 I2 profile에서 controlled `HOME`을 사용하고 `skills/list(forceReload=true)`의 path·scope로 배제를 증명한다. |
| Effective context oracle | Exact pin은 `config/read`, `skills/list`, `thread/start.instructionSources`를 제공하지만 현재 product high-level SDK가 이 release probe를 모두 노출하지 않는다. | Pre-Ready production narrow port가 config·Skill scope를 닫고, I2는 product launch attestation과 exact-match하는 host-shutdown replay에서 ephemeral thread 1개로 source를 판정한다. S7은 retained I2 digest를 참조한다. |
| OAuth offline/expiry timing | 공식 문서는 managed token persistence/refresh와 account methods는 보장하지만 offline refresh timing, Browser close 뒤 상태, storage-level isolation 결과를 규정하지 않는다. | I2 actual cancel·close·reconnect와 I0 deterministic expiry·response-loss/race를 분리하고 private token format을 oracle로 사용하지 않는다. |
| Actual GitHub range behavior | GitHub는 asset download의 `200/302`만 계약하고 특정 CDN의 `206/416` behavior는 보장하지 않는다. | 매 immutable AY-PLE asset에 actual interruption test를 실행하고 전체 status matrix는 scripted resolver가 닫는다. |

Release smoke는 위 gap 중 하나라도 `unknown`, `manual override used`, `harness cleanup required`, `source inferred`이면 green이 아니다. 자료 import, 학업 action과 confirmed academic state는 이 protocol의 범위 밖이다.

## Current repository gap

현재 구현은 이 protocol을 실행할 수 없다.

- Public `ay-ple` package/bin, production foreground host, Landing, release-generated exact command가 없다.
- Runtime delivery는 pre-materialized package-local bundle verifier이며 GitHub descriptor/download/resume/cache/repair를 소유하는 `RuntimeResolver`가 없다.
- Product account contract는 pre-workspace managed login/cancel/logout과 auth-only → workspace Runtime transition을 제공하지 않는다.
- Semester workspace는 existing directory/current v2 store를 열며 v3 admission, canonical bundle, single setup envelope, active registry와 Ready relaunch가 없다.
- Runtime launch와 product action admission에 fixed `project_root_markers=[]`, controlled `HOME`, complete-tree/effective-context guard와 위 model-free native probe가 없다.
- Browser `SetupJourney`, Guided → Compact Ready status center와 allowlisted Browser-safe coarse-state projection은 immutable prototype evidence일 뿐 production worktree에 구현되지 않았다.
- 현재 dogfood/product entrypoint는 repository·Vite·fixed port·pre-materialized Runtime 또는 auth seed를 사용하므로 clean public evidence가 아니다.
- RC generator, publication ledger, five-class smoke recorder와 public receipt generator가 없다.

따라서 이 research의 `resolved`는 release protocol이 결정됐다는 뜻이지, 현재 candidate가 smoke green이거나 public publish가 가능하다는 뜻이 아니다.
