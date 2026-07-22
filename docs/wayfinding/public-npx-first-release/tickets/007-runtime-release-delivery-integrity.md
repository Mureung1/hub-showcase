# 007 — Runtime release delivery·integrity·versioning을 정한다

## Wayfinder ticket

- Type: research
- State: resolved
- Blocked by: [Third-party 재배포 evidence와 release notice gate를 확정한다](003a-third-party-redistribution-evidence.md), [Public repository authority와 license를 확정한다](005-public-repository-authority-and-license.md), [npx production composition을 고른다](006-npx-production-composition.md)

## Question

[Ticket 005](005-public-repository-authority-and-license.md)의 immutable source↔public mapping과 local/private RC, [Ticket 006](006-npx-production-composition.md)의 thin public `ay-ple` package와 foreground host가 `appDataRoot`를 주고 verified immutable `runtimeRoot`·Runtime identity를 받는 resolver seam을 고정 입력으로 둔다. 그 위에서 public npm package와 GitHub Release의 macOS arm64 Runtime archive 사이에 CLI·Runtime·manifest version, archive SHA-256·size, extracted complete-tree verifier와 Runtime artifact provenance의 authority를 어떻게 나눌 것인가? First download, interrupted resume·retry, atomic extract/cache publish, corrupt cache repair, launcher가 이미 실행된 뒤 Runtime network 없이 하는 verified-cache reuse, incompatible launcher·Runtime, yanked release와 명시적 rollback을 어떤 fail-closed contract로 표현해야 하는가? Public `npx` command 자체의 offline resolution은 보장하지 않는다.

## Answer

공식 GitHub Releases·HTTP Range·Node 22 근거와 현재 Runtime materialization·verifier audit는 [Runtime release delivery·integrity 공식 근거 조사](../assets/runtime-release-delivery-research.md)에 기록했다. 결론은 **exact npm package에 내장된 descriptor를 selection trust root로 두고, GitHub Release는 immutable distribution·publication evidence이지 selection authority가 아니며, download·resume·cache·repair·safe extract를 하나의 깊은 `RuntimeResolver` 안에 숨기는 것**이다.

### 세 설계안에서 고른 Interface

Design-It-Twice를 세 안으로 비교했다.

| 설계안 | 장점 | 첫 release 판정 |
| --- | --- | --- |
| `resolve()` 하나만 노출 | 정상·cache hit·중단 재개·손상 repair가 동일한 caller contract를 쓴다. | **채택** |
| `prepare({ selection, acquisition })` | rollback Runtime·cache-only mode를 한 launcher에서 고를 수 있다. | 현재 caller가 필요로 하지 않는 policy와 compatibility 분기를 노출하므로 제외 |
| `resolve()` + `recover(repair/rollback/restore)` | support operation을 명시적으로 표현한다. | repair는 자동 transaction이며 rollback은 exact app release 교체이므로 제외 |

Production Interface는 다음 수준으로 고정한다.

```ts
interface RuntimeResolver {
  resolve(input: {
    readonly appDataRoot: string
    readonly signal: AbortSignal
    readonly report: (event: RuntimeResolutionEvent) => void
  }): Promise<VerifiedRuntime>
}

interface VerifiedRuntime {
  readonly runtimeRoot: string
  readonly identity: {
    readonly releaseId: string
    readonly target: 'darwin-arm64'
    readonly runtimeContractVersion: number
    readonly nativeCodexVersion: string
    readonly pythonVersion: string
    readonly sourceCommit: string
    readonly patchStackSha256: string
  }
}
```

`runtimeRoot`는 canonical absolute path이고 성공 return 직전 complete-tree verification을 통과한다. Caller는 launcher/Runtime version, URL, archive format·hash, manifest path, cache generation, retry 수, repair 여부를 input으로 주거나 selection policy로 해석하지 않는다. Returned identity는 diagnostics·instance evidence와 Runtime factory pass-through에만 쓴다. Resolver가 package-owned application identity를 embedded descriptor와 직접 대조한다. Runtime process spawn 직전에는 기존 Runtime factory가 같은 verifier를 다시 실행해 resolver return 후 변조를 잡는다. `report` exception은 correctness를 바꾸지 않고 cancellation authority는 `AbortSignal`만 가진다.

