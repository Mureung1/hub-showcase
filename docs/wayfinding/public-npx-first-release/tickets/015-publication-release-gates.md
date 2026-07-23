# 015 — Public source·npm·Runtime publication gate를 확정한다

## Wayfinder ticket

- Type: research
- State: resolved
- Blocked by: [Third-party 재배포 evidence와 release notice gate를 확정한다](003a-third-party-redistribution-evidence.md), [Public repository authority와 license를 확정한다](005-public-repository-authority-and-license.md), [npx production composition을 고른다](006-npx-production-composition.md), [Runtime release delivery·integrity·versioning을 정한다](007-runtime-release-delivery-integrity.md), [Public npx distribution 결정을 formal owner에 채택한다](007a-record-public-distribution-decision.md), [Landing의 product promise와 install truth를 검증한다](013-landing-install-truth.md), [최종 병렬 delivery contract와 integration protocol을 정한다](014-final-parallel-delivery-contracts.md)

## Question

[Ticket 005](005-public-repository-authority-and-license.md)의 fixed `hub` SHA에서 deterministic하게 만든 local/private RC, gate 실패 시 `hub` 수정 후 전체 재생성, final clean root commit의 immutable source↔public mapping과 published commit·tag 불변성, [Ticket 006](006-npx-production-composition.md)의 one-package positive pack roster·`npm-shrinkwrap.json` dependency closure와 exact smoke command를 고정 입력으로 둔다. 그 위에서 clean public source snapshot, `npm pack` 결과의 dedicated workspace instruction/Skill resource subtree·`AGENTS.md`·built-in Skill root별 complete-tree roster·digest descriptor와 embedded Runtime descriptor·canonical manifest, application release의 exact descriptor sidecar, 같거나 이전 immutable release의 pinned Runtime archive·checksum·legal/SBOM/provenance와 Landing이 하나의 exact release ledger를 가리킨다고 자동 판정하려면 어떤 blocking evidence가 필요한가? Source bundle bytes↔packed resource↔descriptor digest가 exact match하고 ambient repository-root `AGENTS.md`·`.agents/`가 tarball resource로 유입되지 않았음을 어떤 pack/readback gate로 증명할 것인가? Repository immutable releases를 첫 publish 전에 활성화하고 draft asset readback·GitHub digest·publish 뒤 release attestation, downloaded Mach-O의 actual signature identity/status와 archive extraction 전후 보존을 어떤 순서와 판정으로 gate할 것인가? npm publish, GitHub Release·Pages 노출의 ordering과 partial failure 정산, retained/yanked version, 실제 이전 public pair가 생긴 뒤 still-supported exact app rollback을 어떤 기록과 재개 계약으로 관리할 것인가?

## Answer

GitHub·npm·Pages는 atomic transaction을 제공하지 않으므로, publication은 fixed local RC 하나를 입력으로 받는 **read-before-write → one write → authoritative readback** state machine으로 고정한다. `G1`·`I1`·prepublication live `I2`가 같은 candidate digest를 가리키고 두 번의 deterministic source/npm/Runtime 생성, `REDIST-01..12`, canonical component·package complete-tree, legal/SBOM/provenance와 Mach-O signature roster가 모두 green이어야 외부 write 승인을 요청할 수 있다. 현재 repository에는 public `AY-PLE` remote·package·release workflow·Landing과 release ledger가 없고 legal/provenance closure도 미완성이므로, 이 ticket의 `resolved`는 publication clearance가 아니라 구현할 release protocol의 확정이다.

성공 경로의 첫 publish 승격 순서는 다음과 같다.

```text
LOCAL_RC_ACCEPTED
  → PUBLICATION_AUTHORIZED
  → PUBLIC_SOURCE_VERIFIED
  → APPLICATION_DRAFT_STAGED
  → RUNTIME_RELEASE_VERIFIED
  → NPM_VERSION_VERIFIED
  → NPM_PUBLISH_CREDENTIAL_RETIRED
  → EXACT_PUBLIC_SMOKE_VERIFIED
  → APPLICATION_RELEASE_VERIFIED
  → PAGES_DEPLOYMENT_VERIFIED
  → CURRENT_PUBLIC_PREVIEW
```

