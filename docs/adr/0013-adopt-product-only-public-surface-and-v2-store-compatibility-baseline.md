# Product-only public surface와 durable v2 store baseline을 채택한다

분류: 활성

성숙도: 채택

부분 대체한 결정: [ADR 0012 — Codex Chat-only runtime을 채택하고 legacy 실행 표면을 제거한다](0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md)의 Chat-only public surface, 네 HTTP route와 root development entrypoint에 관한 결과

보존하는 결정: [ADR 0011 — Official Codex Python SDK를 Chat Shell runtime baseline으로 재사용한다](0011-reuse-official-codex-python-sdk-for-chat-shell.md), ADR 0012의 single maintained Runtime graph와 no-alias hard cutover 원칙

후속 결정과의 관계: [ADR 0014 — SemesterWorkspace를 app-owned normalized scaffold로 생성한다](0014-create-app-owned-normalized-semester-workspaces.md)는 public workspace admission을 새로 정하지만 이 ADR의 current v2 bytes 보존과 explicit migration 원칙을 대체하지 않는다.

## 맥락

Official Python SDK 기반 `@ay-ple/codex-chat-runtime`과 supervised Node→Python→App Server process graph는 First Assignment action에 필요한 exact native lifecycle, managed Skill, Plan interaction, private MCP, permission profile과 bounded cleanup을 증명했다. 그 위의 product Server와 Browser는 chooser·development materializer가 넘긴 explicit current directory, 두 TXT `SourceSelection`, evidence-linked `StatePatch`, 세 갈래 Review, confirmed `SemesterModel`, continuity loss와 current-v2 recovery까지 deterministic Browser와 exact Runtime gate에서 통과했다. 이 구현 증거는 ADR 0014의 app-owned workspace admission을 증명하지 않는다.

반면 `/api/codex-chat/*`, full-screen legacy Chat owner, fixed `deny_all + read_only` copy와 `dev:chat-only`는 이 제품 흐름을 구현하기 전 integration tracer의 public surface였다. Product caller는 이미 `/api/product/*`를 사용하므로 두 public surface를 함께 유지하면 별도 지원 경로와 permission 의미가 계속 존재하는 것처럼 보이고, root caller가 Runtime artifact와 여섯 path를 직접 조립해야 한다.

Workspace-local product store도 cutover 전까지는 pre-release current-only format이었다. 이제 confirmed Assignment와 settled history가 실제 product path에서 Server restart 뒤 다시 열리므로, rollback이나 후속 schema 변경이 이 상태를 silent reset해도 되는 구현 세부로 취급할 수 없다.

## 결정

- Canonical local app의 public Server surface는 `/api/product/*` 하나다. 네 `/api/codex-chat/*` route, tracer status, legacy Browser Chat owner와 `dev:chat-only`는 compatibility alias, redirect 또는 별도 supported entrypoint 없이 제거한다.
- Root `npm run dev`가 유일한 supported local composition entrypoint다. 이 command는 persistent profile과 existing workspace를 한 composition에 결합한다. Composition은 `packageRoot`에서 verified Runtime artifact를 찾고 profile의 `appDataRoot` 아래에서 app-managed `HOME`, `CODEX_SQLITE_HOME`, temporary/runtime state를 계산하되 Codex account는 caller의 전역 `CODEX_HOME`을 사용한다. Caller가 여섯 `CODEX_CHAT_*` path를 조립하지 않으며 별도 dogfood entrypoint, auth profile이나 compatibility topology를 만들지 않는다. Exact current defaults와 override 사용법은 [Server README](../../apps/server/README.md)가 소유한다.
- Current product native `cwd`는 controller가 internal `ready`로 연 current directory의 canonical root와 정확히 같다. `CODEX_CHAT_WORKSPACE`는 manual development materializer의 caller-owned directory selection override로만 남으며 Runtime root, 별도 `cwd` authority 또는 장기 product identity가 아니다. Public `SemesterWorkspace` admission과 identity는 ADR 0014가 후속 결정한다.
- Official Python SDK direct reuse, exact native bundle, ordered patch stack, private bridge, one supervised Runtime graph와 bounded process cleanup은 유지한다. `CodexChatService`는 Account Readiness, product thread·Turn, interaction·interrupt, Runtime terminal observation·recycle·close를 캡슐화하는 product lifecycle Module로 유지한다. 내부 text operation과 regression oracle은 product lifecycle 검증에 필요하면 남길 수 있지만 public HTTP·Browser compatibility surface가 아니다.
- First Assignment product Turn은 검증된 `auto_review + workspace_write` permission을 사용하며 Codex execution permission과 AY-PLE `UserConfirmation`은 계속 별도 authority다. 제거한 fixed tracer copy를 제품 permission 계약으로 계승하지 않는다.
- Cutover 시점의 exact current canonical `formatVersion: 2` workspace store를 첫 durable compatibility baseline으로 채택한다. 이 store가 보존하는 confirmed state와 settled history는 app version rollback, Server restart 또는 public-surface cutover 때문에 삭제·reset하지 않는다.
- Pre-release v1과 noncanonical v2는 baseline 이전 format이므로 migration을 새로 제공하지 않는다. Current decoder를 통과하지 못하는 bytes는 원본을 보존한 `incompatible/readOnly`로 연다.
- Baseline 이후 physical schema를 바꾸려면 explicit version bump와 migration을 함께 제공하거나, 지원하지 않는 version을 원본 bytes 보존 상태로 fail closed해야 한다. 같은 version에서 필수 shape를 조용히 바꾸거나 decode 실패를 empty state로 reset하지 않는다. Generic migration framework는 실제 version change보다 먼저 만들지 않는다.
- `WorkspaceManifest`를 도입한다는 이유만으로 current v2 directory를 canonical `SemesterWorkspace`로 자동 분류하거나, current v2 bytes에 identity·Course field를 조용히 복사·삭제·reset하지 않는다. Current v2가 이미 소유한 stable workspace ID·Course identity와 `WorkspaceManifest` 사이에는 하나의 authority만 남아야 하며, 물리적 통합 또는 분리는 explicit version·migration과 bytes-preserving failure contract로 결정한다.

