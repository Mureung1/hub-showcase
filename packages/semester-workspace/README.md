# `@ay-ple/semester-workspace`

`@ay-ple/semester-workspace`는 app-owned v3 `SemesterWorkspace`의 strict codec과 filesystem admission을 소유하는 Node-only Module이다. 현재 구현은 fresh workspace의 admission/recovery와 current v2 compatibility decoder까지 닫았으며, workspace instruction/Skill bundle, durable setup envelope와 `Semester Ready` 조합은 아직 구현하지 않는다.

## 현재 경계

| 표면 | 현재 동작 |
| --- | --- |
| V3 codec | Exact top-level·`manifest`·`semester`·`state` shape, positive safe integer `yearLevel`, bounded custom-capable term, opaque workspace ID와 empty initial state를 strict encode/decode한다. |
| `inspect(intent)` | Existing canonical parent 아래 nonexistent one-segment leaf만 write 없이 `new_target` plan으로 만든다. Existing directory, symlink, current v2, malformed/future state와 unavailable authority를 no-write outcome으로 분류한다. |
| `describe(plan)` | 같은 admission instance가 발급한 exact create plan에만 Server-private `WorkspaceAdmissionPlanDescription`을 반환한다. `setupPlanId`는 random opaque `plan.planId` 그대로이고, canonical receipt-plan digest와 target/workspace binding은 Browser contract가 아니다. Unknown·tampered·resume plan은 `null`이다. |
| `apply(plan)` | Parent authority를 fresh 확인하고 final leaf를 exclusive reserve한 뒤 `.ay-ple/`, `inbox/`, `courses/`와 initial v3 aggregate를 no-clobber publish한다. File·directory sync와 fresh strict readback을 통과한 경우에만 admitted handle을 반환한다. |
| Recovery | Private HMAC marker와 exact scaffold/aggregate identity가 일치하는 `owned_incomplete`만 resume한다. Unknown entry, unexpected link/type, modified byte와 authority drift는 보존한 collision/conflict로 닫는다. |
| Current v2 | Package root의 `decodeCurrentSemesterWorkspaceV2`가 current v2 structural/invariant validation의 shared decoder다. Valid serialization은 rewrite 없이 legacy read-only outcome이며 malformed/future bytes는 incompatible read-only outcome이다. |

Admission marker에는 raw `setupPlanId`나 `setupId`를 기록하지 않는다. Opaque plan token은 marker의 `setupPlanBinding` HMAC key로만 사용하며 `authorityDigest`, marker/scaffold/aggregate digest와 absolute target authority는 Server-private이다. `describe()`도 `setupId`를 만들지 않는다. Durable transaction ID 발급과 Browser-safe projection은 후속 setup Module의 책임이다.

`./testing/legacy-v2-parity-vectors`는 package-owned fixed current-v2 compatibility roster를 제공하는 test-only subpath다. Package decoder와 Server open regression이 같은 426개 expected outcome을 소비하므로 Server source를 package test oracle로 역수입하지 않는다.

`resources/workspace/.spine-s0-placeholder.json`은 canonical resource root를 Git에 고정하기 위한 `releaseResource: false` marker다. 실제 bundle byte가 아니며 actual bundle entry를 추가하기 전에 제거해야 한다. 따라서 현재 admission 성공은 bundle, durable setup transaction, Runtime transition 또는 `Semester Ready`를 뜻하지 않는다.

## 검증

Repository root에서 다음 명령을 사용한다.

```bash
npm test -w @ay-ple/semester-workspace
npm run typecheck -w @ay-ple/semester-workspace
npm run build -w @ay-ple/semester-workspace
```

Unit·filesystem suite는 v3 conformance, write-free inspection, exclusive create, no-clobber publish, private plan binding, current-v2 preservation, cross-instance recovery와 durability fault boundary를 검증한다.
