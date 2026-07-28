# `@ay-ple/semester-workspace`

`@ay-ple/semester-workspace`는 user-owned Git SemesterWorkspace root의 v4 identity envelope만 소유하는 Node-only Module이다. Git lifecycle, Bootstrap, registry, academic schema와 workspace file mutation은 이 package의 책임이 아니다.

## 현재 경계

| 표면 | 현재 동작 |
| --- | --- |
| V4 identity codec | Root `workspace-state.json`의 exact `kind`, `formatVersion`, `workspaceId`, `semester`, opaque `snapshot`을 `1 MiB` 안에서 strict encode/decode한다. |
| Shared validators | `workspace_[0-9a-f]{32}` identity, `1..20` year level, bounded term slug·display name을 startup과 registry가 같은 규칙으로 검증한다. |
| Root classification | 유효한 v4는 strict decode하고, version marker가 있는 current-v2·historical v3는 내용을 academic schema로 해석하지 않은 채 역사 상태로 분류한다. Malformed·future·상한 초과 bytes는 `incompatible`이다. 분류는 입력 bytes를 재작성하지 않는다. |
| Opaque snapshot | `snapshot`은 bounded JSON object인지까지만 검사한다. Package는 Course, material, Run, patch, confirmation, event 또는 apply schema를 정의하지 않는다. |

Public export는 v4 codec·classification과 위 shared validator만 제공한다. V3 admission·setup journey/store, bundle materializer/verifier, context guard, current-v2 decoder, test-only parity subpath와 package-managed workspace resource tree는 제거됐으며 alias·deprecated export·fallback이 없다.

기존 current-v2, historical v3, malformed와 future 파일은 자동 이관·삭제 대상이 아니다. Canonical Server startup은 strict v4만 열고 지원하지 않는 bytes를 `incompatible` prepared root로 보존한다. Pre-App Bootstrap과 AY가 workspace file·Git authority를 소유한다.

## 검증

Repository root에서 다음 명령을 사용한다.

```bash
npm test -w @ay-ple/semester-workspace
npm run typecheck -w @ay-ple/semester-workspace
npm run build -w @ay-ple/semester-workspace
```

Suite는 exact v4 envelope와 identity bound, opaque JSON snapshot, public export roster, legacy marker classification과 valid v4·legacy·malformed·future file의 byte-for-byte non-mutation을 검증한다.
