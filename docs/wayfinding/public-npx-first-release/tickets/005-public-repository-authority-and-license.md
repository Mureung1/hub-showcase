# 005 — Public repository authority와 license를 확정한다

## Wayfinder ticket

- Type: grilling
- State: resolved
- Blocked by: [Third-party 재배포 evidence와 release notice gate를 확정한다](003a-third-party-redistribution-evidence.md)

## Question

새 public `AY-PLE` repository를 기존 `hub` history 보존, history 정제 또는 reviewed allowlist의 clean initial snapshot 중 어떤 lineage·export strategy로 시작하고, Demo Day 전 `hub`와 public repository 중 어느 쪽을 canonical source로 둘 것인가? AY-PLE first-party code의 root license·copyright owner, third-party `LICENSE`·`NOTICE` 보존, public README·Docs entrypoint·SECURITY·CONTRIBUTING 최소 표면, release candidate·final export와 Demo Day 뒤 canonical cutover·역방향 sync 경계를 어디에 둘 것인가?

## Answer

다음으로 확정했다. 장기 formal owner는 [ADR 0015 — Reviewed clean snapshot으로 public repository를 시작한다](../../../adr/0015-bootstrap-public-repository-from-reviewed-clean-snapshot.md)다.

### 확정한 결정

- 새 public `AY-PLE` repository는 existing `hub` history를 보존하거나 rewrite하지 않고, fixed `hub` source SHA의 reviewed positive allowlist에서 만든 clean initial snapshot으로 시작한다.
- Export는 worktree copy나 `git push --mirror`가 아니라 commit tree만 입력으로 사용한다. Source SHA, allowlist·exporter revision, exported path·mode·digest와 resulting public tree를 provenance manifest로 연결한다.
- Camp bootstrap·`.agents/**`·camp `.github/**`·camp artifact·internal planning history·unreviewed gitlink와 allowlist 밖 asset은 default deny한다. Unknown path, untracked·ignored state, symlink escape, secret·privacy scan과 license gate 실패는 export를 차단한다. 사용자 provenance가 확인된 세 brand image만 아래 license 경계로 include할 수 있다.
- Clean snapshot이 granular blame과 commit history를 보존하지 않는 trade-off를 수용한다. 이 선택은 first-party ownership이나 third-party redistribution 의무를 없애지 않는다.
- Demo Day와 최종 camp submission이 끝날 때까지 private `hub`를 유일한 development canonical로 유지한다. Public `AY-PLE` repository의 RC와 final source는 fixed `hub` SHA에서 생성한 immutable derived export이며 public tree를 직접 수정하지 않는다.
- Camp submission 완료 뒤 exact source/public commit mapping을 기록하고 `AY-PLE/main`으로 development authority를 한 번만 cutover한다. 그 뒤 public repository가 유일한 product canonical이며 dual-write와 `hub → AY-PLE` 역동기화를 금지한다. 꼭 필요한 camp archival 반영은 public commit에서 `hub`로만 가져오고 public 쪽으로 다시 수입하지 않는다.
- AY-PLE first-party 코드와 문서의 copyright owner는 개인 하성욱이다. Camp·학교·회사에 저작권을 양도했거나 공동 소유해야 하는 별도 계약은 없다는 사용자 확인을 release legal input으로 기록한다. Git author metadata 자체를 ownership 증명으로 간주하지 않으며 third-party와 별도 provenance 확인 전 brand material에는 이 판정을 자동 확장하지 않는다.
- AY-PLE first-party source와 문서는 `Apache-2.0`으로 공개한다. Root `LICENSE`에는 공식 원문을 변경 없이 두고 `NOTICE`에 exact licensor string `Copyright 2026 하성욱`과 실제 필요한 attribution만 기록한다. GitHub handle·email은 copyright notice에 넣지 않는다. Third-party material은 root license로 재허가하지 않고 component별 원문·NOTICE·provenance를 보존한다.
- `assets/brand/ay-ple-logo.png`, `ay-ple-mark.png`, `ay-profile.png`는 사용자가 `imagegen` Skill을 통해 `gpt-image-2`에 text-only prompt를 전달해 생성했다. 제3자 이미지·logo·character input은 없었고 Output 권리는 사용자에게 있다는 확인을 provenance input으로 기록한다. OpenAI Terms의 user–OpenAI 간 Output ownership은 적용 법률과 제3자 권리 검토를 대체하지 않으므로, 생성 주체·model·source commit·input 권리 확인과 별도 brand license·trademark 경계를 public asset provenance에 명시한다.
- 세 first-party brand image도 `Apache-2.0` 저작권 라이선스에 포함해 source build·fork·npm 재배포에 별도 custom asset exception을 요구하지 않는다. Apache-2.0 Section 6에 따라 AY-PLE name·logo를 trademark나 endorsement로 사용할 권리는 부여하지 않으며 first preview에 별도 proprietary asset license를 만들지 않는다.
- Canonical cutover 전 public repository는 issue·feedback·private security report만 받고 외부 code PR을 merge하지 않는다. Cutover 뒤에는 project contribution policy에 따라 external contribution을 Apache-2.0으로 받고, contributor는 변경마다 official Developer Certificate of Origin 1.1의 `Signed-off-by`로 제출 권한을 확인한다. First preview에는 별도 CLA를 도입하지 않는다.
- Public source root의 minimum trust surface는 product 중심 `README.md`와 public Docs entrypoint, `LICENSE`, `NOTICE`, generated `THIRD_PARTY_NOTICES.md`·original license tree·SBOM·provenance, `SECURITY.md`, phased contribution·DCO를 담은 `CONTRIBUTING.md`, local storage·OAuth 격리·provider 전송·telemetry truth를 밝히는 `PRIVACY.md`, brand asset provenance다. `CODE_OF_CONDUCT.md`와 별도 `SUPPORT.md`는 실제 community 운영 전까지 제외한다.
- First preview는 AY-PLE-owned analytics·telemetry·crash upload와 cloud backend를 두지 않는다. `SemesterWorkspace`와 app state는 local에 저장하지만 OAuth와 Codex 실행 중 대화, Agent가 읽은 workspace content와 tool result는 OpenAI로 전송될 수 있고 설치·update는 npm registry와 GitHub Releases에 연결된다. 따라서 `local-first`라고 설명하되 `offline app`이나 외부 전송 없음으로 표현하지 않는다.
- Public repository에서 GitHub Private Vulnerability Reporting을 활성화하고 이를 `SECURITY.md`의 단일 confidential report channel로 사용한다. 일반 bug만 public issue로 받고 personal email은 공개하지 않는다. Security support 범위는 latest preview version으로 한정하며 response-time SLA를 약속하지 않는다.
- RC export는 public history에 게시하지 않고 fixed `hub` integration SHA에서 local/private evidence로 생성한다. Commit tree와 positive allowlist만 입력으로 두 번 export해 tree·manifest identity를 확인하고 secret·privacy, license·NOTICE·SBOM·provenance, build·test gate를 통과시킨다. 실패하면 public tree를 직접 patch하지 않고 `hub`에서 수정한 새 SHA로 전체 export를 다시 만든다.
- 모든 gate를 통과한 final snapshot만 public `AY-PLE/main`의 clean root commit으로 게시한다. Source SHA, exporter·allowlist digest, exported path·mode·digest와 resulting public tree mapping을 보존하며 published commit·tag는 force-push하거나 다른 bytes에 재사용하지 않는다.
- Positive allowlist는 `apps/**`, `packages/**`의 release 대상 product source·tests·fixtures, 필요한 build·test·release script와 root package file, brand assets·provenance, public root·Docs entrypoint·`CONTEXT.md`, 선별한 product·architecture docs와 adopted ADR, 새 public 전용 `.github`·legal·trust material로 제한한다. Third-party source는 `REDIST-*` gate를 통과한 exact path만 포함한다.
- Current camp `AGENTS.md`, `.agents/**`, `skills-lock.json`, camp `.github/**`, `artifacts/**`, `references/openai-codex` gitlink, Wayfinding·implementation ticket/spec·agent 운영·archive/spike·internal backlog와 clone-local state는 default deny한다. 필요한 public contributor guidance와 workflow는 camp file을 copy하지 않고 public-owned file로 별도 작성한다.
- Public `README.md`와 Docs는 한국어를 정본으로 두고 README 상단에 짧은 English product summary만 제공한다. 설치·지원 환경·privacy·contribution의 전체 영어 번역을 first release 조건으로 두지 않으며 `LICENSE`와 DCO 같은 표준 legal text는 official English 원문을 유지한다.

