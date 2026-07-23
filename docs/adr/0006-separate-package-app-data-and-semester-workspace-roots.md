# 제품 실행에서 패키지, 앱 데이터, 학기 작업공간의 루트를 분리한다

분류: 활성

성숙도: 채택

부분 대체·보완됨: [ADR 0014 — SemesterWorkspace를 app-owned normalized scaffold로 생성한다](0014-create-app-owned-normalized-semester-workspaces.md)가 사용자가 고른 기존 폴더를 `workspaceRoot`로 직접 채택하는 admission·identity 의미를 대체한다. [ADR 0016 — Exact npx application과 verified Runtime release를 분리한다](0016-distribute-public-preview-with-an-exact-npx-launcher-and-verified-runtime-release.md)는 public release에서 `packageRoot`가 Runtime binding을, `appDataRoot`가 verified Runtime generation을 소유하도록 구체화한다. [ADR 0017 — Codex-managed Browser OAuth를 사용한다](0017-use-codex-managed-browser-oauth-for-product-account-lifecycle.md)는 `appDataRoot`의 account·credential 수명과 pre-workspace Runtime transition을 구체화한다. 이 ADR의 세 root 분리와 수명·복구 책임은 유지한다.

Codex runtime 상태와 제품 실행 상태는 수명과 복구 책임이 다르다. 설치 artifact, 기기별 native state, 사용자 소유 학기 자료의 수명과 백업 정책도 서로 다르므로 하나의 root나 호출 당시의 `process.cwd()`에 묶지 않는다.

## 결정

| Root | 소유하는 것 | 소유하지 않는 것 |
| --- | --- | --- |
| `packageRoot` | AY-PLE 코드와 versioned application resource. Public target에서는 exact Runtime descriptor·canonical manifest | 사용자 상태와 학기 자료 |
| `appDataRoot` | 하나의 app-managed `CODEX_HOME`·`CODEX_SQLITE_HOME` pair, verified immutable Runtime generation·기기별 runtime 연결 정보와 workspace registry | 확인된 학업 사실과 사용자 원본 |
| `workspaceRoot` | 사용자가 고른 위치에 AY-PLE이 생성하고 `WorkspaceManifest`로 식별하는 `SemesterWorkspace`, 반입된 RawMaterial과 확인된 AY-PLE 학기 상태, Codex 작업 `cwd` | 외부 `ImportSource`, 인증, Codex native session·log·memory 상태 |

- 하나의 제품 경로 배치 seam이 세 root와 그 불변 조건을 검증한다. `CODEX_HOME`과 `CODEX_SQLITE_HOME`은 분리할 수 없는 pair로 주입하고, `workspaceRoot`는 사용자가 명시한 위치에 앱이 생성·검증한 root로 정한다.
- 호출 당시의 `process.cwd()`를 암묵적인 제품 workspace로 사용하지 않는다. 환경 변수는 경로 모델을 대신하지 않고 명시적인 재정의 수단으로만 사용한다.
- `appDataRoot`를 잃어도 사용자가 소유한 자료와 확인된 제품 상태는 `workspaceRoot`에서 다시 열 수 있어야 한다. Codex thread와 session은 학기·과목·ModelingRun의 정체성이 아니다.
- 이 결정은 과거 Runtime Harness의 저장 경로나 local residue를 제품 layout으로 이전하거나 재배치하도록 요구하지 않는다. [ADR 0012](0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md)의 별도 cleanup도 Chat state migration이나 recovery copy를 만들지 않는다.

## 결과

첫 제품 layout seam은 `packageRoot`, `appDataRoot`, `workspaceRoot` 소유권에 맞춰 runtime bundle, workspace와 controlled directory를 계산하고 legacy env나 `process.cwd()`로 fallback하지 않아야 한다. 운영체제별 기본 경로, override·migration, packaged entrypoint와 여러 학기 사이의 runtime-home 수명 정책은 이 불변 조건 뒤에서 결정한다.

Current development composition이 verified Runtime byte를 package-local ignored artifact로 materialize하는 것은 현재 구현이다. Public target에서는 `packageRoot`의 embedded exact descriptor가 canonical manifest와 `appDataRoot`의 verified immutable Runtime generation을 pin하며, package root가 public Runtime payload 저장소가 되지 않는다.

[ADR 0004](0004-split-runtime-history-semantics-from-workspace-storage.md)의 Runtime Diagnostic History는 완료·역사 기록이며 현재 제품 layout의 일부가 아니다. 현재 구현, 채택한 제품 목표와 후속 기술 항목은 [Codex Runtime 격리](../architecture/codex-runtime-isolation.md)가 구분해 관리하고, 작업 순서는 [개발 백로그](../product/ay-ple-development-backlog.md)가 소유한다.
