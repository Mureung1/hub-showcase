# Bootstrap·setup durability와 recovery 최소 Interface 조사

조사일: 2026-07-23

대상: [Bootstrap과 setup의 durability·recovery contract를 확정한다](../tickets/011-bootstrap-and-setup-recovery.md)

## 판정

첫 public preview에는 setup 전용 database나 generic workflow engine을 추가하지 않는다. Browser-facing `SetupJourney`는 `reconcile(command)`와 `observe()` 두 entry point만 제공하는 깊은 Module로 두고, app data의 단일 versioned state envelope가 `empty | pending | active_ready` 중 하나만 atomic하게 소유하게 한다. `reconcile({ kind: 'launch' })`는 primary host가 single-instance lease를 얻고 package·bundle·Runtime identity를 검증한 뒤 한 번 시작하며 Browser HTTP decoder에는 노출하지 않는다. Browser의 모든 mutation은 exact-Origin을 통과한 `prepare | approve | recover` command로만 들어온다.

Durable setup은 생성 승인에서 시작한다. 승인 직후 exact plan과 application·Runtime·bundle·target·expected `WorkspaceManifest` identity를 bind한 `pending/approved` receipt를 workspace mutation보다 먼저 sync한다. Workspace aggregate, required directory seam, workspace instruction/Skill bundle과 effective native context가 fresh validation을 통과하면 같은 receipt를 `pending/prepared`로 바꾼다. Auth-only Runtime close, exact workspace `cwd`의 새 Runtime start와 fresh managed ChatGPT account read가 모두 성공한 뒤에만 **같은 app-data envelope를 한 번 atomic replace**해 pending receipt를 제거하고 `active_ready` pointer를 publish한다. Process state인 `transitioning`이나 별도 `authenticated=true`는 durable phase로 저장하지 않는다. 단, matching `owned_incomplete`를 폐기하라는 사용자의 명시적 의도는 삭제보다 먼저 `pending/discard_requested`로 기록해 중단 뒤 scaffold 재개로 되돌아가지 않게 한다.

이 설계의 핵심은 app-data commit과 workspace filesystem을 하나의 가짜 transaction으로 묶지 않는 것이다. Workspace side effect는 receipt 이후에만 시작하고, 중단 뒤에는 receipt와 app-owned root marker·v3 aggregate·bundle의 현재 evidence를 다시 대조해 idempotent하게 계속한다. Exact evidence가 아니면 성공이나 ownership을 추측하지 않는다. 이미 admitted workspace와 valid bundle까지 생겼다면 Runtime transition 실패에도 data를 보존하고 `resume`·reauth·account/Runtime retry만 제공하며 discard를 절대 제시하지 않는다.

## 범위와 용어

- `SemesterWorkspace`, `WorkspaceManifest`, `Semester Ready`의 의미는 [CONTEXT.md](../../../../CONTEXT.md)를 따른다. App-data pointer나 receipt는 `WorkspaceManifest`의 identity authority가 아니고, 이전 성공 receipt만으로 현재 `Semester Ready`를 합성하지 않는다.
- 이 문서의 `Module`, `Interface`, `seam`, `Adapter`, `depth`, `locality`는 repository의 Codebase Design 용어다.
- Ticket 006의 `appDataRoot` 단위 process lease와 foreground supervisor, Ticket 007의 `RuntimeResolver`, Ticket 008·ADR 0017의 Codex-managed account lifecycle, Ticket 009·ADR 0014의 workspace admission, Ticket 010의 생성 승인·bundle policy를 고정 입력으로 둔다. 각 Module의 내부 transaction을 다시 설계하지 않는다.
- Fresh first-public-release setup과 같은 exact application version의 relaunch만 다룬다. Cross-version setup migration, bundle update, workspace 전환과 multi-profile registry는 범위 밖이다.

## Primary-source current evidence

### Repository evidence

