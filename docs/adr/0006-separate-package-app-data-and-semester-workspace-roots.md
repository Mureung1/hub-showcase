# 제품 실행에서 패키지, 앱 데이터, 학기 작업공간의 루트를 분리한다

분류: 활성

성숙도: 채택

부분 대체·보완됨: [ADR 0018 — 사용자가 선택한 Git working tree를 SemesterWorkspace로 채택한다](0018-adopt-user-owned-git-semester-workspaces.md)가 canonical personal layout, `workspaceRoot`의 adoption과 user-owned file 의미를 소유한다. [ADR 0014](0014-create-app-owned-normalized-semester-workspaces.md), [ADR 0016](0016-distribute-public-preview-with-an-exact-npx-launcher-and-verified-runtime-release.md)과 [ADR 0017](0017-use-codex-managed-browser-oauth-for-product-account-lifecycle.md)은 중단한 app-owned scaffold·public release·managed account 경로의 역사 기록이다. Exact current 구현과 residue는 [Codex Runtime 격리](../architecture/codex-runtime-isolation.md)가 소유한다. 이 ADR의 세 root 분리와 수명·복구 책임은 유지한다.

Codex runtime 상태와 제품 실행 상태는 수명과 복구 책임이 다르다. 설치 artifact, 기기별 native state, 사용자 소유 학기 자료의 수명과 백업 정책도 서로 다르므로 하나의 root나 호출 당시의 `process.cwd()`에 묶지 않는다.

## 결정

| Root | 소유하는 것 | 소유하지 않는 것 |
| --- | --- | --- |
| `packageRoot` | `hub/`의 tracked AY-PLE source와 built-in Skill resource, 재생성 가능한 `node_modules`·`dist` | Runtime payload·cache·temp, 사용자 상태와 학기 자료 |
| `appDataRoot` | Canonical sibling `../.ay-ple/`의 cross-workspace 운영 metadata·config, Runtime payload, cache·temp, `WorkspaceRegistry`와 workspace별 transient `runtime-state.json` | 전역 Codex account·config·session, 학기 identity, workspace 내부 구조·Git history, 확인된 학업 사실과 사용자 원본 |
| `workspaceRoot` | `../workspace/<semester>/`의 사용자 소유 Git working tree인 `SemesterWorkspace`, workspace-local JSON 학기 정보, 실제 학기 자료와 결과, Codex 작업 `cwd` | cross-workspace registry·config, 인증, pending App interaction, Codex native session·log·memory 상태 |

- 하나의 제품 경로 배치 seam이 세 root와 그 불변 조건을 검증한다. Current personal target은 `~/.codex`의 기존 Codex account·config·session authority를 재사용하고 AY-PLE 전용 Codex home을 만들지 않는다. Account 연결은 workspace 선택보다 먼저 완료할 수 있고, `workspaceRoot`는 이후 `../workspace/` 아래에서 사용자가 명시적으로 선택한 Git working tree root로 정한다.
- Built-in Skill은 `packageRoot`의 tracked source에서 직접 읽고 appData에 materialize하지 않는다. Source checkout 실행에 필요한 npm `node_modules`와 `dist`는 package-local rebuildable output으로 허용하되, Python/Codex Runtime payload와 mutable 실행 state는 `appDataRoot`에 둔다.
- 호출 당시의 `process.cwd()`를 암묵적인 제품 workspace로 사용하지 않는다. 환경 변수는 경로 모델을 대신하지 않고 명시적인 재정의 수단으로만 사용한다.
- `appDataRoot`를 잃어도 사용자가 소유한 실제 학기 자료와 결과는 `workspaceRoot`에서 다시 열 수 있어야 한다. Codex Thread와 session은 학기·과목의 정체성이 아니다.
- 과거 Runtime Harness의 저장 경로나 local residue를 새 authority로 채택하거나 통째로 이관하지 않는다. Runtime은 canonical appData에 재생성·검증하고 사용자가 소유한 실제 SemesterWorkspace만 보존한다. Legacy dogfood appData, managed development workspace와 package-local Runtime/cache residue는 새 layout의 end-to-end smoke 뒤 ownership을 검증한 one-shot cleanup으로만 제거한다.

## 결과

Personal product layout seam은 `packageRoot=hub/`, `appDataRoot=../.ay-ple/`, semester parent `../workspace/`, global Codex authority `~/.codex`를 canonicalize하고 서로의 소유권을 섞지 않아야 한다. Legacy env나 `process.cwd()`로 fallback하지 않으며 여러 학기 사이에서는 `WorkspaceRegistry`의 active repository pointer만 전환한다.

Current development composition은 Runtime dependency를 `../.ay-ple/runtime/`, 재현 cache를 `../.ay-ple/cache/`에 두고 source·build output과 실행 payload를 분리한다. 전환 전 package-local Runtime과 별도 dogfood profile command는 제거됐으며 당시 public target의 배치 결정과 구현 근거는 historical ADR 0016이 보존한다.

[ADR 0004](0004-split-runtime-history-semantics-from-workspace-storage.md)의 Runtime Diagnostic History는 완료·역사 기록이며 현재 제품 layout의 일부가 아니다. 현재 구현, 채택한 제품 목표와 후속 기술 항목은 [Codex Runtime 격리](../architecture/codex-runtime-isolation.md)가 구분해 관리하고, 작업 순서는 [개발 백로그](../product/ay-ple-development-backlog.md)가 소유한다.