GitHub HTTPS는 true external이므로 package-private `ArchiveTransport` port와 production adapter·scripted fake를 둔다. Filesystem·clock·random·backoff는 local-substitutable dependency로 temp filesystem·fake clock으로 검증하되 caller Interface로 노출하지 않는다. Manifest decode·compatibility·hashing·roster reconciliation은 in-process logic이다. 이 Module을 제거하면 production host에 URL·partial journal·tar safety·atomic publish·repair가 퍼지므로 deep Module의 delete-test도 통과한다.

### Version과 authority를 분리한다

| Material | 정본 책임 |
| --- | --- |
| npm package의 `runtime-release.json` | 이 exact `ay-ple` version이 사용할 단 하나의 Runtime release, target·contract, exact GitHub asset URL·name·bytes·SHA-256, package resource로 들어 있는 canonical Runtime manifest digest를 선택하는 trust root |
| package canonical Runtime manifest·archive `manifest.json` | 두 byte copy가 일치해야 하며 Runtime identity·launch-relative path·complete recipient payload roster·build input provenance를 소유 |
| `provenance/components.json` | Ticket 003a의 canonical component roster copy로, `NOTICE`·`THIRD_PARTY_NOTICES`·license tree·SBOM의 생성·set-equality 근거 |
| GitHub Release metadata·asset `digest`·attestation | Publication이 위 정본과 일치함을 입증하는 transport/publication evidence. Runtime selection authority는 아님 |
| Local receipt·ETag·`Content-Length` | transaction·resume hint. Expected byte나 compatibility의 authority는 아님 |

`runtime-release.json`은 다음 최소 schema를 가진다. Exact byte copy를 npm package와 GitHub Release에 두되 resolver는 network sidecar를 읽지 않고 package copy만 신뢰한다.

```ts
interface RuntimeReleaseDescriptor {
  readonly schemaVersion: 1
  readonly launcher: {
    readonly packageName: 'ay-ple'
    readonly version: string
  }
  readonly distribution: {
    readonly repository: string
    readonly applicationReleaseTag: string
    readonly runtimeAssetReleaseTag: string
  }
  readonly runtime: {
    readonly releaseId: string
    readonly target: 'darwin-arm64'
    readonly runtimeContractVersion: number
  }
  readonly archive: {
    readonly format: 'ay-ple-runtime-tar-gzip-v1'
    readonly assetName: string
    readonly url: string
    readonly bytes: number
    readonly sha256: string
  }
  readonly manifest: {
    readonly packageResource: string
    readonly schemaVersion: 2
    readonly bytes: number
    readonly sha256: string
  }
}
```

Unpacked entry·regular byte·symlink bound와 expected Runtime/source/patch/payload identity는 descriptor가 digest로 pin한 package canonical manifest에서 읽고 두 파일에 중복 권한으로 적지 않는다. `distribution.repository`·`runtimeAssetReleaseTag`·asset URL은 서로 일치해야 하며 OpenAI upstream repository·commit·tag는 이 tuple과 섞지 않고 canonical Runtime manifest가 소유한다. `runtime-release.json`은 application→Runtime binding이므로 exact GitHub sidecar는 `applicationReleaseTag`의 application release evidence에 둔다. Pinned Runtime asset은 그 tag와 같거나 더 이른 `runtimeAssetReleaseTag`에 있을 수 있어, 새 app version이 같은 Runtime bytes를 재사용해도 기존 Runtime release를 수정하지 않는다. Resulting public commit SHA를 그 commit에 들어갈 source descriptor에 적는 self-reference를 만들지 않는다. Fixed `hub` source SHA·export manifest digest·resulting public commit↔npm↔Runtime mapping은 Ticket 015의 외부 release ledger가 소유한다.

