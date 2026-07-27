# `@ay-ple/semester-workspace`

`@ay-ple/semester-workspace`는 SemesterWorkspace의 versioned codec과 app-owned v3 admission·setup kernel을 소유하는 Node-only Module이다. 현재 public product는 current v2 compatibility decoder만 소비하지만, user-owned Git target을 위한 root v4 identity codec도 current graph 옆의 internal target surface로 제공한다.

## 현재 경계

| 표면 | 현재 동작 |
| --- | --- |
| V4 identity codec | Root `workspace-state.json`의 exact `kind`, `formatVersion`, `workspaceId`, `semester`, opaque `snapshot`을 `1 MiB` 안에서 strict encode/decode한다. Workspace ID, `1..20` year level, term slug·byte bound와 JSON value만 허용하며 current-v2, historical v3, malformed/future bytes를 rewrite 없이 분류한다. |
| V3 codec | Exact top-level·`manifest`·`semester`·`state` shape, positive safe integer `yearLevel`, bounded custom-capable term, opaque workspace ID와 empty initial state를 strict encode/decode한다. |
| `inspect(intent)` | Existing canonical parent 아래 nonexistent one-segment leaf만 write 없이 `new_target` plan으로 만든다. Existing directory, symlink, current v2, malformed/future state와 unavailable authority를 no-write outcome으로 분류한다. |
| `describe(plan)` | 같은 admission instance가 발급한 exact create plan에만 Server-private `WorkspaceAdmissionPlanDescription`을 반환한다. `setupPlanId`는 random opaque `plan.planId` 그대로이고, canonical receipt-plan digest와 target/workspace binding은 Browser contract가 아니다. Unknown·tampered·resume plan은 `null`이다. |
| `apply(plan)` | Parent authority를 fresh 확인하고 final leaf를 exclusive reserve한 뒤 `.ay-ple/`, `inbox/`, `courses/`와 initial v3 aggregate를 no-clobber publish한다. File·directory sync와 fresh strict readback을 통과한 경우에만 admitted handle을 반환한다. |
| Recovery | Private HMAC marker와 exact scaffold/aggregate identity가 일치하는 `owned_incomplete`만 resume한다. Unknown entry, unexpected link/type, modified byte와 authority drift는 보존한 collision/conflict로 닫는다. |
| Current v2 | Package root의 `decodeCurrentSemesterWorkspaceV2`가 current v2 structural/invariant validation의 shared decoder다. Valid serialization은 rewrite 없이 legacy read-only outcome이며 malformed/future bytes는 incompatible read-only outcome이다. |
| Bundle source | `resources/workspace/`의 root `AGENTS.md`와 `.agents/skills/ay-ple-first-assignment/SKILL.md` 두 파일만 canonical complete-tree source다. Root `captureCanonicalWorkspaceBundleSource()`와 host-provided exact package resource를 읽는 `captureWorkspaceBundleSourceAt()`는 같은 mode·byte·roster를 mutation 전에 검증하고 canonical-equivalent immutable snapshot과 descriptor/tree digest를 반환한다. Test-only mutation helpers는 package root에 없다. |
| Bundle materialization | Admitted v3 workspace에 missing file만 absent-only·no-clobber로 설치한다. Missing declared file은 explicit recovery할 수 있지만 modified·extra·symlink·special-mode drift는 bytes를 보존하고 `manual_recovery_required`로 닫는다. |
| Static context | Declared Skill 밖의 `.agents/skills/` sibling, root `AGENTS.override.md`와 workspace-local `.codex/`를 보존하면서 action eligibility를 fail closed한다. |
| Effective native context | `createWorkspaceContextGuard()`는 Runtime이 official App Server에서 읽어 high-level projection한 config·Skill snapshot을 exact workspace bundle과 비교한다. Fixed empty project marker, global instruction 부재와 exact-one managed repo Skill을 요구한다. Official `system` Skill은 Runtime projection에서 제외되므로 `CODEX_HOME/skills/.system` cache는 이 package의 conflict 대상이 아니며, user·admin 또는 추가 repo Skill은 roster mismatch로 차단된다. Server native boundary가 static·effective gate를 조합한다. |
| Durable setup envelope | `createSetupEnvelopeStore()`는 app-data 아래 single envelope를 strict decode하고 revision token 기반 compare-and-replace로 교체한다. `empty`, `pending` transaction과 exact application/Runtime/bundle에 묶인 `active_ready` pointer를 구분하며 storage recovery도 같은 authority를 사용한다. |
| `SetupJourney` | `prepare`는 write-free confirmation만 만든다. 같은 journey의 draft command는 호출 순서대로 직렬화되므로 `return_to_input`이 먼저면 write 없이 draft를 무효화하고, matching `approve`가 먼저면 첫 durable read·effect 전에 해당 draft를 approval-attempted로 claim한다. Approval은 complete approved receipt를 먼저 commit한 뒤 admission·bundle·static-context 검증을 거쳐 prepared receipt로 수렴한다. 한번 approval attempt가 시작된 draft는 response loss나 pre-commit read failure 뒤에도 `return_to_input`으로 지울 수 없다. Durable receipt가 생긴 경우 retry/relaunch가 같은 receipt를 재조정하고, pre-commit read failure는 claimed draft의 explicit `approve` retry로만 다시 진행한다. Fault/relaunch는 admitted/prepared workspace bytes를 자동 삭제하지 않는다. |
| Lease-bound Ready | `createLeaseBoundSemesterSetupJourney()`는 prepared 또는 same-release active Ready를 injected `SemesterReadyTransitionPort`에 넘긴다. Port callback 안에서만 fresh aggregate·bundle·static context를 다시 확인해 `active_ready`를 atomic commit하고 strict readback한다. Account/native Runtime lease 자체는 Server 소유다. |

Admission marker에는 raw `setupPlanId`나 `setupId`를 기록하지 않는다. Opaque plan token은 marker의 `setupPlanBinding` HMAC key로만 사용하며 `authorityDigest`, marker/scaffold/aggregate digest와 absolute target authority는 Server-private이다. `describe()`도 `setupId`를 만들지 않는다. Durable transaction ID는 `SetupJourney`가 app-data envelope에만 기록하며 Browser-safe projection은 Server의 책임이다.

`./testing/legacy-v2-parity-vectors`는 package-owned fixed current-v2 compatibility roster를 제공하는 test-only subpath다. Package decoder와 Server open regression이 같은 426개 expected outcome을 소비하므로 Server source를 package test oracle로 역수입하지 않는다.

Canonical resource root에는 위 두 managed file만 있다. Bundle 설치나 App-side prepared 검증만으로 `Semester Ready`, Course·자료 또는 academic action availability를 뜻하지 않는다. Public-preview Server·Browser composition과 C1 integration 경로는 제거했다. Current Server는 current-v2 decoder·parity만 소비하며, v3 admission·setup은 executable consumer가 없는 package kernel이므로 현재 제품 capability가 아니다.

## 검증

Repository root에서 다음 명령을 사용한다.

```bash
npm test -w @ay-ple/semester-workspace
npm run typecheck -w @ay-ple/semester-workspace
npm run build -w @ay-ple/semester-workspace
```

Unit·filesystem suite는 v4 identity·opaque snapshot과 legacy no-rewrite classification, v3 conformance, write-free inspection, exclusive create, no-clobber publish, private plan binding, current-v2 preservation, cross-instance recovery, durable setup/Ready commit 전후 실제 process death, same-release relaunch, bundle complete-tree/source drift·missing-only recovery·static context conflict와 high-level native config·Skill snapshot guard를 검증한다.