이 선형열은 success path만 나타낸다. `NPM_PUBLISH_CREDENTIAL_RETIRED`는 GAT가 주입된 모든 success·failure·ambiguous outcome의 orthogonal barrier이며, S7은 `S5 green ∧ 모든 injected GAT retired`일 때만 열린다. S5 failure branch는 retirement receipt만으로 success를 합성하지 않고 retry 또는 incident로 간다.

사용자는 public repository/npm target, `v<applicationVersion>`·`runtime-v<runtimeReleaseId>` tag와 candidate digest를 보고 `P1`을 승인한다. G1 `release-intent.json`은 candidate·target·plan만 freeze하고, 실제 approver·time·scope는 그 digest를 참조하는 owner-only `publication-authorization.json`에 S1이 detached로 freeze한다. Immutable Releases와 protected tag ruleset을 첫 draft 전에 켜고 확인한 뒤 fixed clean source를 push한다. Application release는 이때 publish하지 않고 exact reference npm `.tgz`, `runtime-release.json`, `release-intent.json`을 보관하는 private draft staging surface로만 만든다. 새 Runtime은 draft asset roster·downloaded bytes·extracted legal tree·Mach-O signature를 읽어 본 뒤 immutable publish와 release attestation을 검증하고, reused Runtime은 earlier tag를 옮기지 않은 채 같은 public readback을 다시 통과한다.

첫 `ay-ple` package에는 npm staged/trusted publishing을 bootstrap할 수 없으므로 public GitHub-hosted Actions의 protected environment와 일시적 least-privilege granular access token을 사용한다. Credential 주입 전 protected application tag/ref의 `GITHUB_REPOSITORY`, `GITHUB_REF`, `GITHUB_SHA`, `GITHUB_WORKFLOW_SHA`가 expected repository·tag·S2 commit이어야 한다. Job은 exact S2 source에서 reviewed deterministic generator/build로 `.tgz`를 다시 만들고, 그 bytes·complete-tree·dependency closure가 G1/application draft reference와 exact match할 때만 **CI가 만든 그 output**을 `--access public --tag preview --provenance`로 publish한다. `preview`는 숨김 장치나 selection authority가 아니며 `latest`는 만들지 않는다. GAT를 주입한 모든 success·failure·ambiguous branch는 `npm token delete <id>` 후 그 exact token의 `whoami` auth rejection을 확인하는 unconditional retirement barrier로 합류한다. Success path는 registry tarball·provenance readback과 credential retirement을 모두 통과한 뒤에만 Ticket 016의 actual public `npx --yes ay-ple@<exact-version>` smoke를 실행한다. 사용자에게 보이는 command는 `--yes` 없는 `npx ay-ple@<exact-version>`이다.

Cross-surface authority는 다음처럼 분리한다.

| Material | 책임 |
| --- | --- |
| `release-intent.json` | G1이 freeze한 non-self-referential candidate·target·plan. External write 뒤 수정하지 않음 |
| `publication-authorization.json` | S1이 intent digest·approver·time·exact scope를 freeze한 owner-only detached approval. Public ledger에는 digest만 노출 |
| `application-binding-ledger.json` | Public source, immutable Runtime, npm tarball/provenance·credential retirement와 exact public smoke/receipt digest를 묶는 application release asset. 자신의 future release ID·attestation은 넣지 않음 |
| `prebinding-publication-receipts.jsonl` | S2–S7 complete receipt epoch을 freeze해 binding ledger와 함께 immutable application release에 싣는 public-safe evidence snapshot |
| `publication-receipts.jsonl` | Pre-binding receipt는 intent·authorization을, activation/Pages receipt는 binding ledger까지 참조하는 append-only external intent·response·readback |
| `publication-projection.json` | 위 transitive digest chain에서 phase·current·retained·unusable 상태를 계산한 projection |
| Package `runtime-release.json`·canonical manifest | 계속해서 Runtime selection과 extracted payload identity의 startup trust root. Ledger가 이를 대체하지 않음 |