- AY-PLE application/launcher는 public npm SemVer를 쓴다.
- Runtime `releaseId`도 native Codex version·Python version·app version과 독립된 AY-PLE-owned SemVer를 쓴다. Archive, manifest 또는 recipient payload byte가 달라지면 반드시 증가하고 같은 ID·tag를 다른 bytes에 재사용하지 않는다. 동일한 Runtime asset은 여러 launcher version이 exact descriptor로 같은 ID·digest를 pin할 수 있다.
- Descriptor schema, Runtime manifest schema, app–Runtime contract version은 각각 진화한다. Native `codex-cli 0.144.4`, Python `3.10.18+20250818`, source commit·patch stack은 Runtime identity evidence이지 Runtime release version을 대신하지 않는다.
- Descriptor의 package-owned launcher version·application/Runtime distribution tag·URL tuple·target·contract·package canonical manifest가 하나라도 어긋나면 network·persistent mutation 전에 `runtime_incompatible`로 닫는다. SemVer range로 추측하지 않는다.

### Recipient archive와 complete-tree verifier

전달 format은 executable mode와 현재 bundle의 internal symlink 9개를 보존하는 deterministic `.tar.gz` 하나로 제한한다. Archive는 fixed order, normalized timestamp·owner·group·mode와 deterministic gzip header로 생성하고 자동 생성된 GitHub source archive를 Runtime asset으로 쓰지 않는다.

```text
manifest.json
bundle/
NOTICE
THIRD_PARTY_NOTICES.md
licenses/
sbom.spdx.json
provenance/
```

Current materialization의 `bundle/`는 2,539 regular files·9 symlinks·366,692,788 regular bytes고, `manifest.json + bundle/`의 비정규 진단용 gzip tar는 약 136.7MB였다. 이 수치는 필수 legal material이 빠진 current baseline이며 final size가 아니다. `downloads/` 17.5MB, production `wheels/` 119.1MB, `build-wheels/` 1.4MB와 source checkout·materializer는 recipient archive에서 제외한다. 단, 그 input에서 설치된 Python·wheels·native executable byte는 `bundle/`의 실제 재배포 payload이며 제외되지 않는다. Input URL·digest·builder evidence만 `manifest.json`·`provenance/`에 build-only로 분리한다.

Runtime manifest는 v2에서 다음을 분리해야 한다.

- `manifest.json` 자체를 제외한 archive root 전체의 file count·regular bytes·symlink count·mode·path·digest를 표현하는 recipient `payload` roster evidence
- execution tree를 따로 확인하는 기존 `bundle` subtree evidence
- Runtime identity·bridge/native/Python relative path와 app–Runtime contract
- archive에 실제로 있지 않은 download·wheel·source·builder를 `input_provenance` 상태로 표현하는 evidence

`manifest.json`은 자기 hash를 담지 않고 descriptor의 exact bytes·SHA-256와 package canonical copy가 보호한다. Extracted verifier는 exact top-level set, canonical manifest byte equality, complete recipient payload roster, component roster↔`NOTICE`·license·SBOM·provenance set equality, selected executable의 regular file·mode·no-symlink 조건을 실행 없이 검증한다. Current Node `verifyProductionBundle()`의 bundle hash·path containment은 donor로 유지하되 hard-coded Runtime identity와 bundle-only top-level 검사를 descriptor·manifest-driven public release verifier로 교체한다. Current Python verifier는 build input까지 확인하는 materialization verifier로 분리한다.

Extraction은 system `/usr/bin/tar`를 spawn하지 않고 resolver 내부의 exact dependency로 실행한다. Local archive를 먼저 전부 scan해 final PAX header를 적용한 normalized path graph, Unicode normalization+macOS case-fold collision, duplicate·prefix type conflict와 entry/file/expanded-byte bound를 write 전에 검증한다. Absolute·`.`·`..`·NUL path, hardlink, sparse file, device·FIFO·socket, setuid/setgid 등 unsafe mode, xattr·ACL은 거절한다. Directory와 regular file은 symlink ancestor를 절대 따라가지 않는 no-follow operation으로 먼저 쓰고, 필요한 symlink는 lexical·resolved target이 staging root 안에 남는지 확인해 마지막에 생성한 뒤 전체 link graph를 다시 검증한다. Tar metadata의 uid/gid를 신뢰하지 않고 current user로 생성하며 manifest의 reviewed `0644`/`0755` mode만 재적용한다.

### Cache·download·atomic publish

