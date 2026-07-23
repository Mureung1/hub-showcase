# Reviewed clean snapshot으로 public repository를 시작한다

분류: 활성

성숙도: 채택

관련 결정: [ADR 0009 — macOS-first local web app 제품 경로를 사용한다](0009-use-a-macos-first-local-web-app-product-path.md), [ADR 0014 — SemesterWorkspace를 app-owned normalized scaffold로 생성한다](0014-create-app-owned-normalized-semester-workspaces.md), [ADR 0016 — Exact npx launcher와 verified Runtime release로 첫 public preview를 배포한다](0016-distribute-public-preview-with-an-exact-npx-launcher-and-verified-runtime-release.md)

## 맥락

현재 AY-PLE source는 private camp `hub`의 participant branch에서 개발한다. 이 lineage에는 camp bootstrap과 workflow, 내부 planning artifact, 삭제된 prototype·generated surface, 개인 author metadata와 public product에 필요하지 않은 Git object가 함께 있다. History 전체 공개는 검토 범위를 과거 모든 byte와 metadata로 넓히고, 급하게 filtered history를 만들면 hash·merge·author rewrite와 삭제 이력 검증을 새 release 위험으로 만든다. 동시에 first public preview는 source·npm·Runtime별 third-party redistribution evidence, 명확한 first-party license와 사용자가 확인할 trust surface가 필요하다.

## 결정

### Lineage와 export authority

- 새 independent public repository는 `AY-PLE`이며 existing `hub` Git history를 push·mirror·filter하지 않는다. Exact hosting account와 remote URL은 repository 생성 작업에서 검증한다.
- Public `main`은 fixed `hub` integration SHA의 commit tree에서 reviewed positive allowlist로 만든 clean root commit으로 시작한다. Worktree copy, untracked·ignored state와 `git push --mirror`는 export input이 아니다.
- Source SHA, exporter·allowlist revision, exported path·mode·digest와 resulting public tree를 provenance manifest로 연결한다. Unknown path, symlink escape, secret·privacy scan 실패와 license·NOTICE·SBOM·provenance gate 실패는 publication을 차단한다.
- RC는 local/private evidence로만 두고 같은 input의 deterministic export와 release gate를 반복 검증한다. 모든 gate를 통과한 final snapshot만 public history에 게시하며 published commit·tag를 force-push하거나 다른 bytes에 재사용하지 않는다.
- Positive allowlist는 release 대상 product source·tests·fixtures, 필요한 build·test·release surface, brand asset·provenance, curated public Docs·adopted ADR와 public-owned legal·trust·GitHub surface로 제한한다. Camp `AGENTS.md`·`.agents/**`·camp `.github/**`·artifact·internal planning·gitlink·clone-local state는 default deny한다.

### Canonical source 전환

- Demo Day와 최종 camp submission이 끝날 때까지 private `hub`가 유일한 development canonical이다. 그동안 public repository는 fixed `hub` SHA에서 생성한 derived release source이며 직접 수정하거나 외부 code PR을 merge하지 않는다.
- Camp submission 완료 뒤 source/public commit mapping을 기록하고 `AY-PLE/main`으로 development authority를 한 번만 cutover한다. 그 뒤 public repository가 유일한 product canonical이며 dual-write와 `hub → AY-PLE` sync를 금지한다. Camp archive에 꼭 필요한 변경만 public commit에서 `hub`로 단방향 반입한다.
- 이 ADR은 adopted target을 정하며 현재 `hub`의 branch·remote·`/camp-pr` 운영 규칙을 cutover 전에 바꾸지 않는다.

### First-party license와 public trust