### 근거

- 조사 기준 `hub` SHA `1e8e147ec`은 camp bootstrap에서 이어진 645개 commit과 당시 tree보다 넓은 deleted·historical surface를 가진다. Root package는 `private: true`이고 first-party `LICENSE`, `NOTICE`, `SECURITY.md`, `CONTRIBUTING.md`가 없으며 current camp `.github` workflow는 public product repository 운영에 맞지 않는다.
- Current tree의 `.agents/**`, camp artifact·workflow, `references/openai-codex` gitlink와 ignored Runtime·OAuth state를 plain archive·worktree copy로 안전하게 분리할 repository-owned exporter가 아직 없다. Full·filtered history보다 fixed commit tree의 positive allowlist가 review boundary를 가장 작게 만든다.
- Third-party material의 artifact별 notice·source·SBOM·provenance 의무와 `REDIST-01`부터 `REDIST-12`까지의 fail-closed checklist는 [Third-party 재배포 evidence와 release notice gate](../assets/third-party-redistribution-evidence.md)가 소유한다.
- Root license와 trust 결정의 공식 근거는 [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0), [OpenAI Terms of Use](https://openai.com/policies/terms-of-use/), [GitHub Private Vulnerability Reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository)과 [Developer Certificate of Origin 1.1](https://www.eclipse.org/legal/dco/)이다.
- `CONTEXT.md`는 제품 domain glossary이므로 repository lineage·export·license 운영 용어를 추가하지 않는다.