Logical cache layout은 `appDataRoot`의 owner-only Runtime subtree로 고정한다.

```text
runtime-cache/v1/
  archives/<archive-sha256>.tar.gz
  partials/<archive-sha256>/{archive.part,journal.json}
  generations/<runtime-release-id>/<target>/<archive-sha256>/
    runtime/                 # archive root와 동일
    receipt.json
  staging/<random-nonce>/
  quarantine/<timestamp>-<random-nonce>/
```

Final generation은 version·content-addressed이며 in-place로 수정하거나 덮어쓰지 않는다. Release ID·target·digest는 strict grammar로 decode하고 user input을 path component로 받지 않는다. Resolver는 `appDataRoot`의 absolute·canonical·owner-only·non-symlink 조건을 다시 검사하고 fixed `runtime-cache/v1` 밖을 변경하지 않는다. Digest 단위 exclusive coordination을 숨기며 arbitrary PID를 kill하지 않는다. Same-process resolve는 shared promise에 join한다. Extraction 전에 outer staging에 exclusive transaction receipt를 만들고 schema·descriptor digest·transaction nonce·Ticket 006 primary instance nonce·PID/process-start identity·phase를 기록한다. 다음 실행은 global instance owner 부재와 containment·owner·matching token을 모두 증명한 residue만 compare-and-rename해 quarantine·remove하고 unknown residue는 `runtime_recovery_required`로 닫는다. Staging은 final과 같은 filesystem에서 생성하고 file·receipt와 parent directory까지 sync한 뒤 outer generation을 atomic rename한다. Receipt는 transaction index일 뿐 다시 검증을 대신하지 않는다. First preview는 verified archive·generation을 자동 eviction하지 않아 network 없는 reuse·repair와, still-supported 이전 release가 생긴 뒤에는 그 exact app rollback을 보존한다. Descriptor·manifest는 exact download·expanded regular bytes를 제공하고 resolver는 현재 retained archive·generation·quarantine·repair state를 반영해 이번 transaction의 incremental working-space bound를 mutation 전에 계산한다. Landing은 first-install size를 conservative estimate로 표시한다.

`resolve()` ordering은 다음과 같다.

1. Embedded descriptor·canonical manifest를 strict decode하고 launcher·target·contract를 검사한다.
2. Archive digest 단위 lease를 exclusive create로 획득한다. Same-process call은 shared promise, matching live 외부 transaction은 bounded join한다. Stale candidate는 Ticket 006 instance owner 부재와 matching descriptor·instance/transaction nonce·process-start identity를 모두 증명하고 compare-and-rename할 수 있을 때만 회수한다. Ambiguous owner는 PID를 kill하거나 age로 추측하지 않고 `runtime_recovery_required`로 닫는다.
3. Exact final generation을 receipt가 아닌 complete-tree verifier로 매 호출마다 검증한다. 성공하면 GitHub를 호출하지 않고 return한다.
4. 손상 generation은 matching receipt·containment·owner·symlink를 확인한 뒤 token-scoped atomic quarantine한다. 추측할 수 없는 state는 손대지 않고 `runtime_recovery_required`로 닫는다.
5. 보관한 archive의 exact bytes·SHA-256를 검증한다. 유효하면 network 없이 fresh staging에서 repair한다.
6. Archive가 없거나 손상됐으면 partial을 안전하게 재개하거나 exact URL을 새로 download한다. Transport interruption과 `408`·`429`·`500`·`502`·`503`·`504`만 원본 시도 뒤 자동 1회까지 bounded retry하고, `Retry-After`는 전체 startup deadline 안에서만 존중한다. Outer size·SHA-256 mismatch도 candidate를 quarantine하고 fresh download 1회 뒤 반복되면 non-retryable integrity failure로 닫는다. 완전한 size·SHA-256를 통과한 file만 `archives/` 안에 atomic publish한다.
7. Owner-only empty staging에 safe extract하고 canonical manifest·complete tree·legal roster를 실행 없이 검증한다. Receipt를 마지막에 쓰고 sync한 뒤 generation을 atomic publish한다.
8. Published final path를 다시 검증한 후에만 return한다. 실패하면 matching transaction token으로 해당 generation을 quarantine하고 existing valid generation이나 다른 release generation은 건드리지 않는다. Atomic rename commit이 시작된 뒤에는 cancellation을 해당 transaction 완료까지 미룬다.