- 하성욱 개인이 소유한 AY-PLE first-party source·문서와 first-party brand image를 `Apache-2.0`으로 공개한다. Root `LICENSE`는 official text를 변경하지 않고 `NOTICE`의 licensor string은 `Copyright 2026 하성욱`으로 둔다. Apache-2.0 Section 6에 따라 name·logo의 trademark·endorsement 권한은 부여하지 않는다.
- `assets/brand/ay-ple-logo.png`, `ay-ple-mark.png`, `ay-profile.png`는 사용자가 `imagegen` Skill에서 `gpt-image-2`에 text-only prompt를 전달해 만들었고 제3자 image·logo·character input을 사용하지 않았다는 provenance를 함께 공개한다. OpenAI와 사용자 사이의 Output ownership은 적용 법률과 제3자 권리 검토를 대체하지 않는다.
- Third-party source·binary·bundle은 root license로 재허가하지 않는다. Component별 original license·NOTICE·modification·source availability와 canonical roster를 보존하며 [Third-party 재배포 evidence gate](../wayfinding/public-npx-first-release/assets/third-party-redistribution-evidence.md)를 통과하지 못한 material은 제외한다.
- Public root에는 product 중심 `README.md`와 Docs entrypoint, `LICENSE`, `NOTICE`, generated `THIRD_PARTY_NOTICES.md`·original license tree·SBOM·provenance, `SECURITY.md`, `CONTRIBUTING.md`, `PRIVACY.md`와 brand provenance를 둔다. `CODE_OF_CONDUCT.md`와 별도 `SUPPORT.md`는 실제 community 운영 전까지 요구하지 않는다.
- Public Docs는 한국어를 정본으로 하고 README 상단에 짧은 English summary를 제공한다. Official legal text는 English 원문을 유지한다.

### Contribution, security와 privacy truth

- Canonical cutover 전에는 issue·feedback·private security report만 받는다. Cutover 뒤 project contribution policy는 external contribution을 Apache-2.0으로 받고 official Developer Certificate of Origin 1.1 `Signed-off-by`를 요구하며, first preview에는 CLA를 두지 않는다.
- GitHub Private Vulnerability Reporting을 confidential report channel로 사용한다. 일반 bug만 public issue로 받고 personal email은 공개하지 않으며 latest preview version을 best-effort로 지원하고 response-time SLA를 약속하지 않는다.
- First preview는 AY-PLE-owned analytics·telemetry·crash upload와 cloud backend를 두지 않는다. Workspace와 app state는 local에 저장하지만 OAuth와 Codex 실행 중 대화, Agent가 읽은 workspace content와 tool result가 OpenAI로 전송될 수 있고 install·update는 npm registry와 GitHub Releases에 연결된다. 따라서 `local-first`라고 설명하되 `offline app`으로 주장하지 않는다.

## 검토한 선택지

| 선택지 | 판정 | 이유 |
| --- | --- | --- |
| Existing `hub` history 전체 공개 | 거절 | Camp lineage·과거 byte·author metadata까지 검토·공개하며 current product보다 훨씬 큰 history security surface를 만든다. |
| Filtered history로 일부 blame 보존 | 거절 | 모든 hash와 merge를 rewrite하고 deleted content·author·message를 별도로 검증해야 해 first release의 위험과 비용이 이익보다 크다. |
| Reviewed allowlist의 clean snapshot | 채택 | Granular history를 포기하는 대신 public byte와 provenance를 fixed source SHA에 bounded하고 fail-closed export를 만들 수 있다. |
| Public repository를 즉시 canonical로 전환 | 거절 | Camp submission이 끝나기 전에 public→hub 반입과 두 운영 규칙을 동시에 요구한다. |
| 두 repository를 함께 수정 | 거절 | Lockfile, generated legal material, release manifest와 source authority가 갈라질 수 있다. |

## 결과

첫 public repository 생성은 단순 `git push`가 아니라 deterministic source export와 legal·privacy·security release gate다. 구현 spec은 positive allowlist와 manifest schema, scan·reconcile·publication automation을 정해야 하지만 이 ADR의 exclusion과 fail-closed authority를 완화할 수 없다. Repository 생성·visibility 변경·npm publish·Release publication은 이 결정을 구현하는 별도 작업이며 아직 수행되지 않았다.

공식 근거는 [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0), [OpenAI Terms of Use](https://openai.com/policies/terms-of-use/), [GitHub Private Vulnerability Reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository)과 [Developer Certificate of Origin 1.1](https://www.eclipse.org/legal/dco/)을 따른다. 이 ADR은 engineering release policy이며 개별 법률 자문을 대신하지 않는다.