Public source remote tree에는 Ticket 005 required set이 exact inclusion되고 camp/agent/internal hard-deny set은 0개여야 한다. R2-owned Runtime component slice를 G가 read-only로 결합한 canonical roster 하나에서 notices·original licenses·SBOM·provenance를 생성하고 surface별 actual set과 비교한다. Source→staging→local reference→CI rebuild→registry tarball의 workspace resource path·type·mode·SHA complete-tree, declared dependency→shrinkwrap→installed closure→SBOM, bundler input→`bundled_js` roster가 각각 exact equality여야 한다. Descriptor의 repository·Runtime tag·asset name·URL은 live GitHub release/list-assets의 returned `browser_download_url`과 new·reused Runtime 모두에서 같아야 한다. Mach-O는 candidate 전·local extract 후·GitHub download/extract 후 SHA-256·mode·`codesign --verify --strict` 결과와 Identifier·TeamIdentifier/Authority 또는 ad-hoc·CDHash를 비교한다. Quarantine/provenance xattr는 archive identity가 아니며 clean Mac의 Gatekeeper·actual native execution은 Ticket 016이 판정한다.

Public source가 npm provenance보다 먼저 보여야 하는 unavoidable partial state에서 fixed README는 exact command·fixed public `release/current.json` link를 보이되, sentinel이 같은 application version·tag·binding-ledger digest를 반환할 때만 supported라는 조건을 명시한다. Pages auto-deploy를 끄고 ADR 0015의 fixed clean snapshot 뒤 presentation-only source commit을 만들지 않는다. Public smoke와 immutable application release까지 green이면 protected manual Pages workflow가 G1 base와 S8 ledger에서 sentinel을 deterministic하게 추가한 exact artifact를 배포한다. Application release attestation, Pages deployment/API/actual HTTPS body, public sentinel↔ledger equality까지 검증해야 `CURRENT_PUBLIC_PREVIEW`다.

Timeout은 성공·실패로 추측하지 않고 remote natural identity를 먼저 reconcile한다. npm exact version이 candidate와 같으면 response-loss 성공으로 정산하고, mismatch·provenance 누락 또는 product smoke 실패면 version은 소진된 것으로 본다. GAT 주입 후 exact-token auth rejection을 확인하지 못하면 success·failure 관계없이 `credential_retirement_reconciliation`에 멈추고 retry·incident closure로 가지 않는다. 조건부 사용자 승인 범위에서 현 attempt의 unpublished application·Runtime draft/starter만 safe cleanup하고, `preview` tag를 제거하고 exact version을 deprecate한다. Runtime은 독립 gate가 green이고 결함과 무관할 때만 그대로 reuse하되, 새 Runtime binding이 descriptor/package bytes를 바꾸면 새 release attempt·application version·tag가 필요하다. Pre-S8 journal loss는 full re-observation의 새 epoch로만 재개하고 S8에서 public-safe prebinding receipt snapshot을 immutable release에 싣는다. Immutable Runtime/application release는 기본적으로 retained `unusable`/`unreferenced`로 남기며 asset·tag를 고치지 않는다. Release 삭제·npm unpublish·Pages unpublish는 정상 rollback이 아니라 별도 승인 대상이다. Pages-only transport failure는 같은 verified artifact만 재배포한다. 첫 release에는 실제 prior public pair가 없으므로 rollback command를 만들지 않는다.

공식 근거, current repository audit, exact receipt schema, S0–S10 gate와 partial-failure matrix는 [Public source·npm·Runtime publication release gate 연구](../assets/publication-release-gates-research.md)에 기록했다.
