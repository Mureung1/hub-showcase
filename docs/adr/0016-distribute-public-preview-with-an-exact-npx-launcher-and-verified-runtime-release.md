# 첫 public preview를 exact npx launcher와 verified Runtime release로 배포한다

분류: 활성

성숙도: 채택

관련 결정: [ADR 0006 — package·app data·SemesterWorkspace root를 분리한다](0006-separate-package-app-data-and-semester-workspace-roots.md), [ADR 0009 — macOS-first local web app 제품 경로를 사용한다](0009-use-a-macos-first-local-web-app-product-path.md), [ADR 0011 — Official Codex Python SDK를 재사용한다](0011-reuse-official-codex-python-sdk-for-chat-shell.md), [ADR 0014 — SemesterWorkspace를 app-owned normalized scaffold로 생성한다](0014-create-app-owned-normalized-semester-workspaces.md), [ADR 0015 — Reviewed clean snapshot으로 public repository를 시작한다](0015-bootstrap-public-repository-from-reviewed-clean-snapshot.md)

## 맥락

첫 public preview는 signed·notarized Desktop App 없이도 repository checkout, system Python과 consumer build에 의존하지 않는 재현 가능한 제품 진입점이 필요하다. 현재 package-local Runtime bundle은 local development와 검증에는 적합하지만 public npm package에 큰 Python·native payload를 직접 넣거나 install hook에서 내려받으면 package 설치와 Runtime mutation의 권한·실패·무결성 경계가 섞인다. 반대로 moving tag나 remote catalog가 시작할 때 Runtime을 고르면 동일한 app version이 다른 실행 byte를 선택할 수 있다.

## 결정

### Public application과 Runtime을 분리한다

- 첫 public 명령은 Node와 npm을 명시적 prerequisite로 둔 exact `npx ay-ple@<release-version>`이다. Public `ay-ple` package와 bin 하나가 prebuilt Server·Browser UI를 foreground local host 하나로 실행한다. `.app`·`.dmg`, zero-prerequisite installer와 background updater는 첫 public 경로가 아니다.
- npm package는 application code, prebuilt UI, dedicated product-resource subtree의 workspace instruction/Skill bundle과 `AGENTS.md`·built-in Skill root별 exact complete-tree roster·digest descriptor, exact Runtime descriptor·canonical manifest를 담는 thin application artifact다. Ambient source-repository root의 `AGENTS.md`·`.agents/`는 product resource가 아니다. Python·native Runtime byte는 별도의 immutable GitHub Release asset으로 배포한다. Public 실행은 repository checkout, system Python, consumer source build와 npm install lifecycle hook에 의존하지 않는다.
- Production host는 workspace mutation 전에 package-root containment, descriptor-declared regular file·no-symlink roster와 digest를 complete-tree 검증한다. Missing·corrupt bundle resource는 setup을 시작하지 않고, verified package·bundle identity를 approved setup transaction에 bind한다.
- [ADR 0009](0009-use-a-macos-first-local-web-app-product-path.md)의 macOS-first local companion·browser UI 경계와 [ADR 0011](0011-reuse-official-codex-python-sdk-for-chat-shell.md)의 official SDK·supervised Runtime graph는 유지한다. 이 ADR은 그 앞의 public application↔Runtime distribution authority만 소유한다.

### Exact binding과 검증을 한 resolver가 소유한다

- Exact npm package에 포함된 descriptor가 application이 사용할 Runtime의 유일한 selection trust root이며 exact asset과 canonical manifest를 pin한다. Canonical manifest는 선택된 Runtime payload의 identity와 complete tree를 기술·검증한다. GitHub Release metadata·attestation과 external release ledger는 transport·publication evidence이며 startup selection authority가 아니다.
- Single-entry `RuntimeResolver`가 `appDataRoot`, cancellation과 progress reporting을 받아 exact asset의 download·resume, safe extraction, versioned cache, complete-tree·legal roster verification과 손상 cache repair를 캡슐화한다. Host에는 검증된 immutable `runtimeRoot`와 Runtime identity만 반환한다.
- Verified Runtime generation과 보관 archive는 `appDataRoot` 아래에 두고 in-place로 바꾸지 않는다. Resolver는 매 resolve와 spawn 경계에서 exact binding과 complete tree를 fail closed로 확인한다. 상세 descriptor field, cache directory roster, HTTP range matrix, error code와 transaction protocol은 architecture·implementation spec·package code가 소유한다.

### Version과 rollback을 whole-pair로 다룬다

- Application version과 AY-PLE-owned Runtime release ID는 독립적으로 증가할 수 있지만 각 application descriptor는 exact Runtime release와 bytes를 하나로 고정한다. Runtime payload나 manifest byte가 달라지면 새 immutable Runtime release이며 기존 asset·ID를 다른 byte에 재사용하지 않는다.
- Moving `latest`, startup-time remote catalog, SemVer compatibility 추측, silent fallback과 automatic downgrade를 사용하지 않는다. Runtime 문제의 명시적 rollback은 release ledger가 still-supported로 표시한 이전 exact application version을 다시 실행해 그 package가 고정한 whole pair를 선택하는 동작이다. 이전 public pair가 없는 첫 release에는 rollback command를 광고하지 않는다.
- Public source lineage·canonical cutover·first-party license와 trust authority는 [ADR 0015](0015-bootstrap-public-repository-from-reviewed-clean-snapshot.md)가 계속 소유한다. Exact legal file content, third-party redistribution evidence와 publication ordering은 이 결정을 구현하는 release surface에서 검증하며 이 ADR이 그 schema를 복제하지 않는다.

## 검토한 선택지

| 선택지 | 판정 | 이유 |
| --- | --- | --- |
| Signed·notarized `.app`·`.dmg`를 첫 경로로 제공 | 거절 | 유료 Apple distribution credential과 별도 packaging·update surface를 첫 preview의 선행조건으로 만든다. |
| 전체 Runtime을 npm tarball에 포함 | 거절 | 큰 platform payload와 application package의 release·cache 수명을 결합한다. |
| `postinstall` 같은 install hook에서 Runtime download | 거절 | 설치 중 network mutation과 실패를 숨기고 observable consent·recovery 경계를 약화한다. |
| Moving tag·GitHub catalog 또는 system dependency로 Runtime 선택 | 거절 | 동일 application version의 실제 실행 byte와 compatibility authority가 시간·기기별로 달라진다. |
| Exact thin npx application과 immutable verified Runtime release 분리 | 채택 | Application이 exact binding을 소유하면서 Runtime delivery·cache·repair를 한 깊은 module로 격리할 수 있다. |

## 결과

Outer `npx` package resolution과 첫 Runtime install은 network를 요구한다. Exact launcher가 실행된 뒤에는 유효한 generation을 network 없이 재검증·재사용하고, 보관 archive가 있으면 손상 generation을 offline repair할 수 있다. Offline 상태에서 remote yank나 새 security advisory를 알 수 있다고 약속하지 않는다.

Source, npm package, Runtime asset과 Landing command를 잇는 exact mapping evidence가 없거나 partial publication이 발생하면 release를 fail closed로 처리한다. 구체적인 publication ledger·순서와 clean-machine smoke는 release implementation이 닫는다. 다른 OS, Desktop App, notarization과 automatic updater는 필요가 확인될 때 별도 결정으로 연다.

이 ADR은 채택한 public target이다. 현재 repository의 canonical development composition은 package-local ignored Runtime artifact를 검증해 실행하며, public application package·embedded descriptor·GitHub Runtime release·`RuntimeResolver` cache 경로는 아직 구현되지 않았다.