Partial journal은 descriptor digest·expected bytes·local bytes·strong `ETag`을 담는다. Initial URL과 모든 redirect hop은 HTTPS만 허용하고 max-hop·visited-URL cycle을 검사한다. 매 hop마다 최소 header를 새로 구성해 `Authorization`·`Cookie`·이전 `Host` 같은 origin/resource-specific header와 secret을 전달하지 않으며 `Accept-Encoding: identity`를 보내고 non-identity response encoding을 거절한다. Fresh full download는 ETag 없이도 허용해 final size·SHA-256로 검증한다. Resume는 strong validator가 있을 때만 `Range: bytes=N-`·`If-Range`를 쓰고, 없으면 interrupted partial에 append하지 않고 full restart한다.

| Response | 처리 |
| --- | --- |
| Exact `206` + matching `Content-Range` start/total | 기존 partial에 append |
| `200` | Range를 무시했으므로 truncate하고 full response로 restart |
| `416` | Local bytes가 expected total과 같을 때만 final SHA-256를 검증하고, 아니면 restart |
| ETag 변경·weak/absent validator·invalid range·oversized body | 절대 append하지 않고 fresh restart 또는 fail closed |
| `401`/`403` | `runtime_access_denied`; explicit rate-limit evidence와 bounded deadline이 있을 때만 retryable |
| `404`/`410` | retry·fallback 없이 `runtime_release_unavailable` |

Cancellation·network 실패는 descriptor와 일치하고 size bound 안인 partial만 보존한다. Fresh retry 뒤에도 complete archive integrity가 어긋나거나 inner manifest/tree/archive member policy가 실패하면 다른 version·mirror로 넘어가지 않고 즉시 fail closed한다. 정상 return 후 background retry·download를 남기지 않는다.

### Offline·yank·rollback

- Outer `npx` package resolution은 Ticket 006처럼 offline을 보장하지 않는다. Exact launcher가 실행된 뒤에는 valid extracted generation을 network 없이 재검증·재사용하고, retained valid archive가 있으면 corrupt generation도 offline repair한다.
- GitHub API·moving `latest`·mutable catalog를 startup authority로 조회하지 않는다. Published exact package는 나중의 security revocation을 offline에서 알 수 없으므로 remote kill switch를 약속하지 않는다.
- Yank는 새 package와 Landing이 해당 Runtime을 더 이상 pin·안내하지 않고 publication ledger에 사유를 남기는 operation이다. Immutable release 전체가 삭제되어 asset이 unavailable이면 uncached invocation은 실패하고 같은 tag를 다른 bytes에 재사용하지 않지만, 이미 검증된 cache를 원격 삭제하거나 실행 금지하지 않는다.
- Runtime failure로 다른 cached version을 자동 선택·downgrade하지 않는다. 명시적 rollback은 현재 launcher에 arbitrary Runtime ID를 넣는 기능이 아니라, release ledger가 still-supported로 표시한 이전 exact application pair를 `npx ay-ple@<older-version>`으로 실행하는 operation이다. 그 package의 embedded descriptor가 compatible Runtime을 고른다. Retained generation/archive가 있으면 offline에서도 재사용하지만 cache도 asset도 없는 withdrawn release는 rollback 가능하다고 약속하지 않는다.
- 첫 public release에는 이전 public pair가 없으므로 rollback command를 광고하지 않는다. Synthetic prior descriptor의 no-auto-downgrade·exact-pair contract는 resolver scripted integration fixture에서만 검증한다. 실제 이전 release가 생긴 뒤 still-supported ledger·command와 public rollback smoke를 publication evidence에 추가한다.

### Stable progress·failure contract

Progress는 `checking_cache`, `repairing`, `downloading`(received/total/resumed), `verifying_download`, `extracting`, `verifying_runtime`, `ready`(cache/download/offline-repair)를 표현한다. URL·local path·digest를 사용자 UI contract로 올리지 않는다.