## 검토한 선택지

| 선택지 | 판정 | 이유 |
| --- | --- | --- |
| Product와 tracer public surface를 함께 유지 | 거절 | Product caller가 없는 route와 fixed permission copy가 별도 지원 계약처럼 남고 shutdown·test·문서 graph를 넓힌다. |
| `/api/codex-chat/*`를 `/api/product/*` alias로 유지 | 거절 | Native text conversation과 product operation은 identity, activity와 authority가 달라 의미가 맞지 않는다. |
| Product cutover에서 Runtime package도 교체 | 거절 | Exact SDK·native lifecycle과 product conformance가 이미 green이며 public caller 제거는 Runtime 재설계 근거가 아니다. |
| App startup caller가 여섯 Runtime path를 계속 조립 | 거절 | `packageRoot`, `appDataRoot`, `workspaceRoot` 소유권을 caller wiring에 다시 분산하고 잘못된 `cwd` authority를 허용한다. |
| v2 이전 store를 모두 자동 migration | 거절 | User-released baseline 전의 여러 shape를 장기 production branch로 고정하고 검증되지 않은 복구를 성공으로 합성한다. |
| Store decode 실패를 empty state로 reset | 거절 | Workspace-local confirmed state와 history를 조용히 잃고 rollback 가능성을 훼손한다. |

## 결과

Current public topology, exact endpoint와 process gate는 [Codex Chat 구현 지도](../architecture/codex-chat-implementation-map.md)가 소유한다. Runtime artifact·process의 package 계약은 [runtime README](../../packages/codex-chat-runtime/README.md), Server startup·store의 exact current behavior는 [Server README](../../apps/server/README.md), Browser behavior는 [Chat Shell README](../../apps/chat-shell/README.md)가 소유한다.

App-owned `WorkspaceManifest`와 scaffold의 adopted target은 ADR 0014가 소유한다. 현재 chooser/current-v2 workspace를 그 target으로 이관하는 구현이 생기기 전에는 current bytes를 그대로 보존하며, public setup 성공이나 `Semester Ready`로 합성하지 않는다.

ADR 0012가 제거한 legacy Runtime graph와 no-alias hard cutover는 계속 유효하다. 이 결정은 ADR 0012의 Chat-only public-surface 결과만 product-only surface로 교체하며, 삭제한 graph·local residue를 복구하거나 두 번째 engine abstraction을 도입하지 않는다. 후속 conversation persistence, multi-client isolation, interactive Codex approval, recent-workspace registry와 packaged Desktop lifecycle의 작업 순서는 [개발 백로그](../product/ay-ple-development-backlog.md)가 소유한다.
