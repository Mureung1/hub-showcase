# SemesterWorkspace schema·scaffold 조사

조사일: 2026-07-22

대상: [첫 public release의 SemesterWorkspace schema·scaffold 경계를 정한다](../tickets/009-semester-workspace-admission.md)

## 판정

첫 normalized `SemesterWorkspace`는 current app-owned store seam을 explicit `formatVersion: 3`으로 올린 **단일 atomic aggregate**를 사용한다. Aggregate 내부의 논리적 `WorkspaceManifest`가 workspace·학기·Course identity와 projection 관계를 단독 소유하고, dynamic state는 그 ID를 참조할 뿐 다시 정의하지 않는다. 첫 preview에는 별도 Manifest sidecar나 current v2 migration을 추가하지 않는다.

사용자가 고르는 위치는 기존 parent directory이고, App은 그 아래에 존재하지 않는 leaf 하나를 exclusive하게 생성한다. 기존 empty directory도 임의로 채택하지 않는다. Valid v3 aggregate와 required directory seam의 fresh validation을 통과한 결과만 admitted workspace이며, durable `ready=true` flag나 app-data registry pointer는 authority가 아니다.

## Current evidence

| 관찰 | 근거 | Target에 주는 제약 |
| --- | --- | --- |
| Current store는 `<workspaceRoot>/.ay-ple/workspace-state.json`의 exact `formatVersion: 2` aggregate다. `workspaceId`, nullable 한 `Course`, confirmed state·history·guard를 한 file이 소유한다. | [store type·path·version](../../../../apps/server/src/semester-workspace-store.ts), lines 77–106 | Sidecar Manifest에 같은 ID를 추가한 채 v2를 유지할 수 없다. |
| Store가 없는 선택 directory는 activation만으로 `.ay-ple`과 empty v2를 생성한다. | [store open·create](../../../../apps/server/src/semester-workspace-store.ts), lines 124–215 | Current `open()`은 public admission에 재사용할 수 없다. Target inspect/open은 mutation하지 않고 scaffold만 명시적으로 create한다. |
| Current decoder는 exact key·version·aggregate invariant를 검사한다. Valid v2는 original serialized bytes를 authority로 열고 startup에서 rewrite하지 않는다. | [decoder](../../../../apps/server/src/semester-workspace-store.ts), lines 218–271; [compatibility tests](../../../../apps/server/src/semester-workspace.test.ts), lines 430–654 | Same-version field injection을 금지하고 v3를 별도 format으로 판정한다. |
| Write는 unique temp file, opened-byte 비교와 rename으로 external drift를 막지만 current 구현에는 file·directory `fsync`나 process lock이 없다. | [store write](../../../../apps/server/src/semester-workspace-store.ts), lines 284–365 | Target publish는 no-clobber, sync와 process-level serialization을 resulting spec에서 명시해야 한다. |
| v1, decoder-invalid/pre-baseline v2 shape, malformed/future version과 non-regular store는 원본을 바꾸지 않는 `incompatible/readOnly` 경계로 수렴한다. Decoder-valid v2는 minified JSON이나 다른 key order여도 original serialized bytes를 그대로 authority로 연다. | [Server README](../../../../apps/server/README.md#workspace-local-durable-store); [ADR 0013](../../../adr/0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md) | 모든 decoder-valid v2 serialization을 `legacy_migration_required`로 분류하고, decoder-invalid bytes를 migration 후보로 추측하지 않는다. |
| `confirmedRevision`은 학업 상태 apply revision이며 Course 생성에도 증가하지 않는다. | [Course create](../../../../apps/server/src/semester-workspace.ts), lines 1120–1148 | Schema version, scaffold attempt나 Manifest CAS에 재사용하지 않는다. |
| Current product contract에는 physical store version·path·workspace ID가 없고 Browser workspace projection은 internal `ready`만 표현한다. | [product workspace contract](../../../../packages/product-contract/src/workspace.ts); [Server README](../../../../apps/server/README.md#public-product-api) | Setup/admission은 새 Browser-safe projection이 필요하지만 raw schema·absolute path는 product contract로 누출하지 않는다. |

## 검토한 format

| 대안 | Depth·locality | 실패 표면 | 판정 |
| --- | --- | --- | --- |
| Existing folder + v2 + Manifest sidecar | 초기 code diff는 작지만 두 파일이 같은 workspace·Course ID를 소유한다. | Silent adoption, same-version drift와 dual authority | 거절 |
| Manifest file + operational state file | Stable identity와 high-churn state의 locality가 가장 좋고 normal mutation은 한 파일씩 처리할 수 있다. | Scaffold·migration에 version-pair matrix, cross-file commit·restore와 referential drift가 즉시 필요하다. | 후속 후보 |
| Single v3 aggregate with logical `manifest` + `state` | Existing exact-byte aggregate seam과 한 version authority를 유지하며 caller가 physical split을 알 필요가 없다. | State가 커지면 stable Manifest도 함께 parse·rewrite한다. Future physical split은 explicit migration이 필요하다. | 첫 preview 채택 |

Physical split의 장점은 실제 multi-Course·large history에서 manifest-only read와 독립 evolution 필요가 확인될 때 다시 평가한다. 첫 release에서 두 physical file을 먼저 만드는 것은 관찰되지 않은 scale을 위해 setup recovery를 넓히므로 채택하지 않는다.

## Adopted workspace format

아래는 authority를 보여주는 logical shape다. Exact JSON field roster, encoding과 byte bound는 resulting implementation spec이 고정한다.

```json
{
  "kind": "ay-ple.semester-workspace",
  "formatVersion": 3,
  "manifest": {
    "workspaceId": "workspace_<opaque>",
    "semester": {
      "yearLevel": 2,
      "term": {
        "key": "1",
        "displayName": "1학기"
      }
    },
    "courses": []
  },
  "state": {
    "settings": {},
    "confirmedRevision": 0,
    "materials": [],
    "assignments": [],
    "statePatches": [],
    "userConfirmations": [],
    "modelingRuns": [],
    "executionGuard": null,
    "sourceRecovery": null
  }
}
```

- `formatVersion: 3` 하나가 aggregate, directory invariant와 두 logical section의 compatibility를 선택한다. `manifestVersion`·`stateVersion`을 따로 만들지 않는다.
- `WorkspaceManifest`만 opaque stable `workspaceId`, semester metadata, zero-or-more Course ID·display name·safe projection 관계를 정의한다. `state`의 patch·history가 가진 workspace/Course ID는 referential binding이며 definition이 아니다.
- 학생이 선택하는 `학년`은 `yearLevel`이다. UI는 1–4를 기본으로 제시하지만 schema는 positive safe integer를 허용해 초과학년을 막지 않는다. Calendar 학년도는 이번 setup input·schema 결정에 추가하지 않는다.
- UI는 `1학기`·`2학기`를 기본 term으로 제시하지만 `term.key`·`displayName`은 closed enum이 아닌 bounded extensible value다. 계절학기·custom term은 format bump 없이 표현할 수 있다.
- Course catalog는 empty일 수 있다. Initial admission과 `Semester Ready`는 default Course, Course folder나 `RawMaterial`을 요구하지 않는다.
- Folder name과 `courses/` 아래 path는 human-readable projection이다. Absolute path, app-data registry, account·credential, Runtime/thread identity는 aggregate에 넣지 않는다.
- Ticket 010은 initial defaults를 선택한 year-level·term metadata와 workspace instruction/Skill bundle로 제한했다. Default Course, timezone, locale, model·reasoning setting은 만들지 않는다. Exact aggregate field는 resulting spec이 고정한다.

## Minimal directory seam

```text
<semester-workspace>/
  AGENTS.md                     # setup-required workspace instruction/Skill bundle
  .agents/skills/               # descriptor-declared built-in Skill roots
  .ay-ple/
    workspace-state.json      # v3 logical WorkspaceManifest + app-owned state
  inbox/                      # 후속 import 검토 seam; 자동 RawMaterial 아님
  courses/                    # human-readable Course projection root
```

- `.ay-ple`, aggregate, `inbox/`, `courses/`는 supported version이 type·symlink·permission과 required presence를 검증하는 app-owned schema seam이다.
- Unknown root entry를 자동 import하거나 identity 근거로 사용하지 않는다. Incomplete scaffold에 unknown entry가 생기면 destructive cleanup을 중지한다.
- `AGENTS.md`와 descriptor-declared `.agents/skills/` built-in Skill root는 Ticket 010이 fresh setup과 같은 exact application version의 relaunch에 필요한 workspace instruction/Skill bundle로 정했다. `AGENTS.md`와 각 declared Skill root의 exact complete tree를 별도로 검증하고 descriptor 밖 sibling root는 소유하지 않는다. 다만 workspace-local `AGENTS.override.md`, `.codex/`와 descriptor 밖 Skill entry는 first-preview effective-native-context gate를 닫는다. Bundle은 admission identity가 아니며 runtime scratch와 projection child roster도 identity authority가 아니다.
- V3 aggregate는 current store와 같은 `.ay-ple/workspace-state.json` 경로를 사용한다. 따라서 older v2-only code도 새 root에 별도 empty v2를 만들지 않고 future version `incompatible/readOnly`로 멈춘다. Exact field roster·encoding은 resulting spec이, 구현 뒤 current 동작은 Server README가 소유한다.

## Deep Module seam

Filesystem은 local-substitutable dependency다. 별도 public filesystem Adapter를 만들지 않고 temp directory integration tests가 같은 Interface를 사용한다.

```ts
interface SemesterWorkspaceAdmission {
  inspect(intent: WorkspaceIntent): Promise<WorkspaceInspection>
  apply(plan: AuthorityBoundWorkspacePlan): Promise<WorkspaceApplyResult>
}
```

- `inspect`는 side effect 없이 parent·target·format·ownership·root relation을 fresh하게 분류하고 opaque observed authority가 bind된 plan을 만든다.
- `apply`는 Server가 발급·보관한 authority-bound plan과 current filesystem authority를 다시 비교한 뒤 create·open·owned resume·owned discard 중 plan에 허용된 operation 하나를 수행한다. `ready-relaunch`의 valid committed reopen은 사용자 재확인을 요구하지 않는다. Ticket 010은 create 전 최종 확인과 approved exact setup plan만 durable하게 두고, matching owned incomplete의 resume·safe discard만 recovery action으로 허용했다. Browser와 script는 `mkdir`, JSON, version, ID 발급, validation 순서나 cleanup을 조립하지 않는다.
- `AdmittedSemesterWorkspace`만 Server-private canonical root와 Manifest snapshot을 가진다. 이 capability만 active `workspaceRoot`·native `cwd`가 될 수 있다.
- Migration entry point와 generic filesystem port는 first preview에 만들지 않는다. 실제 supported migration이 생길 때 같은 Module 내부에 concrete operation을 추가한다.

Fresh inspection은 다음 의미를 구분한다. Exact enum과 public copy는 resulting spec이 소유한다.

| 분류 | 의미 | Mutation authority |
| --- | --- | --- |
| `new_target` | Existing canonical parent 아래 target leaf가 없다. | Reviewed scaffold만 가능 |
| `admitted` | Explicit reopen intent에서 supported v3 aggregate와 required seam이 모두 valid하다. | Opaque admitted capability 발급 가능 |
| `already_ready` | 같은 setup request·expected workspace ID의 target이 이미 valid v3 workspace다. | 같은 admitted capability로 idempotent 수렴 |
| `workspace_exists` | Create intent의 target에 다른 valid v3 workspace가 있다. | Preserve하고 explicit reopen을 요구 |
| `owned_incomplete` | Matching setup evidence가 있지만 v3 publish·validation이 끝나지 않았다. | Ticket 010의 생성 승인·recovery policy와 Ticket 011의 exact protocol에 따른 resume·owned discard만 가능 |
| `legacy_migration_required` | Decoder-valid current v2 bytes가 있다. | First preview에서는 read-only·no admission |
| `collision` | Create intent의 target에 existing empty/nonempty directory, file 또는 unowned partial tree가 있다. | Preserve and fail closed |
| `incompatible` | Explicit reopen intent에서 decoder-invalid/pre-baseline/future format 또는 controlled seam drift를 발견했다. | Preserve bytes and fail closed |
| `unsafe` / `unavailable` | Symlink·root overlap·unsafe permission 또는 I/O failure다. | Fail closed |

Validation result는 저장된 `ready` receipt가 아니라 현재 root와 exact aggregate bytes에서 매번 유도한다. Registry는 이 결과를 가리키는 pointer일 뿐이다. `Semester Ready`는 admission 뒤 account recheck와 workspace-bound Runtime 전환까지 별도로 만족해야 한다.

## Deterministic scaffold·publish

1. Input은 existing absolute canonical non-symlink parent, one-segment bounded leaf name, reviewed semester/defaults와 opaque setup request다. Recursive parent creation을 하지 않는다.
2. Parent와 computed target이 `packageRoot`·`appDataRoot`와 겹치지 않고 effective user가 안전하게 create·sync할 수 있는지 검사한다.
3. Workspace ID와 nondeterministic defaults는 첫 apply에서 한 번 발급하고, expected target·input digest와 함께 app data의 planned intent에 durable하게 bind한다. 이 intent는 root ownership 증거가 아니다. Exact journal·marker encoding은 Ticket 011이 정한다.
4. Non-recursive exclusive `mkdir(target)`로 final leaf를 reserve하고 root-local ownership marker를 durable하게 publish한다. `EEXIST`이면 empty directory도 overwrite·adopt·delete하지 않는다. `mkdir` 뒤 marker publish 전 crash로 남은 leaf는 unowned `collision`으로 보존해 manual recovery 또는 다른 target 선택을 요구하며 app-data intent만으로 자동 resume·delete하지 않는다. 이는 Ticket 004의 incomplete `recovery` outcome이지 automatic resume이 아니다.
5. Required directory seam과 empty initial aggregate를 app-owned temporary artifact로 쓰고 file·directory sync와 no-clobber publish를 수행한다. Final `.ay-ple/workspace-state.json` destination이 예상 밖에 생겼으면 대체하지 않는다. Matching owned artifact와 exact expected digest라면 rewrite 없이 validation으로 이어갈 수 있지만 unknown·mismatch destination은 절대 replace하지 않는다. Valid v3 aggregate를 마지막 durable authority로 publish한다.
6. Disk에서 다시 inspect·decode·aggregate invariant·directory seam을 검증한 뒤에만 admitted capability를 발급한다. Registry update와 `Semester Ready` commit은 그 다음 단계다.

Target leaf가 보이지만 final aggregate가 없거나 invalid하면 workspace가 아니라 incomplete/collision이다. Resume·discard는 matching app-data transaction, root ownership evidence, expected workspace ID·input digest와 known app-created tree가 모두 맞을 때만 허용한다. Discard는 known app-owned file을 identity·no-follow 재검증 뒤 개별 unlink하고 known directory와 exact leaf는 `rmdir`에 해당하는 empty-only semantics로만 제거한다. Recursive tree delete는 금지하며, 검사 뒤 추가된 user entry는 empty-only removal을 실패시켜 bytes를 보존한다. 하나라도 불명확하거나 unknown user entry가 있으면 exact leaf도 삭제하지 않는다. Committed workspace reopen은 app-data transaction이나 ownership marker 없이 v3 aggregate와 required controlled directory roots·types를 fresh validation해 성립한다. Committed workspace와 broad parent deletion은 이 Module Interface에 두지 않는다.

## Current v2와 migration

- Public admission은 current v2 directory를 normalized `SemesterWorkspace`나 `ImportSource`로 자동 분류하지 않는다. `legacy_migration_required/readOnly`로 표시하고 store·source bytes를 그대로 둔다.
- First preview의 supported v2 migration set은 비어 있다. V2에 sidecar를 추가하거나 같은 `formatVersion: 2`의 의미를 바꾸는 compatibility path를 만들지 않는다.
- 후속 concrete migration의 identity transfer·lineage·source retirement algorithm은 이번 ticket에서 정하지 않는다. 새 ID와 reference rewrite를 사용할지, 기존 identity를 승계하면서 source를 durable하게 retired로 만들지 먼저 결정해야 하며 registry pointer만 바꾸면서 두 root에 같은 identity를 남기지 않는다. Source bytes를 자동 삭제·rewrite하지 않는 원칙은 유지한다.
- Decoder-invalid/pre-baseline/future bytes는 migration 후보로 추측하지 않고 incompatible로 보존한다. Generic migration framework는 실제 supported source→target pair보다 먼저 만들지 않는다.

## Downstream input

| Ticket | 이 조사에서 고정한 입력 | 후속 책임 |
| --- | --- | --- |
| [Ticket 010](../tickets/010-resumable-setup-authority.md) | App-owned `inspect`·`apply`, authority-bound plan, schema write 우회 금지 | Browser `SetupJourney`, 최종 확인·approved-only durability, workspace instruction/Skill bundle와 thin repository-only smoke adapter를 결정했다. |
| [Ticket 011](../tickets/011-bootstrap-and-setup-recovery.md) | Opaque workspace ID, v3 aggregate authority/digest, `owned_incomplete`·`admitted` publish boundary | app-data receipt·registry, setup resume/discard, process interruption |
| [Ticket 012](../tickets/012-semester-ready-first-action.md) | Course-free admitted workspace, Browser-safe semester/display projection | Exact onboarding/workbench UI와 copy |

## Formal owner와 문서 파급

- Long-lived authority placement, exclusive new-leaf admission과 v2 no-auto-migration 결정은 [ADR 0014](../../../adr/0014-create-app-owned-normalized-semester-workspaces.md)가 소유한다. 새 ADR이나 glossary term을 만들지 않는다.
- [CONTEXT.md](../../../../CONTEXT.md)의 `SemesterWorkspace`는 `학년`을 학생이 선택한 학년 단계로 명확히 했고, `WorkspaceManifest`, `ImportSource`, `Semester Ready`, `Course` 경계는 그대로 유지한다. Scaffold·inspection·registry는 도메인 noun이 아니므로 추가하지 않는다.
- Runtime layout은 [Codex Runtime 격리](../../../architecture/codex-runtime-isolation.md)가 logical single-aggregate mapping만 소비한다. Current codec·path는 구현 전까지 [Server README](../../../../apps/server/README.md)가 계속 소유한다.
- Exact field roster, bytes, reason enum, journal, filesystem primitive와 tests는 resulting implementation spec이 고정하고 구현 뒤 package code·README로 이관한다.