| 관찰 | Primary source | 설계 제약 |
| --- | --- | --- |
| Public host는 canonical `appDataRoot`마다 한 primary process만 허용하고 secondary `npx`는 nonce handshake 뒤 기존 Origin을 다시 연다. Stale owner를 PID나 age만으로 추측하지 않는다. | [Ticket 006](../tickets/006-npx-production-composition.md#appdataroot-단위-single-instance) | Setup store가 두 process 사이의 lock protocol을 다시 만들지 않는다. Primary 안의 Browser tab만 in-process single-flight에 join한다. |
| `RuntimeResolver.resolve()`가 exact descriptor binding, download/cache receipt, complete-tree verification, corrupt repair와 resolver-specific recovery를 소유한다. | [Ticket 007](../tickets/007-runtime-release-delivery-integrity.md#세-설계안에서-고른-interface) | Resolver error는 setup error로 번역하거나 receipt에 흡수하지 않는다. Verified Runtime identity만 setup binding에 넣는다. |
| OAuth attempt·native login handle은 transient이고 fresh managed account read만 account authority다. Bootstrap Runtime을 완전히 닫고 workspace Runtime의 fresh read 뒤에만 `Semester Ready`를 commit한다. | [Ticket 008](../tickets/008-browser-oauth-lifecycle.md#bootstrap-cwd와-workspace-transition), [ADR 0017](../../../adr/0017-use-codex-managed-browser-oauth-for-product-account-lifecycle.md#fresh-managed-account-read가-제품-authority다) | Receipt에 token, login ID, account proof나 Runtime handle을 저장하지 않는다. Crash 뒤 attempt를 복원하지 않고 fresh read로 수렴한다. |
| Workspace admission은 non-existent leaf의 exclusive scaffold, matching root marker, v3 aggregate publish와 fresh validation을 소유한다. Marker 전 crash로 생긴 leaf는 app-data intent만으로 ownership을 증명할 수 없다. | [Ticket 009](../tickets/009-semester-workspace-admission.md), [schema·scaffold 조사](semester-workspace-schema-scaffold-research.md#deterministic-scaffoldpublish) | Setup receipt는 write-ahead intent이지 root ownership marker를 대신하지 않는다. Marker 없는 created leaf는 manual recovery다. |
| Approved exact plan만 durable하며 bundle-valid admitted workspace도 pending result다. Runtime transition과 fresh account read 뒤에만 active Ready pointer를 commit한다. | [Ticket 010](../tickets/010-resumable-setup-authority.md), [authority 설계](resumable-setup-authority-design.md#durability와-recovery-boundary) | 정상 전진은 `approved → prepared → active_ready`만 기록한다. 명시적 safe discard는 destructive user intent를 보존하는 `discard_requested` 분기이고 syscall별 progress phase가 아니다. |
| App package가 package-owned bundle descriptor와 declared complete tree를 workspace mutation 전에 검증하고 그 identity를 setup transaction에 bind한다. | [ADR 0016](../../../adr/0016-distribute-public-preview-with-an-exact-npx-launcher-and-verified-runtime-release.md#public-application과-runtime을-분리한다) | Package path가 아니라 exact immutable byte identity를 receipt에 기록한다. npx cache path가 달라도 같은 exact application이 resume할 수 있어야 한다. |
| Current workspace store는 unique temp file을 `0600`으로 만든 뒤 expected bytes를 비교하고 `rename`하지만 file·directory sync와 process lock은 없다. Store가 없으면 `open()` 자체가 `.ay-ple`과 empty v2를 만든다. | [`semester-workspace-store.ts`](../../../../apps/server/src/semester-workspace-store.ts), lines 77–171 and 284–365 | Current store를 setup registry로 재사용하면 read가 mutation이 되고 crash-durable commit도 충족하지 않는다. Setup state에는 별도 strict codec·syncing atomic writer가 필요하다. |
| Current store는 exact bytes를 opaque authority로 들고 observed drift가 있으면 replace를 거절한다. | [`semester-workspace-store.ts`](../../../../apps/server/src/semester-workspace-store.ts), lines 108–122 and 293–365 | Setup state Adapter도 caller에 revision만 주지 말고 last-read exact authority를 app-writer exclusivity 아래 observed-prior guard로 사용해야 한다. |
| Managed Assignment Recipe는 app data 아래 versioned path, `O_EXCL | O_NOFOLLOW`, `0600`, canonical parent와 exact digest 검증을 사용한다. | [`assignment-recipe.ts`](../../../../apps/server/src/assignment-recipe.ts), lines 49–209; [`assignment-recipe.test.ts`](../../../../apps/server/src/assignment-recipe.test.ts) | Owner-only path·no-follow·exact digest의 local precedent는 재사용할 수 있지만, 그 구현도 sync와 multi-record commit을 제공하지는 않는다. |
| Current product bootstrap은 workspace snapshot과 coarse account readiness만 반환하고 setup transaction·pending/Ready registry 상태가 없다. `GET /bootstrap`은 current workspace가 internal `ready`일 때만 Runtime account를 읽는다. | [`product-http.ts`](../../../../apps/server/src/product-http.ts), lines 183–205; [`workspace.ts`](../../../../packages/product-contract/src/workspace.ts), lines 18–139 | Existing read endpoint에 automatic resume mutation을 숨기면 안 된다. New Browser-safe setup projection이 필요하다. |
| Current `CodexChatService`는 runtime creation promise와 `close()`를 idempotently 공유하고 account read·product operation을 직렬화한다. Actual test는 Server close가 Python/native process tree를 끝까지 reap함을 검증한다. | [`codex-chat-service.ts`](../../../../apps/server/src/codex-chat-service.ts), lines 74–171 and 425–605; [`product-shutdown.actual.ts`](../../../../apps/server/src/testing/product-shutdown.actual.ts) | Runtime lifecycle single-flight donor는 있지만 auth-only→workspace generation 전환과 durable setup commit을 새 Module이 조율해야 한다. |
| Current development composition은 Server 시작 전에 chooser-selected existing directory를 activate하고 fixed workspace-bound Runtime을 조합한다. | [`server.ts`](../../../../apps/server/src/server.ts), lines 38–139 and 179–230; [`product-development.ts`](../../../../apps/server/src/product-development.ts) | Current startup은 adopted setup target이 아니다. New host가 verified resources와 account-only start를 먼저 조합해야 한다. |

### Filesystem·runtime platform evidence

| 관찰 | Primary source | 설계 제약 |
| --- | --- | --- |
| Node 22.12의 `FileHandle.sync()`는 open file descriptor의 data를 storage device로 flush하도록 요청하며 구체 보장은 OS·device에 의존한다. `rename()`은 POSIX operation을 사용한다. | [Node.js v22.12 File system docs](https://nodejs.org/download/release/v22.12.0/docs/api/fs.html#filehandlesync), [Node.js v22.12 `fsPromises.rename`](https://nodejs.org/download/release/v22.12.0/docs/api/fs.html#fspromisesrenameoldpath-newpath) | `writeFile → rename`만으로 durability를 주장하지 않고 temp file sync와 destination directory sync를 commit protocol에 포함한다. |
| POSIX directory operation은 atomic·serializable하지만 반드시 durable한 것은 아니다. 일반적인 atomic update는 temp file sync 뒤 rename하며, new directory entry의 durability가 필요하면 directory도 sync한다. | [POSIX.1-2024 directory operations](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap04.html#tag_04_04), [POSIX rationale](https://pubs.opengroup.org/onlinepubs/9799919799/xrat/V4_xbd_chap01.html) | State envelope는 destination과 같은 filesystem/directory의 temp를 사용하고 parent directory sync가 끝나기 전 성공을 반환하지 않는다. |
| macOS `fsync()`도 storage/drive와 sudden power loss에 절대적 ordering을 보장하지 않으며 더 강한 flush에는 `F_FULLFSYNC`가 있다. | [Apple `fsync(2)` manual](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/fsync.2.html), [Apple `fcntl(2)` manual](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/fcntl.2.html) | 첫 preview의 blocking evidence는 normal shutdown, signal, Node `SIGKILL`과 supported macOS filesystem의 restart consistency다. 별도 native helper 없이 sudden physical power loss까지 절대 보장한다고 쓰지 않는다. |
| Minimum supported Node 22.12의 built-in `node:sqlite`는 `--experimental-sqlite`가 필요한 Stability 1.1 API다. | [Node.js v22.12 SQLite docs](https://nodejs.org/download/release/v22.12.0/docs/api/sqlite.html#sqlite) | 한 pending transaction과 한 active pointer만 필요한 first release를 위해 experimental CLI flag나 native SQLite dependency를 public process contract에 추가하지 않는다. |

## 최소 external Interface

### Interface shape

아래 shape은 exact endpoint가 아니라 App Module의 seam이다. `SetupJourney`를 생성할 때 preverified immutable `LaunchBinding`·`VerifiedBundleSource`, Ticket 006 foreground host의 lifecycle signal과 dependency를 주입하며 Browser는 이를 command parameter로 제출할 수 없다. HTTP request abort나 tab lifecycle은 cancellation authority가 아니다.

```ts
interface SetupJourney {
  reconcile(command: SetupCommand): Promise<SetupReconcileResult>
  observe(): SetupProjection
}

type SetupCommand =
  | { readonly kind: 'launch' }
  | { readonly kind: 'prepare'; readonly input: SemesterSetupInput }
  | { readonly kind: 'approve'; readonly setupPlanId: string }
  | {
      readonly kind: 'recover'
      readonly recoveryId: string
      readonly action: 'resume' | 'discard'
    }
```

- `launch`는 primary host startup 전용이다. Instance lease, package/bundle preflight와 `RuntimeResolver.resolve()` 성공, bare listener bind와 exact Origin 확정 뒤 host가 한 번 시작한다. Browser는 이 reconciliation의 완료를 기다리지 않고 열려 `observe()`로 progress를 볼 수 있다. Product HTTP decoder는 `launch`를 받아들이지 않는다.
- `prepare`는 side-effect-free `SemesterWorkspaceAdmission.inspect`를 호출하고 process-memory plan을 만든다. 승인 전 app data와 workspace에 아무것도 쓰지 않는다.
- `approve`는 in-memory plan을 exact receipt로 먼저 commit하고 같은 transaction을 끝까지 reconcile한다. Commit 뒤 response가 유실돼도 같은 `setupPlanId` approve 또는 다음 `launch`가 같은 operation에 join한다.
- `recover`는 projection이 발급한 current `recoveryId`와 허용 action만 받는다. Browser는 path, workspace ID, 삭제 목록이나 digest를 제출하지 않는다. `resume`은 incomplete scaffold, bundle repair와 Runtime transition retry 모두를 표현한다. Reauth 자체는 ADR 0017의 account Module command이며, account가 connected로 fresh 확인된 뒤 `resume`한다.
- `observe()`는 in-memory projection만 반환하는 read다. 자동 resume, fresh filesystem mutation이나 Runtime creation을 수행하지 않는다. Browser polling, tab reopen과 duplicate tab이 이 entry point를 사용한다.

두 entry point를 삭제하면 host startup, HTTP read와 Browser mutation이 receipt·filesystem·Runtime 순서를 각각 다시 구현해야 한다. 반대로 `prepare`, `approve`, `resume`, `discard`, `ready`를 별도 method로 펼쳐도 동작 leverage 없이 ordering을 caller에게 노출한다. 이 크기가 first-release에 필요한 depth의 최소점이다.

### Construction dependency

```ts
type LaunchBinding = {
  readonly application: {
    readonly packageName: 'ay-ple'
    readonly packageVersion: string
  }
  readonly runtime: {
    readonly releaseDescriptorSha256: string
    readonly manifestSha256: string
    readonly releaseId: string
    readonly target: 'darwin-arm64'
    readonly runtimeContractVersion: number
  }
  readonly bundle: {
    readonly descriptorSha256: string
    readonly completeTreeSha256: string
  }
}
```

`LaunchBinding`은 exact package name/version, package-owned Runtime release descriptor·canonical manifest와 workspace instruction/Skill bundle descriptor·complete tree를 package preflight와 `RuntimeResolver`가 fresh 검증해 묶은 Server-private value다. 별도의 포괄적 application descriptor를 새 authority로 만들지 않는다. `VerifiedBundleSource`는 descriptor가 선언한 file bytes·mode를 검증 시점에 bounded in-memory snapshot으로 고정한 process capability다. Workspace materializer와 missing-file recovery는 package path를 다시 읽지 않고 이 snapshot만 사용하므로 OAuth·사용자 확인 중 npx cache path가 바뀌어도 stale source를 copy하지 않는다. Relaunch마다 새 snapshot을 만들고 `LaunchBinding`과 다시 대조한다. `packageRoot`, npx cache generation path와 `runtimeRoot`는 durable identity에 넣지 않는다.

### Result와 Browser-safe projection

```ts
type SetupReconcileOutcome =
  | 'awaiting_input'
  | 'awaiting_approval'
  | 'resumed'
  | 'ready_created'
  | 'already_ready'
  | 'ready_relaunch'
  | 'discarded'
  | 'setup_conflict'
  | 'setup_state_conflict'
  | 'setup_release_mismatch'
  | 'recovery_required'
  | 'reauth_required'
  | 'setup_transition_unavailable'
  | 'account_unavailable'
  | 'cancelled'

type SetupReconcileResult = {
  readonly outcome: SetupReconcileOutcome
  readonly projection: SetupProjection
}

type SetupProjection =
  | {
      readonly state: 'account_required'
      readonly mode: 'first_connection'
      readonly account: AccountProjection
      readonly workspacePreserved: false
    }
  | {
      readonly state: 'account_required'
      readonly mode: 'workspace_reauth'
      readonly origin: 'pending_setup' | 'ready_relaunch'
      readonly account: AccountProjection
      readonly recoveryId: string
      readonly allowedActions: readonly ['resume']
      readonly workspacePreserved: true
    }
  | { readonly state: 'input_required'; readonly suggestedFolderName: string }
  | {
      readonly state: 'confirmation_required'
      readonly setupPlanId: string
      readonly summary: BrowserSafeSetupSummary
    }
  | {
      readonly state: 'working'
      readonly phase:
        | 'creating_workspace'
        | 'installing_workspace_support'
        | 'starting_codex'
        | 'verifying_account'
    }
  | {
      readonly state: 'recovery_required'
      readonly recoveryId: string
      readonly reason: SetupRecoveryReason
      readonly allowedActions: readonly ('resume' | 'discard')[]
      readonly workspacePreserved: true
    }
  | {
      readonly state: 'transition_blocked'
      readonly reason: 'setup_transition_unavailable'
      readonly retry: 'restart_required'
      readonly allowedActions: readonly []
      readonly workspacePreserved: true
    }
  | {
      readonly state: 'transition_blocked'
      readonly reason: 'setup_transition_unavailable'
      readonly retry: 'resume'
      readonly recoveryId: string
      readonly allowedActions: readonly ['resume']
      readonly workspacePreserved: true
    }
  | {
      readonly state: 'transition_blocked'
      readonly reason: 'account_unavailable'
      readonly retry: 'resume'
      readonly recoveryId: string
      readonly allowedActions: readonly ['resume']
      readonly workspacePreserved: true
    }
  | {
      readonly state: 'release_blocked'
      readonly reason: 'setup_release_mismatch'
      readonly requiredPackageVersion: string
      readonly bytesPreserved: true
    }
  | {
      readonly state: 'ready'
      readonly semester: BrowserSafeSemesterIdentity
    }
```

- `ready_created`는 fresh approval이 처음 Ready commit까지 끝난 경우, `resumed`는 기존 approved receipt의 work를 실제로 계속한 호출, `already_ready`는 같은 command가 현재 process에서 이미 commit된 result에 join한 경우, `ready_relaunch`는 이전 process가 commit한 active pointer를 fresh revalidate·account-read해서 연 경우다. 네 outcome의 Browser destination은 모두 같은 `ready` projection일 수 있지만 smoke와 local diagnostics는 원인을 구분한다.
- `resolver` failure는 `SetupReconcileOutcome`이 아니다. Host가 SetupJourney를 만들기 전에 Ticket 007의 exact `runtime_*` error를 terminal에 그대로 전달하고 setup state를 바꾸지 않는다. Retry는 같은 exact `npx` invocation을 다시 시작하는 것이다.
- `setup_conflict`는 stale/nonmatching plan·recovery ID나 다른 tab의 winning plan처럼 사용자가 다른 의도를 다시 확인할 수 있는 mismatch다. Response는 winning current projection을 함께 돌려준다. `setup_release_mismatch`는 current verified `LaunchBinding`과 pending/active binding이 다른 경우이며 `release_blocked` projection으로 update·migration 없이 receipt의 exact package version 실행을 요구한다. 둘 다 bytes를 보존한다.
- `recovery_required`는 ownership·schema·bundle·effective context를 자동으로 증명할 수 없는 상태다. Allowed action은 evidence로 계산한다. Admitted workspace나 modified/unknown user byte에는 `discard`가 절대 없다.
- `reauth_required`, `setup_transition_unavailable`과 `account_unavailable`은 workspace를 보존하는 outcome이다. `account_required/workspace_reauth`는 pending setup과 active-pointer relaunch를 `origin`으로 구분하고, account lifecycle의 login/reconnect 뒤 opaque `recoveryId`로 `resume`한다. `transition_blocked`는 previous Runtime tree가 proven dead일 때만 bounded `resume`을 준다. Close가 ambiguous하면 action 없는 `restart_required`로 수렴해 shared lease를 계속 점유한 채 host를 bounded shutdown하고 다음 invocation이 process absence를 다시 증명한다. Fresh account RPC 실패는 provider 상태를 증명하지 않으므로 `account_unavailable`보다 강하게 부르지 않는다. 모두 `Semester Ready`나 discard를 합성하지 않는다. `unsupported_account`는 Ticket 008의 `AccountProjection`을 보존해 logout 뒤 ChatGPT reconnect만 허용한다.
- Raw canonical path, workspace ID, plan/bundle digest, Runtime identity, native error·PID와 OAuth data는 projection에 넣지 않는다. 최종 확인에는 user-selected location의 safe display form만 넣는다.

### Interface invariants와 ordering constraints

1. `reconcile`은 process 안에서 하나의 serialized command queue를 사용한다. `launch`는 host singleton, commit 전·후 duplicate `approve`는 `setupPlanId`, `recover`는 `recoveryId + action`으로 host lifetime의 terminal promise에 join한다. Durable `setupId`는 내부 correlation일 뿐 Browser join key가 아니다.
2. `launch`는 primary host authority에서만 호출한다. Read-only HTTP GET이나 Browser page load가 automatic resume를 시작하지 않는다.
3. `prepare`는 durable write가 0개다. Restart 뒤 다시 입력하는 것이 정상이다.
4. `approve`는 exact approved receipt의 durable commit이 성공하기 전 workspace mutation을 시작하지 않는다.
5. Durable receipt, root marker, v3 aggregate, bundle과 current filesystem evidence가 exact match일 때만 automatic resume한다. Receipt 단독으로 target ownership을 주장하지 않는다.
6. `active_ready` commit은 admitted workspace·bundle/context validation, auth-only close, workspace Runtime start와 fresh ChatGPT account read보다 항상 뒤다.
7. Setup transition은 Ticket 008 account lifecycle·product turn과 같은 app-wide account/Runtime lease를 사용한다. Pending login settlement 직전부터 old Runtime close, new Runtime start, fresh account read와 Ready state readback까지 lease를 놓지 않아 concurrent login·cancel·logout·turn이 generation 전환에 끼어들지 못한다.
8. `active_ready` pointer는 workspace identity authority나 current account proof가 아니다. Every relaunch는 `WorkspaceManifest`, required seam, bundle, effective context와 account를 fresh 확인한다.
9. Runtime close가 ambiguous하면 workspace Runtime을 함께 시작하지 않는다. At-most-one Runtime invariant가 setup progress보다 우선한다.
10. Pending receipt에는 OAuth token, native login correlation, Runtime process identity나 transient completion을 저장하지 않는다.
11. `discard`는 matching pending `owned_incomplete`에서만 허용한다. Aggregate 부재, exact root marker와 owned roster를 fresh 확인하고 created root의 device/inode/birthtime identity를 capture한 뒤 `discard_requested`를 먼저 commit하고, known app-created entry를 no-follow로 개별 확인·삭제한다. Marker는 마지막 known file로 지우고 exact target이 same file identity의 empty·non-symlink directory임을 다시 확인한 뒤 `rmdir`, 마지막으로 app-data state를 `empty`로 commit한다. Crash 뒤 markerless target을 제거할 수 있는 유일한 예외는 이 durable receipt가 marker의 직전 fresh 검증, root file identity와 cleanup intent를 증명하고 target이 exact·same identity·empty일 때다. Target absent는 cleanup complete로 수렴하고 nonempty·symlink·identity drift는 보존한다. Admitted·active Ready workspace는 이 Interface로 삭제할 수 없다.
12. State store decode, owner/permission/symlink, sync 또는 observed prior-byte authority 확인이 실패하면 no mutation으로 fail closed한다. Unknown state format을 empty로 보지 않는다.
13. Signal cancellation은 in-flight operation이 현재 atomic commit을 끝내도록 한 뒤 supervisor cleanup에 join한다. Receipt가 있으면 pending을 보존하고 다음 launch가 resume한다.

## Durable state와 identity binding

### 하나의 atomic envelope

Logical state는 app data의 owner-only fixed path `setup/v1/state.json` 하나에 둔다. Parent directory는 `0700`, state file은 `0600`이며 exact byte bound는 resulting spec이 고정한다. Fresh launch에서 entire `setup/` absence는 logical `empty` read일 뿐 durable byte를 만들지 않는다. 최초 `approve`가 app-data root와 같은 filesystem의 staging directory 안에 complete `setup/v1/state.json = pending/approved` tree를 만들고 file·directory를 sync한 뒤 absent `setup/`으로 atomic publish한다. 따라서 승인 전에는 setup plan·store byte가 모두 0개다.

```ts
type SetupStateEnvelope = {
  readonly formatVersion: 1
  readonly revision: number
  readonly state:
    | { readonly kind: 'empty' }
    | { readonly kind: 'pending'; readonly receipt: PendingSetupReceipt }
    | { readonly kind: 'active_ready'; readonly pointer: ActiveReadyPointer }
}
```

`pending` file과 `active-workspace.json`을 따로 두지 않는다. Ready commit 한 번이 pending 제거와 active pointer publish를 함께 수행하므로 crash 뒤 둘이 동시에 current일 수 없다. Entire `setup/` tree가 absent이면 fresh logical `empty`지만 first durable write는 오직 user approval의 pending receipt다. `setup/`이 존재하는데 state file이 없거나 malformed·unsupported·non-regular이면 절대 pristine으로 추측하지 않고 `setup_state_incompatible` 또는 `setup_recovery_required`다. Durable `empty` envelope는 explicit safe discard가 전부 끝난 뒤에만 남는다. Missing pointer를 주변 filesystem scan이나 자동 workspace adoption으로 복원하지 않는다. Committed workspace bytes는 Ticket 009의 authority로 그대로 보존하지만 pointer 재등록 UX·command는 이 first-release `SetupJourney` Interface에서 제공하지 않는다.

`revision`은 observability와 stale in-memory update 방지용이며 authority 그 자체가 아니다. Internal state Adapter는 current store처럼 last-read exact bytes를 opaque authority로 들고 compare-before-replace한다. One primary process와 serialized queue가 정상 writer exclusivity를 제공한다.

### Pending receipt

```ts
type PendingSetupReceipt = {
  readonly setupId: string
  readonly setupPlanId: string
  readonly lifecycle:
    | { readonly phase: 'approved' }
    | { readonly phase: 'prepared' }
    | {
        readonly phase: 'discard_requested'
        readonly rootFileIdentity: {
          readonly device: string
          readonly inode: string
          readonly birthtimeNs: string
        }
      }
  readonly plan: {
    readonly canonicalBytesSha256: string
    readonly semester: SemesterSetupIdentity
    readonly target: {
      readonly canonicalParent: string
      readonly parentDevice: string
      readonly parentInode: string
      readonly leafName: string
      readonly canonicalTarget: string
    }
  }
  readonly release: LaunchBinding
  readonly workspace: {
    readonly workspaceId: string
    readonly formatVersion: 3
    readonly rootMarkerSha256: string
    readonly ownedScaffoldPlanSha256: string
    readonly expectedInitialAggregateSha256: string
  }
}
```

- `setupId`는 durable operation identity, `setupPlanId`는 Browser의 duplicate approval identity다. 둘 다 unpredictable opaque ID이고 digest를 public identifier로 재사용하지 않는다.
- Canonical plan bytes는 year-level, extensible term key/display name, canonical parent authority, bounded leaf와 expected target을 exact ordered encoding으로 묶는다. Resume에 필요한 private plan fields는 app data에 저장하되 Browser response·log에는 내보내지 않는다.
- Workspace ID는 approval commit 전에 한 번 발급해 plan에 bind한다. `WorkspaceManifest`가 publish된 뒤에는 aggregate의 ID가 authority이고 receipt는 matching evidence일 뿐이다.
- `rootMarkerSha256`와 `ownedScaffoldPlanSha256`는 Ticket 009 authority-bound admission plan의 canonical marker bytes와 path·type·expected-byte roster를 bind한다. Resume/discard는 aggregate 부재·marker와 각 extant entry를 no-follow로 fresh 검증하고 이 digest가 가리키는 known set 밖을 소유하지 않는다.
- `discard_requested.rootFileIdentity`는 discard commit 직전에 fresh `lstat`한 created root의 device/inode/birthtime identity다. Marker를 이미 제거한 crash replay도 exact target이 같은 file identity의 empty·non-symlink directory일 때만 `rmdir`할 수 있다.
- Initial aggregate digest는 incomplete no-clobber publish·resume evidence다. Dynamic academic state가 바뀌는 active Ready pointer에는 whole-aggregate digest를 유지하지 않는다.
- `LaunchBinding`은 exact application package, Runtime descriptor/manifest identity와 package bundle complete tree를 묶는다. Ephemeral process instance nonce와 package/cache path는 resume를 막으므로 포함하지 않는다.
- Runtime/account failure, retry count와 wall clock은 receipt에 저장하지 않는다. Relaunch는 fresh inspection과 account read에서 현재 outcome을 다시 계산한다.

### Active Ready pointer

```ts
type ActiveReadyPointer = {
  readonly setupId: string
  readonly release: LaunchBinding
  readonly workspace: {
    readonly canonicalRoot: string
    readonly workspaceId: string
    readonly formatVersion: 3
  }
}
```

- Pointer는 active selection과 same-version relaunch hint다. Semester metadata와 Course relation은 fresh decoded `WorkspaceManifest`에서 읽고 pointer에 복제하지 않는다.
- Account state, credential path·digest, last fresh-read result, Runtime PID/thread ID는 저장하지 않는다. Relaunch 때 fresh account가 없으면 pointer는 보존하되 projection은 `account_required`이고 현재 `Semester Ready`가 아니다.
- Whole v3 aggregate digest를 pointer에 넣지 않는다. Course와 confirmed academic state의 정상 mutation이 aggregate bytes를 바꾸기 때문이다. Workspace ID·format·required seam을 fresh validate한다.

## Commit model

### Durable phases

| Durable state | 진입 조건 | 허용되는 다음 동작 | 성공으로 뜻하지 않는 것 |
| --- | --- | --- | --- |
| `empty` | Fresh app data 또는 safe discard가 완전히 끝난 뒤 atomic commit | account reconciliation, input·prepare | 승인, workspace ownership |
| `pending/approved` | User approval과 exact identity binding을 atomic sync한 뒤 | admission inspect/apply, matching resume, 제한된 safe discard | Root marker, admitted workspace, bundle, Ready |
| `pending/prepared` | V3 aggregate·required seam·bundle·effective context fresh validation 뒤 | auth-only close, workspace Runtime start, fresh account read, transition retry/reauth | Active Ready, current connected account |
| `pending/discard_requested` | `owned_incomplete`와 matching receipt를 fresh verify하고 사용자가 safe discard를 명시한 뒤, 어떤 삭제보다 먼저 atomic commit | Known app-created entry의 idempotent no-follow 제거, empty-only directory removal, `empty` commit | Resume, admitted workspace 삭제, unknown byte ownership |
| `active_ready` | Workspace Runtime의 fresh ChatGPT account read 뒤 single-envelope atomic replace | Same-version relaunch validation | Current account/session, immutable workspace bytes |

`workspace_creating`, `bundle_copying`, `runtime_closing`, `runtime_started`, `account_verified`를 durable phase로 늘리지 않는다. 각 syscall 뒤 phase를 쌓으면 caller가 journal replay 규칙을 알아야 하고 receipt가 filesystem/process authority처럼 보인다. `approved`와 `prepared`에서 current evidence를 다시 읽으면 같은 result로 수렴하며, fresh account read와 Ready commit 사이 crash도 다시 read하면 안전하다. `discard_requested`는 progress가 아니라 destructive user intent다. Cleanup 중 crash 뒤에는 scaffold를 다시 만들지 않고 같은 bounded removal만 계속한다.

### Atomic state Adapter protocol

Internal filesystem implementation은 아래를 하나의 local-substitutable Adapter 안에 숨긴다.

1. `appDataRoot`를 owner-only regular non-symlink directory로 canonicalize한다. `setup/` absence는 read-only logical `empty`이고, existing `setup/`은 fixed parent와 state가 모두 valid해야 한다.
2. Existing state는 no-follow open하고 strict exact-key·version·byte-bound decode한다. Caller에는 decoded state와 opaque exact-byte authority만 준다.
3. 최초 `approve`는 app-data root 아래 `instance nonce + expected setup-absence sentinel + unpredictable write token`을 bind한 staging directory에 complete `setup/v1/state.json = pending/approved`를 만든다. Existing store 교체는 state destination과 같은 directory에 `instance nonce + expected prior-byte SHA-256 + write token`을 bind한 temp file을 `O_CREAT | O_EXCL | O_NOFOLLOW`, `0600`으로 연다.
4. Canonical complete envelope bytes를 쓰고 file과 staging/parent directory를 안쪽부터 sync한 뒤 handle을 닫는다.
5. First publish는 `setup/` absence, later replace는 exact observed prior authority를 다시 확인한다. Mismatch면 current process가 만든 staging/temp만 token-scoped remove하고 `setup_state_conflict`다.
6. Staging directory를 absent `setup/`으로 또는 temp file을 state destination으로 atomic `rename`한다. 이 short commit section은 cancellation으로 중간 종료하지 않는다.
7. App-data root 또는 state parent directory를 sync하고 destination을 no-follow readback·strict decode한다. 이 단계까지 성공해야 caller가 commit됐다고 본다.
8. Crash residue는 fixed grammar, owner, regular-file/directory·no-symlink, containment, strict bounded envelope decode와 encoded expected-prior digest/absence가 current destination에 일치하고, current operation이 write token을 소유하거나 Ticket 006이 prior instance nonce의 owner 부재를 안전하게 증명한 경우에만 quarantine/remove한다. 어느 proof도 없으면 보존하고 recovery-required로 닫는다.

이 protocol은 process crash에서 old 또는 new complete envelope만 current destination으로 관찰하게 하고, directory sync 전 성공을 보고하지 않는다. Prior-byte 확인은 Ticket 006 lease를 따르는 AY-PLE writer 사이의 optimistic guard이지 hostile same-user editor를 막는 OS-level conditional rename은 아니다. External app-data edit는 unsupported이며 observed drift는 fail closed한다. Apple이 문서화한 storage controller·physical power-loss 한계 때문에 `F_FULLFSYNC` 없는 Node-only implementation이 절대적인 power-loss durability를 약속하지는 않는다. 해당 보장이 제품 요구가 되면 native storage Adapter 또는 database selection을 별도 결정한다.

### Workspace side effect ordering

```text
verified LaunchBinding + immutable VerifiedBundleSource + single-instance owner
  → fresh account connected
  → prepare (no durable write)
  → user approve
  → recheck bundle snapshot ↔ LaunchBinding
  → commit pending/approved
  → SemesterWorkspaceAdmission.apply
  → fresh v3/required-seam validation
  → bundle no-clobber install + exact verify
  → effective-native-context verify
  → commit pending/prepared
  → settle auth operation
  → close auth-only Runtime completely
  → start exact-workspace Runtime
  → fresh managed ChatGPT account read
  → atomic replace pending → active_ready
  → project Semester Ready
```

Admission과 bundle의 writes는 app-data state commit과 같은 filesystem transaction이 아니다. 이 순서를 지키고 각 Module이 owned evidence와 no-clobber idempotency를 제공하는 것이 cross-root recovery protocol이다.

## Crash·repeat-launch matrix

| Interruption / repeated action | Durable/evidence state on next launch | Required convergence | 금지 |
| --- | --- | --- | --- |
| `prepare` 전·후, approval 전 종료 | `setup/` absent 또는 durable `empty`, process-memory plan lost | Fresh account read 뒤 input부터 다시 시작 | Draft auto-resume 또는 hidden persistence |
| Initial approved staging/empty→approved temp write 중 crash, rename 전 | Old logical/durable `empty`; prior instance nonce namespace의 residue 가능 | Workspace write는 0회. Ticket 006이 prior owner 부재와 strict owned residue를 함께 증명할 때만 quarantine; 아니면 recovery-required | Temp를 approval receipt로 간주하거나 PID/age만으로 삭제 |
| Approved rename 뒤 response 유실 | `pending/approved` exact receipt | Same `setupPlanId` approve는 terminal promise에 join하고 next launch는 receipt를 automatic resume | 두 번째 workspace ID/scaffold |
| Receipt commit 뒤 target mkdir 전 | `pending/approved`, target absent | Exact parent authority 재검사 뒤 scaffold continue | 재승인 |
| Exclusive mkdir 뒤 root marker sync 전 crash | Receipt는 있으나 target marker 없음 | Existing leaf를 unowned collision으로 보존하고 manual recovery/다른 target 안내 | App-data receipt만으로 resume·discard·adopt |
| Matching root marker 뒤 aggregate publish 전 | `pending/approved` + exact `owned_incomplete` | Same admission operation resume; allowed safe discard 가능 | Recursive delete, unknown entry overwrite |
| `discard_requested` state temp/commit 중 crash | Old complete `pending/approved` 또는 new complete discard intent | Directory sync·readback까지 discard commit이 성공하기 전에는 unlink 0회. Old state면 normal resume, new state면 cleanup | Incomplete intent를 근거로 삭제 시작 |
| Safe discard commit 뒤 known entry cleanup 중 crash | `pending/discard_requested` + matching owned evidence 또는 이미 제거된 known subset | Scaffold를 재개하지 않고 same no-follow cleanup만 idempotent resume | User의 discard intent를 잊고 workspace 재생성 |
| Marker 제거 뒤 root `rmdir` 전 crash | `pending/discard_requested` + markerless target | Canonical target·parent와 captured root device/inode/birthtime이 같고 target이 empty·non-symlink directory면 `rmdir`; absent면 cleanup complete | Recreated empty dir, nonempty·symlink·다른 identity 제거 |
| Cleanup 뒤 `empty` commit 전 crash | `pending/discard_requested` + target absent | Filesystem delete를 반복하지 않고 `empty` commit | Target 재생성 |
| Aggregate valid 뒤 phase update 전 | Matching admitted v3 workspace | Fresh validation으로 admission을 replay 없이 recognize하고 bundle 단계 계속 | Existing valid workspace를 collision으로 오판 |
| Bundle copy 중 | Admitted workspace + missing subset 또는 exact app-owned temp | Missing target만 no-clobber resume; modified/unknown bytes면 manual recovery | Existing byte overwrite |
| Bundle/context valid 뒤 `prepared` commit 전 | Fresh evidence는 prepared, receipt는 approved | Revalidate하고 `pending/prepared` commit | Receipt phase만 보고 bundle skip |
| `prepared` 뒤 auth-only close 중 interrupt | Pending prepared; process supervisor cleanup | Previous generation의 complete death 확인 뒤 transition retry | 두 Runtime 동시 start, workspace discard |
| Auth-only close가 timeout/ambiguous | Pending prepared, previous tree absence unproven | Action 없는 `setup_transition_unavailable/restart_required`; shared lease를 닫고 bounded host shutdown, next launch에서 absence 재검증 | Same-process resume, workspace Runtime start |
| Workspace Runtime start 전·중 failure | Pending prepared | Workspace·bundle 보존, bounded retry | Pending을 empty로 rollback |
| Workspace Runtime started, fresh account read 전 crash | Pending prepared, process handle durable하지 않음 | New invocation이 process cleanup을 확인하고 workspace Runtime을 새로 start/read | Stored PID/phase로 success 추측 |
| Fresh account read가 null/unsupported | Pending prepared | `reauth_required`; same workspace Runtime account lifecycle 또는 safe recycle 뒤 fresh read | Ready commit, credential file parse, workspace discard |
| Fresh account RPC/Runtime failure | Pending prepared | `account_unavailable`, retry; workspace preserved | `login_required`나 provider outage로 추측 |
| Fresh ChatGPT read 뒤 Ready temp write/rename 전 crash | Pending prepared 또는 complete active pointer 중 하나 | Next launch가 fresh workspace/bundle/account verification 후 commit/ready | 이전 account read receipt로 Ready 합성 |
| Ready rename 뒤 HTTP response 유실 | `active_ready` | Same approve/recover returns `already_ready`; new process returns `ready_relaunch` only after fresh validation/read | Duplicate active pointer |
| Browser tab/Chrome close | Primary process와 shared promise 유지 | Reopened tab calls `observe()` and joins current projection | Tab close를 cancel/shutdown으로 해석 |
| 여러 tab이 same plan을 approve | One in-process shared promise, one receipt | 모두 같은 result | Duplicate scaffold |
| 여러 tab이 different plan을 approve | First durable approved plan wins | Other request `setup_conflict`; no write | Winning transaction replace |
| Repeated same-version `npx` while primary live | Ticket 006 handshake + same Origin | Secondary opens existing UI; no SetupJourney construction | Second Runtime/receipt writer |
| Primary hard-kill 뒤 repeated `npx` | Ticket 006 safe stale-owner recovery 뒤 one new primary | State envelope fresh read and pending resume/ready relaunch | PID-only stale takeover |
| Resolver cache/network failure on relaunch | Setup envelope unchanged | Ticket 007 `runtime_*` failure passthrough; same exact command retry | Ready pointer deletion, alternate Runtime fallback |
| Ready workspace bundle missing | Active pointer + workspace preserved | Codex action blocked; explicit no-clobber recovery then fresh reverify | Auto overwrite 또는 workspace discard |
| Ready declared bundle modified/extra entry or native-context conflict | Active pointer + user bytes preserved | `manual_recovery_required` | App-owned cleanup으로 사용자 byte 수정·삭제 |
| App-data state corrupt/unknown version | Workspace may still exist | No workspace mutation; state recovery procedure | Empty/fresh setup으로 추측하고 collision cleanup |

Ready workspace의 missing declared bundle 복구는 기존 target이 여전히 absent일 때만 `O_EXCL`로 만드는 non-destructive idempotent operation이므로 별도 durable phase를 만들지 않는다. 중단되면 active pointer를 보존하고 다음 launch에서 다시 action block을 보여 주며 사용자가 explicit recovery를 다시 요청한다. Modified·extra·symlink byte는 이 경로로 손대지 않는다.

## Error contract

Error는 stable `code`, `phase`, `retryable`, safe `displayMessage`와 `workspacePreserved`만 Browser/terminal에 투영한다. Raw path, digest, receipt bytes, native Runtime error, PID와 OAuth value는 owner-only redacted diagnostic에만 둔다.

| Stable code/outcome | 의미 | Retry / action |
| --- | --- | --- |
| Ticket 007 `runtime_*` | Resolver가 setup 시작 전 exact Runtime을 만들지 못함 | Setup state 무변경. Resolver가 정한 retry contract 그대로 사용 |
| `setup_cancelled` | Signal/host shutdown이 current reconcile을 중단함 | Pending receipt가 있으면 다음 launch resume |
| `setup_storage_unavailable` | State root owner/permission/symlink, write/sync/readback 실패 | 환경 해결 뒤 retry; workspace mutation 금지 |
| `setup_state_incompatible` | Unknown format, malformed envelope, non-regular current state | Manual recovery; empty로 추측 금지 |
| `setup_state_conflict` | Atomic replace 직전 observed prior bytes가 달라짐 | Current state를 다시 읽고 reconcile; mismatched byte overwrite 금지 |
| `setup_conflict` | Nonmatching/stale plan·recovery 또는 another plan winner | Current projection reload |
| `setup_release_mismatch` | Current verified application·Runtime·bundle binding이 pending/active receipt와 다름 | State·workspace 무변경. Receipt와 같은 exact application 실행 |
| `setup_recovery_required` | Ownership/target/schema/bundle/native-context evidence가 ambiguous | Bytes 보존; projection의 bounded action만 허용 |
| `setup_transition_unavailable` | Auth-only close 또는 workspace Runtime start 실패 | Previous tree가 proven dead면 resume; ambiguous close면 same-process action 없이 bounded host shutdown·next invocation. Discard 없음 |
| `reauth_required` | Fresh read가 usable ChatGPT account를 증명하지 못함 | ADR 0017 account lifecycle로 reauth한 뒤 resume |
| `account_unavailable` | Fresh account RPC나 Runtime availability를 판정할 수 없음 | Retry; login-required·provider outage로 추측하지 않음 |

Internal error가 Ready commit 뒤 response write에서 발생해도 state를 다시 pending으로 되돌리지 않는다. 반대로 Ready commit 전 Browser response가 먼저 성공해서도 안 된다. HTTP disconnect는 operation cancellation authority가 아니며 shared reconciliation은 primary host lifetime 안에서 계속된다.

## Usage

### Primary host startup

```ts
const verifiedRuntime = await runtimeResolver.resolve({
  appDataRoot,
  signal,
  report,
})
const { launchBinding, verifiedBundleSource } = await verifyLaunchResources({
  packageRoot,
  verifiedRuntime,
})
const { origin } = await productHost.listenBare() // delegate는 아직 503
const runtimeTransition = createRuntimeTransition({ origin, verifiedRuntime })

const setupJourney = createSetupJourney({
  accountLifecycle,
  admission,
  appDataRoot,
  bundle,
  hostLifecycleSignal: signal,
  launchBinding,
  runtimeTransition,
  verifiedBundleSource,
})

await productHost.activate(createProductRouter({ setupJourney }))
const startup = setupJourney.reconcile({ kind: 'launch' })
await browserLauncher.open(origin)
await startup
```

Host는 instance lease를 먼저 소유하고 위 sequence를 한 번만 조립한다. `RuntimeResolver`가 실패하면 listener와 `createSetupJourney`까지 오지 않는다. Bare product listener가 먼저 bind해 exact dynamic Origin을 만들고 아직 준비되지 않은 request에는 `503`을 준다. 그 Origin으로 Runtime transition Adapter와 journey를 조합한 뒤 product router를 atomic delegate swap으로 activate하고, 그 다음 host-owned `launch`와 Browser open을 시작한다. Browser open은 launch reconciliation 완료를 기다리지 않으므로 scaffold·transition progress나 recovery를 `observe()`로 볼 수 있지만, Browser request가 operation의 시작·수명을 소유하지 않는다. Browser open 자체가 실패하면 Ticket 006의 host shutdown signal이 reconciliation과 process cleanup에 join한다.

### Browser HTTP Adapter

```ts
router.get('/setup', (_request, response) => {
  response.setHeader('cache-control', 'no-store')
  response.json(setupJourney.observe())
})

router.post('/setup/commands', exactOriginGuard, async (request, response) => {
  const command = decodeBrowserSetupCommand(request.body) // launch는 decode 불가
  response.json(await setupJourney.reconcile(command))
})
```

Exact endpoints는 resulting spec이 정한다. 중요한 seam은 GET이 mutation하지 않고, automatic resume는 primary startup의 `launch`에서만 일어난다는 점이다.

### Duplicate approval

```ts
await Promise.all([
  setupJourney.reconcile({ kind: 'approve', setupPlanId }),
  setupJourney.reconcile({ kind: 'approve', setupPlanId }),
])
// 두 call은 한 shared promise와 한 setupId/WorkspaceManifest로 수렴한다.
```

### Runtime transition failure

```ts
const result = await setupJourney.reconcile({
  kind: 'recover',
  recoveryId,
  action: 'resume',
})

// result.outcome === 'reauth_required' | 'setup_transition_unavailable'
//   | 'account_unavailable'
// admitted SemesterWorkspace와 bundle은 그대로 남고 allowedActions에 discard가 없다.
```

## Implementation이 seam 뒤에 숨기는 것

- Strict setup state codec, canonical encoding, SHA-256와 exact-byte authority
- Owner-only app-data path validation, no-follow open, atomic temp/sync/rename/directory-sync/readback
- Host launch, `setupPlanId`, `recoveryId + action` keyed shared promise와 different-plan winner serialization
- Setup plan memory, approval promotion과 opaque recovery ID 발급
- `LaunchBinding` canonicalization과 current receipt/Ready pointer exact-match 검사
- `SemesterWorkspaceAdmission.inspect/apply` 결과를 approved/prepared phase로 축약하는 reducer
- Bundle no-clobber install, declared complete-tree validation과 effective native-context gate 조합
- Auth-only Runtime settlement·complete close, workspace Runtime construction, fresh account reconciliation과 cleanup
- Resume/discard allowed-action derivation, safe error redaction과 Browser projection
- Phase별 cancellation deferral와 supervisor shutdown join

Caller와 tests는 filesystem syscall, temp filename, receipt path, root marker, Runtime generation, retry loop와 account protocol을 알 필요가 없다. 이 locality가 `SetupJourney` Module의 주된 가치다.

## Dependency categories와 Adapter 전략

| Dependency | Category | Seam / Adapter strategy |
| --- | --- | --- |
| State reducer, strict codec, canonical plan·binding digest, projection | In-process | `SetupJourney` implementation 내부 pure logic. Public port를 만들지 않고 Interface behavior로 검증 |
| App-data state, workspace admission, bundle install/verify, native-context inspection | Local-substitutable | Temp filesystem integration이 production filesystem을 그대로 대체한다. Fault injector는 internal seam이며 external Interface에 노출하지 않음 |
| Same-origin HTTP와 repository-only smoke command | Remote but owned / local Adapter | 둘이 같은 `SetupJourney` Interface를 호출하는 실제 두 Adapter다. HTTP는 Browser-safe DTO, smoke는 explicit fixture input만 번역 |
| Official Codex Runtime·account lifecycle | True external behavior behind existing local process seam | Ticket 008과 공유하는 app-wide account/Runtime lease를 가진 production transition Adapter와 deterministic fake를 사용한다. Setup tests는 settle/close/start/read outcome과 login·logout race만 주입하고 OAuth token/protocol을 mock contract로 만들지 않음 |
| Runtime artifact download/cache | Ticket 007의 true-external transport를 숨긴 deep Module | `SetupJourney`가 network Adapter를 받지 않는다. `RuntimeResolver` 성공 value만 construction input으로 사용 |
| Random ID, cancellation, optional diagnostic clock | In-process/internal seam | Deterministic tests를 위한 internal dependency. Receipt correctness를 wall-clock age에 의존시키지 않음 |

Filesystem은 production과 test가 모두 같은 semantic operation을 쓰므로 별도 broad `FileSystem` port를 external Interface에 노출하지 않는다. Runtime은 실제 production Adapter와 fake가 있어 seam이 실재한다. Generic auth provider, transaction engine과 migration Adapter는 두 번째 concrete implementation이 없으므로 만들지 않는다.

## Alternatives와 trade-offs

| 설계 | Depth | Locality | 판정 |
| --- | --- | --- | --- |
| A. Single atomic envelope + evidence-based reconciliation | 두 entry point 뒤에 approval, receipt, workspace/bundle, Runtime transition과 Ready commit을 숨긴다. | First-release setup truth가 한 state codec과 한 reducer에 모인다. | **추천**. 한 pending setup·한 active pointer라는 실제 cardinality에 맞다. |
| B. SQLite transaction store | SQL transaction으로 pending/pointer 원자성을 쉽게 표현하고 향후 multi-workspace query에 유리하다. | Schema·PRAGMA·migration·native/runtime packaging knowledge가 새 storage Module로 모인다. | 보류. Node 22.12 core API가 experimental flag를 요구하고 현재 query/cardinality에는 불필요하다. 실제 registry cardinality가 늘면 재평가한다. |
| C. Append-only event journal + separate active pointer | Audit/replay와 phase debugging이 쉽다. | Replay version, compaction, journal/pointer cross-file commit과 corrupt-tail recovery가 setup caller의 새 지식이 된다. | 거절. 첫 release에서 event sourcing이 implementation보다 큰 Interface를 만든다. |
| D. Pending file + registry file 분리 | 각 파일의 의미는 직관적이다. | Ready commit이 두-file delete/publish가 되어 crash matrix와 repair가 늘어난다. | 거절. Single envelope가 같은 state를 더 깊게 감춘다. |
| E. Filesystem evidence만 사용하고 app-data receipt 없음 | App-data schema가 없다. | User approval, exact application/bundle binding과 ownership 의도가 사라져 Browser·admission이 추측해야 한다. | 거절. 생성 승인·safe discard authority를 증명할 수 없다. |
| F. `reconcile()` 하나만 제공하고 read도 command로 처리 | Entry point 수는 가장 작다. | Browser GET조차 mutation-capable command seam을 통과하고 accidental resume를 막기 어렵다. | 거절. `observe()`를 분리하는 두-method Interface가 read/mutation ordering을 더 명확히 한다. |

Single JSON envelope의 trade-off는 multi-workspace history나 query에 약하고 app-data external edit race에 database-level lock을 제공하지 않는다는 점이다. First release는 Ticket 006의 process lease, owner-only app data와 one active setup만 허용하므로 이 제약이 실제 Interface를 단순하게 만든다. State cardinality가 바뀔 때 Adapter implementation을 SQLite로 교체할 수 있지만 `SetupJourney` Interface는 유지한다.

## Recommended contract

1. `SetupJourney` external Interface는 `reconcile(command)`와 read-only `observe()` 두 entry point로 고정한다.
2. Primary host가 instance lease·package/bundle verification·`RuntimeResolver` 성공과 listener bind·exact Origin 확정 뒤 `launch`를 호출한다. Browser decoder는 `launch`를 허용하지 않는다.
3. Durable app-data state는 owner-only `appDataRoot/setup/v1/state.json`의 strict versioned single envelope `empty | pending | active_ready`다. 승인 전 absence는 read-only logical `empty`이고 최초 approve가 complete pending store를 atomic publish한다. 이후 missing state를 pristine으로 추측하지 않는다. Pending receipt와 active pointer를 별도 current file로 나누지 않는다.
4. Pending receipt는 exact application package name/version, Runtime release descriptor·manifest identity, bundle descriptor·complete-tree identity, canonical plan/target authority, expected workspace ID, root marker·owned scaffold plan과 v3 aggregate identity를 bind한다. Package/cache path, PID와 OAuth handle을 identity로 쓰지 않는다. Bundle write는 verified bounded process snapshot만 source로 쓴다.
5. 정상 전진의 durable phase는 `approved`, `prepared`, `active_ready`만 둔다. Process transition phase는 저장하지 않고 restart 때 재실행한다. Safe discard는 deletion 전에 `discard_requested` user intent를 commit하고 완료 뒤 `empty`로 간다.
6. Approved receipt를 sync한 뒤에만 workspace mutation을 시작하고, `active_ready` commit은 shared account/Runtime lease 안의 auth-only close·workspace Runtime start·fresh ChatGPT read 뒤에만 한다. Lease는 state readback 뒤 release한다.
7. Store Adapter는 owner-only/no-follow, Ticket 006 app-writer exclusivity 아래 observed prior-byte guard, temp sync, atomic rename, parent directory sync와 readback을 숨긴다. Current `semesterWorkspaceStore`의 unsynced writer를 그대로 재사용하지 않는다.
8. Host `launch`, `setupPlanId`별 approve와 `recoveryId + action`별 recover는 host-lifetime terminal promise에 join한다. Different approved plan은 first durable writer가 이기고 나머지는 `setup_conflict`다. Release binding mismatch는 별도 `setup_release_mismatch`로 fail closed한다. Repeated `npx`의 process join은 Ticket 006만 소유한다.
9. Workspace/bundle transition failure는 pending prepared를 보존하고 proven-dead Runtime의 `resume`, reauth 또는 account retry로 수렴한다. Ambiguous close는 same-process resume를 금지하고 bounded host shutdown 뒤 next invocation으로 넘긴다. Fresh account RPC 실패는 provider outage로 과장하지 않는다. Admitted workspace에는 discard를 제공하지 않는다. `discard_requested`가 남은 재실행은 setup resume가 아니라 bounded cleanup만 계속한다.
10. `active_ready`는 prior completion pointer일 뿐 현재 `Semester Ready` proof가 아니다. Relaunch마다 `WorkspaceManifest`, required seam, bundle, effective context와 fresh account를 검증한다.
11. Resolver failures는 Ticket 007 stable error를 그대로 통과시키고 setup state를 mutate하지 않는다. Setup state 자체의 conflict/recovery/error와 섞지 않는다.
12. Blocking verification은 temp filesystem phase fault injection, same-process duplicate command, actual process `SIGKILL`, repeated exact `npx`, Runtime close/start/read fake와 pinned native process-tree smoke를 모두 같은 `SetupJourney` Interface에서 수행한다.

이 contract는 mandatory setup의 복잡성을 Browser·HTTP·smoke script에서 제거하면서, `SemesterWorkspace`와 `WorkspaceManifest`의 authority, Codex-managed account lifecycle, verified Runtime resolver와 process supervisor의 기존 seam을 침범하지 않는다.