| Stable code | 의미·사용자 행동 |
| --- | --- |
| `runtime_cancelled` | 중단됨. Strong-validator partial이면 재사용하고 아니면 다시 실행할 때 처음부터 download |
| `runtime_incompatible` | launcher·target·contract·manifest 불일치. 지원되는 exact AY-PLE version 사용 |
| `runtime_network_unavailable` | valid cache가 없고 transport가 실패함. Network 확인 후 retry |
| `runtime_access_denied` | Public asset이 `401`/`403`. 명시적인 rate-limit evidence가 startup deadline 안에 있을 때만 retryable |
| `runtime_release_unavailable` | Pinned asset이 `404`/`410`. 새 supported exact release 사용 |
| `runtime_integrity_failed` | Archive·manifest·payload·legal roster가 정본과 다름. 실행 금지·새 release 확인 |
| `runtime_archive_unsafe` | Path·link·entry·decompression 제약 위반. 실행 금지 |
| `runtime_storage_unavailable` | 용량·owner·permission·filesystem publish 실패. 공간·권한 해결 |
| `runtime_cache_unsafe` | symlink·containment·receipt 위반. 임의 삭제 없이 recovery 필요 |
| `runtime_recovery_required` | 자동으로 소유권·transaction을 입증할 수 없음. 지원 절차로 이동 |

Error는 `code`, `phase`, `retryable`, safe `displayMessage`를 노출하고 raw HTTP body, private path, nested cause를 terminal·UI message에 넣지 않는다. Detailed diagnostic은 secret redaction 후 local log에만 남긴다.

### Publication·smoke에 넘길 blocking evidence

- Runtime asset은 첫 public release 전에 GitHub repository의 immutable releases를 활성화한다. Draft에서는 local digest·`REDIST-*`·asset readback을 검증하고, publish 뒤 `immutable=true`·release attestation·asset digest를 검증한 후에만 npm·Landing을 노출한다. Post-publish 검증이 실패하면 asset을 수정하지 않고 그 release를 unusable로 기록한 뒤 새 `releaseId`·tag를 만든다. 세부 ordering·partial failure resume ledger는 Ticket 015가 소유한다.
- Ticket 015는 npm descriptor↔GitHub descriptor sidecar bytes, npm canonical manifest↔archive `manifest.json` bytes, descriptor archive size·SHA↔GitHub asset digest·readback bytes를 각각 비교하고 deterministic rebuild, archive root legal/SBOM/provenance set equality와 retained/yanked release ledger를 gate해야 한다. Downloaded Mach-O의 actual signature identity/status와 archive extraction 전후 보존 조건은 이 ticket에서 조사하며 유료 Developer ID·notarization을 미리 약속하지 않는다.
- Ticket 016은 actual GitHub에서 관찰한 redirect와 강제 중단 뒤 resume 또는 safe full restart, network 차단 verified-cache reuse, retained archive offline repair, corrupt archive reacquisition, unavailable asset의 no-auto-downgrade를 black-box로 검증한다. Clean Mac의 quarantine·Gatekeeper·native execution 결과는 사전 성공을 가정하지 않고 관찰·기록하며 process cleanup까지 닫는다. `200/206/416` 전체 protocol matrix는 scripted transport integration gate가 소유한다.
- Ticket 013은 descriptor·manifest에서 생성한 exact first-download bytes·installed regular bytes, retained archive·staging을 포함한 conservative free-space bound, cache 위치, current exact command와 실제 still-supported 이전 pair가 있을 때만 rollback command를 product vision을 덮지 않는 trust surface에 표시해야 한다.
- Unit/integration gate는 valid cache의 transport 0회, clean first download·atomic install, `206`·`200`·`416`·validator drift, HTTPS downgrade·redirect cycle·content-encoding drift, bounded retry/deadline, cancellation·crash residue, digest lease의 bounded join과 nonce-scoped stale recovery, corrupt install + retained archive repair, corrupt archive + reacquisition, unsafe tar·case collision·decompression bomb, missing/extra/mode/symlink/legal roster drift, owner·permission violation, incompatible descriptor가 network 전에 실패함을 같은 `RuntimeResolver.resolve()` Interface로 증명해야 한다.
