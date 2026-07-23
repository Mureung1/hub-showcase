# Public source·npm·Runtime publication release gate 연구

작성일: 2026-07-23

상태: Ticket 015의 primary research evidence

## 결론

첫 public preview는 여러 서비스에 걸친 atomic transaction으로 게시할 수 없다. 따라서 **fixed local RC 하나를 immutable identity로 잠그고, 각 외부 write 뒤 authoritative readback이 통과해야만 다음 surface를 여는 재개 가능한 state machine**으로 운영한다.

성공 경로의 승격 순서는 다음과 같다.

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

이 선형 표기는 success path의 promotion order다. `NPM_PUBLISH_CREDENTIAL_RETIRED`는 `NPM_VERSION_VERIFIED`의 성공 successor만이 아니라 GAT가 주입된 모든 terminal outcome이 거치는 orthogonal barrier다. 따라서 S7의 guard는 `S5 green ∧ 모든 injected GAT retired`이고, S5가 실패한 branch는 retirement 뒤 retry 또는 incident로만 수렴하며 S7로 승격하지 않는다.

- `PUBLIC_SOURCE_VERIFIED` 전에는 npm provenance가 가리킬 public source commit이 없고 GitHub Release tag를 고정할 public commit도 없다.
- Runtime asset과 application descriptor sidecar는 **draft에서 모든 asset을 검증한 뒤 immutable release로 publish**한다. GitHub도 이 순서를 권고한다. Published release는 `immutable=true`, release attestation, downloaded asset byte까지 검증한 뒤에만 다음 단계로 간다.
- npm provenance가 source와 build instructions를 정직하게 연결하도록 GitHub-hosted runner가 exact public source commit에서 reviewed generator로 `.tgz`를 다시 만든다. 이 CI output이 G1과 application draft의 reference `.tgz`와 byte-for-byte 같을 때만 **CI가 만든 그 동일 byte**를 `--access public --tag preview --provenance`로 publish한다. 사용자에게 보이는 command는 `npx ay-ple@<exact-version>`, 자동 smoke는 같은 exact package spec에 `--yes`만 더한 `npx --yes ay-ple@<exact-version>`이다. `preview` tag는 package를 숨기지 않으며 exact version은 publish 순간부터 public이다.
- 2026-07-23 authoritative registry readback에서 `ay-ple`은 `E404`였다. npm staged publishing은 이미 존재하는 package만 받고, trusted publishing은 package settings에서 먼저 설정해야 하며 둘 다 현재 npm 10 product lane보다 높은 CLI/Node 요구사항이 있다. 따라서 **첫 package bootstrap은 staged/trusted publishing이 아닌 direct publish**로 하고, public GitHub-hosted Actions의 protected environment·manual approval 뒤 일시적 least-privilege granular access token(GAT)을 사용한다. Token 값은 남기지 않고 nonsecret token ID·expiry만 receipt에 보존한다. GAT를 주입한 모든 success·failure·ambiguous path는 unconditional retirement barrier로 합류하고, delete 후 그 exact GAT의 authenticated identity probe가 registry에서 명시적으로 거부되어야 retry·incident closure·다음 gate로 간다.
- Public source 후 application release는 먼저 **draft staging surface**로만 만든다. Exact G1 reference npm `.tgz`와 descriptor를 upload·readback해 CI rebuild의 expected byte reference로 쓰되, 이 시점에 application release를 publish/current로 활성화하지 않는다.
- Runtime immutable readback과 npm authoritative readback 뒤에 실제 public registry·Runtime release를 사용하는 exact `npx` smoke를 실행한다. 그 receipt까지 있어야 application binding ledger를 freeze하고 draft를 immutable release로 publish한다. Pages는 가장 마지막에 연다.
- Self-reference를 막기 위해 G1의 immutable `release-intent.json`, S1의 detached `publication-authorization.json`, public `application-binding-ledger.json`, external append-only `publication-receipts.jsonl`과 derived `publication-projection.json`을 분리한다. Binding ledger는 source·Runtime·npm·smoke의 확정된 identity를 담지만, 그 application release 자신의 ID·attestation·readback은 publish 후 activation receipt로 append한다.
- Fixed public source의 README는 exact command를 포함하되, public Landing의 fixed `release/current.json` sentinel이 같은 application version·tag와 immutable binding-ledger digest를 반환할 때만 supported command이라는 조건과 sentinel link를 본문에 명시한다. 따라서 source 공개 직후의 부분 상태는 `source_visible_install_unverified`로 정직하게 보이고, ADR 0015의 fixed clean snapshot 뒤 presentation-only source commit을 만들지 않는다. GitHub Pages는 application release 뒤 이 public sentinel을 여는 마지막 explicit promotion surface이며, G1 base artifact와 S8 ledger에서 deterministic하게 조립한 exact Pages artifact를 manual workflow·protected `github-pages` environment로 배포한 뒤만 `CURRENT_PUBLIC_PREVIEW`가 된다.
- Exit code나 HTTP success 한 번은 완료 증거가 아니다. 완료 상태는 항상 외부 시스템을 다시 읽어 candidate ledger와 대조한 결과에서 파생한다.
- Published npm `name@version`, immutable GitHub tag·asset은 수정 가능한 rollback point가 아니다. 실패한 byte identity는 재사용하지 않는다. Pages-only 실패는 같은 artifact 재배포로 복구하고, npm publish 후 smoke/application release 실패는 exact version을 deprecate·`preview` tag 제거한 뒤 새 application version으로 이어가는 publication incident다. `unpublish`는 정상 rollback이 아니다.

이 결정은 [Ticket 003a](../tickets/003a-third-party-redistribution-evidence.md)의 `REDIST-*`, [Ticket 005](../tickets/005-public-repository-authority-and-license.md)와 [ADR 0015](../../../adr/0015-bootstrap-public-repository-from-reviewed-clean-snapshot.md)의 clean public snapshot, [Ticket 006](../tickets/006-npx-production-composition.md)의 exact package, [Ticket 007](../tickets/007-runtime-release-delivery-integrity.md)과 [ADR 0016](../../../adr/0016-distribute-public-preview-with-an-exact-npx-launcher-and-verified-runtime-release.md)의 application↔Runtime binding, [Ticket 013](../tickets/013-landing-install-truth.md)의 release-generated display artifact, [Ticket 014](../tickets/014-final-parallel-delivery-contracts.md)의 `G1 → I1 → I2 → P1` delivery edge를 다시 열지 않는다.

## 공식 문서에서 확인한 platform truth

### GitHub immutable release

- Immutable release를 publish하면 연관 tag는 특정 commit에 고정되고 release가 있는 동안 이동·삭제할 수 없다. Asset도 수정·삭제할 수 없다. Immutable release를 삭제한 뒤 tag를 삭제할 수는 있지만 **같은 tag 이름은 다시 쓸 수 없다**. Repository를 삭제하고 같은 이름으로 다시 만들어도 보호된 tag 이름은 재사용되지 않는다. [GitHub Immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)
- Immutable release 생성 시 release tag, commit SHA, release assets를 담은 cryptographically verifiable release attestation이 자동 생성된다. GitHub의 권고 publish flow는 `draft 생성 → 모든 asset 첨부 → draft publish`다. [GitHub Immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)
- Release immutability는 **활성화 이후 future release에만** 적용된다. 따라서 첫 draft 전에 admin-read credential로 `GET /repos/{owner}/{repo}/immutable-releases`를 호출해 `200`과 `{ "enabled": true }`를 receipt로 남긴다. `404`는 disabled라서 blocker다. Release별 postcondition은 published release의 `immutable=true`로 다시 닫는다. [Preventing changes to your releases](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/establish-provenance-and-integrity/prevent-release-changes), [Repository immutable releases REST API](https://docs.github.com/en/rest/repos/repos#check-if-immutable-releases-are-enabled-for-a-repository)
- `gh release verify <tag>`는 release 존재와 immutability를 검증하고, `gh release verify-asset <tag> <local-path>`는 local artifact가 release asset과 정확히 같은지 검증한다. 요청 시 생성되는 GitHub source zip/tarball에는 `verify-asset`을 사용할 수 없으므로 Runtime payload로 쓰지 않는다. [Verifying the integrity of a release](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/verify-release-integrity)
- Attestation REST API는 subject SHA-256과 `predicate_type=release`로 attestation을 나열할 수 있지만, GitHub는 REST bundle을 읽은 것만으로 검증했다고 보지 않는다. Signature·timestamp의 cryptographic verification과 signer identity validation이 필요하며 GitHub CLI 검증을 안내한다. [Repository attestations REST API](https://docs.github.com/en/rest/repos/attestations?apiVersion=2022-11-28)
- Public repository의 tag ruleset은 matching tag의 create/update/delete 권한을 제한할 수 있다. Immutable release는 publish 전 draft/tag 창을 자체로 보호하지 않으므로 application/Runtime tag pattern에 active ruleset을 먼저 적용하고 release coordinator만 필요한 create를 할 수 있게 한다. [About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets), [Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)

### GitHub draft·asset·readback

- Release create API는 `tag_name`을 필수로 받고 `target_commitish`에 exact commit SHA를 줄 수 있다. `draft=true`가 unpublished release이며 default는 `false`이므로 생략을 허용하면 안 된다. `make_latest`도 default가 `true`이므로 Runtime/application release 모두 first preview에서는 명시적으로 `false`를 준다. Create success는 `201`, validation·spam failure는 `422`이고, 빠른 연속 create는 secondary rate limit을 유발할 수 있다. [Releases REST API](https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28)
- Authenticated list-releases는 push access가 있을 때 draft도 돌려준다. 반면 get-by-tag는 **published release**만 돌려준다. 따라서 ambiguous draft create는 authenticated list에서 exact tag를 찾아 `release_id`를 복구하고, publish 뒤에는 public get-by-tag로 다시 읽는다. [Releases REST API](https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28)
- Asset upload success는 `201`, 같은 filename은 `422`다. GitHub가 특수문자 filename을 rename할 수 있으므로 upload response만 믿지 않고 list-assets에서 실제 `name`, `state`, `size`, `digest`를 읽어야 한다. Upstream upload failure는 `502`와 빈 `state=starter` asset을 남길 수 있고, GitHub는 그 asset을 안전하게 삭제할 수 있다고 명시한다. [Release assets REST API](https://docs.github.com/en/rest/releases/assets?apiVersion=2022-11-28)
- Public asset download는 `browser_download_url` 또는 `Accept: application/octet-stream`으로 수행하며 API client는 `200` direct stream과 `302` redirect를 모두 처리해야 한다. Release gate는 redirect를 따라 full byte를 내려받아 local candidate SHA-256와 다시 비교한다. [Release assets REST API](https://docs.github.com/en/rest/releases/assets?apiVersion=2022-11-28)

### GitHub Pages exposure

- Pages는 branch push 또는 custom Actions workflow로 publish할 수 있다. Branch source는 push마다 publish하지만 custom workflow는 static artifact upload와 deploy를 분리할 수 있다. Pages site는 private repository를 쓰더라도 인터넷에 public일 수 있다. [Configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- Custom deploy job에는 최소 `pages: write`, `id-token: write`, build job에 대한 `needs`, deployment protection을 적용할 environment가 필요하다. Default environment는 `github-pages`이고 deploy action은 `page_url`을 반환한다. [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- Pages deployment API는 deployment `id`, `status_url`, `page_url`을 반환하고 status endpoint는 성공 시 `status: succeed`를 돌려준다. Site endpoint는 `status`, `html_url`, `public`, HTTPS 상태를 읽을 수 있다. 이 API readback과 실제 HTTPS content readback을 함께 사용한다. [GitHub Pages REST API](https://docs.github.com/en/rest/pages/pages?apiVersion=2022-11-28)
- 변경이 publish되는 데 최대 10분이 걸릴 수 있으므로 bounded poll은 허용하되 그 뒤에도 truth가 보이지 않으면 `CURRENT`를 합성하지 않는다. [Creating a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- Pages unpublish는 current deployment만 제거하고 repository settings와 content는 유지한다. 새 successful deployment로 다시 열 수 있으므로 잘못된 Landing을 내리는 복구 수단은 Pages에만 한정해 사용할 수 있다. [Unpublishing a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/unpublishing-a-github-pages-site)

### npm pack·publish·provenance

- npm 10의 `npm pack`은 folder뿐 아니라 installable package spec을 `.tgz`로 만들고 `--dry-run`, `--json`, `--pack-destination`을 제공한다. `npm publish`는 folder와 gzipped tarball을 모두 받을 수 있다. AY-PLE은 G1의 local reference tarball과 public GitHub-hosted workflow가 exact source commit에서 다시 만든 tarball을 byte-for-byte 대조한 뒤, 그 workflow가 만든 `.tgz` path를 publish한다. [npm pack v10](https://docs.npmjs.com/cli/v10/commands/npm-pack/), [npm publish v10](https://docs.npmjs.com/cli/v10/commands/npm-publish/)
- `npm pack --dry-run`은 포함 file을 보여 준다. `package.json.files`가 있으면 그 positive list를 기준으로 pack하지만 `package.json`, README, LICENSE 같은 일부 file은 항상 포함될 수 있다. Symlink는 package에 들어가지 않는다. 따라서 AY-PLE gate는 npm의 include rule을 추측하지 않고 **actual tarball을 풀어 complete-tree roster를 검사**한다. [npm publish v10: Files included](https://docs.npmjs.com/cli/v10/commands/npm-publish/#files-included-in-package)
- Publish 시 registry에는 tarball SHA-1과 SHA-512 `integrity`가 제출되고 이후 install은 지원하는 가장 강한 algorithm으로 download를 검증한다. 같은 `name@version`은 publish 뒤 절대 다시 사용할 수 없고 `unpublish` 뒤에도 재사용할 수 없다. [npm publish v10](https://docs.npmjs.com/cli/v10/commands/npm-publish/)
- Publish default tag는 `latest`다. `--tag`를 주면 그 tag만 붙고, unversioned install은 `latest`를 사용한다. Dist-tag는 add/rm/ls로 별도 수정할 수 있으며 SemVer range로 해석될 이름은 tag로 거절된다. First preview는 exact `preview` tag를 publish operation에 사용하고 Landing·README·smoke는 tag를 authority로 읽지 않는다. [npm dist-tag v10](https://docs.npmjs.com/cli/v10/commands/npm-dist-tag/)
- `npm view <name>@<exact> [field...]`은 registry의 exact version과 child field를 읽을 수 있다. `version`, `dist.integrity`, `dist.shasum`, `dist.tarball`, `deprecated`, repository와 distribution metadata readback에 사용한다. [npm view v10](https://docs.npmjs.com/cli/v10/commands/npm-view/)
- Provenance는 supported cloud-hosted CI에서 public source repository와 build/publish 위치를 verifiably 연결한다. GitHub Actions에서는 GitHub-hosted runner, `id-token: write`, `npm publish --provenance`가 필요하고 `package.json.repository`가 publish source repository와 case-sensitive exact match해야 한다. Public package first publish는 `--access public`도 명시한다. [Generating provenance statements](https://docs.npmjs.com/generating-provenance-statements/)
- `npm audit signatures`는 downloaded package의 registry signature와 provenance attestation을 검증한다. npm은 attestation format이 진화할 수 있으므로 verifier npm CLI version도 evidence에 기록한다. [npm audit v10](https://docs.npmjs.com/cli/v10/commands/npm-audit/#audit-signatures)

### npm 첫 package bootstrap 제약

- 2026-07-23에 `npm view ay-ple version --json --registry=https://registry.npmjs.org/`를 다시 실행한 registry readback은 `E404 Not Found`였다. 이것은 해당 시점의 absence observation일 뿐 package name 예약이 아니므로, publish 직전 availability·ownership을 다시 읽어야 한다.
- Staged publishing은 npm CLI 11.15.0+, Node 22.14.0+를 요구하고, **package가 registry에 이미 존재해야 하므로 brand-new package를 stage할 수 없다**. Stage 후 maintainer의 명시적 review·2FA approve로 public이 된다. [Staged publishing for npm packages](https://docs.npmjs.com/staged-publishing/)
- Trusted publishing은 npm CLI 11.5.1+, Node 22.14.0+를 요구하며, npmjs.com의 **해당 package settings**에 publisher repository·workflow·optional environment를 먼저 설정하는 구조다. 현재 package당 trusted publisher는 하나만 설정할 수 있다. [Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers/)
- Unscoped package는 항상 public이며 direct publish에는 account 2FA 또는 bypass 2FA가 활성화된 GAT가 필요하다. npm은 모든 package create/publish에 이 조건을 적용하고, bypass 2FA GAT를 non-interactive publish에 사용할 수 있다. [Creating and publishing unscoped public packages](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/), [Requiring 2FA for package publishing and settings modification](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/)

따라서 `ay-ple` first publish에 staged/trusted publishing을 가정할 수 없다. 현재 npm 10 product lane을 유지하면서 provenance를 얻기 위해 public GitHub-hosted runner가 exact public source commit을 checkout하고 reviewed deterministic generator/build를 실행한다. CI tarball의 bytes·complete-tree·dependency closure가 G1 local reference와 exact match할 때만 그 CI output을 direct publish한다. Workflow는 protected environment의 manual approval, `contents: read`, `id-token: write`, npm이 brand-new unscoped package create에 허용하는 최소 write scope·짧은 만료의 bypass-2FA GAT를 사용한다. Trusted publishing은 첫 package가 생긴 후 별도 후속 변경으로 전환할 수 있지만 first-release gate는 그 전환을 전제하지 않는다.

Granular access token은 사용 후 `npm token delete <id>`로 폐기한다. 폐기한 token 자체로 `npm whoami`/`/-/whoami`를 호출해 registry가 그 exact credential을 명시적으로 거부하는지 본다. 이 probe는 token 값을 log에 남기지 않고 ephemeral memory에서만 사용하며, network·5xx·timeout을 revocation으로 간주하지 않는다. npm은 revocation 반영에 최대 1시간이 걸릴 수 있다고 안내하므로, deadline 안에 explicit auth rejection을 확인하지 못하면 `credential_retirement_reconciliation`에 멈춘다. [Revoking access tokens](https://docs.npmjs.com/revoking-access-tokens/), [npm whoami v10](https://docs.npmjs.com/cli/v10/commands/npm-whoami/)

### npm deprecate·unpublish

- `npm deprecate <package>@<exact> <message>`는 install하는 사용자와 npm page에 warning을 보이며 exact version에도 적용할 수 있다. Empty message로 undeprecate할 수 있으므로 ledger는 registry readback의 actual `deprecated` field를 보존한다. [npm deprecate v10](https://docs.npmjs.com/cli/v10/commands/npm-deprecate/)
- npm registry data는 immutable하다. 72시간 이내 unpublish도 public dependents가 없어야 하며, 72시간 이후에는 no dependents, 지난주 300 downloads 미만, single owner라는 조건을 모두 만족해야 한다. 무엇보다 unpublish는 되돌릴 수 없고 같은 `name@version`을 다시 쓸 수 없으며 package 전체를 내리면 24시간 동안 새 version을 publish할 수 없다. npm도 일반적으로 deprecate를 권고한다. [npm Unpublish Policy](https://docs.npmjs.com/policies/unpublish/), [npm unpublish v10](https://docs.npmjs.com/cli/v10/commands/npm-unpublish/)

## Current repository release-readiness observation

2026-07-23 `hub` HEAD `f4f225f1a`에서 확인한 현재 상태는 publication clearance가 아니다.

- Git remote는 camp upstream `connect-AIAgentChallenge-26-1/hub`와 participant fork `swh3467/hub`뿐이며 public `AY-PLE` target remote가 없다.
- Root package는 `name: hub`, `private: true`이고 모든 current app/package workspace도 private이며 public `ay-ple` launcher package가 없다.
- Current `.github` surface는 camp PR template·auto-merge workflow이고 public release, npm provenance publish, protected Pages workflow가 없다.
- Root `LICENSE`, `NOTICE`, `SECURITY.md`, `CONTRIBUTING.md`, `PRIVACY.md`, public Landing, release intent/binding ledger implementation이 없다. Third-party legal/provenance closure도 Ticket 003a의 미래 fail-closed gate이지 현재 green artifact가 아니다.
- npm `ay-ple`의 E404는 그 시점의 absence observation일 뿐 이름 소유·publish permission을 보장하지 않는다.

따라서 이 연구가 닫는 것은 external publication 승인이 아니라, 후속 구현이 만들고 자동 판정해야 할 release gate contract다.

## `G1`이 넘겨야 하는 immutable publication input

Publication coordinator는 candidate를 조립하거나 수정하지 않는다. 다음 값이 모두 있는 accepted `G1` receipt 하나만 입력으로 받는다.

| Group | 필수 identity·evidence | Blocking equality |
| --- | --- | --- |
| Source | `releaseAttemptId`, fixed `hubSourceSha`, exporter revision, allowlist·required-set·hard-deny-set digest, public provenance manifest digest, resulting public tree ID, 예정 public commit ID | 두 clean export tree·manifest identity, required set exact inclusion, hard-deny·unknown·untracked·ignored·symlink escape 0, secret·privacy gate green |
| Application | exact package name/version, `v<applicationVersion>` tag, public command, compatibility descriptor, package resource descriptor, expected public URLs | package version = descriptor launcher version = command version = application tag mapping |
| npm reference tarball | G1 local reference `.tgz` path, bytes, SHA-256, SHA-512 SRI, SHA-1, actual unpacked path/mode/digest roster, declared runtime dependencies, `npm-shrinkwrap.json` registry `resolved`/`integrity` closure, installed closure, bundler origin-input·`bundled_js` roster | CI rebuild bytes/complete tree = local reference; source→staging→tarball dedicated resource equality; declared dependency→shrinkwrap→installed closure→SBOM exact set; bundler origin→`bundled_js` exact set; ambient root `AGENTS.md`·`.agents/**` 0 |
| Runtime binding | exact `runtime-release.json` bytes/digest, canonical Runtime manifest bytes/digest, Runtime `releaseId`, `runtime-v<runtimeReleaseId>` tag, target, `ay-ple-runtime-<runtimeReleaseId>-darwin-arm64.tar.gz` name/URL/bytes/SHA-256 | npm descriptor = application release sidecar; npm canonical manifest = archive `manifest.json`; descriptor repository·tag·asset name·URL = live GitHub release and returned `browser_download_url`; descriptor archive tuple = Runtime candidate |
| Runtime payload | retained deterministic archive path, archive member complete-tree roster, extracted recipient roster, checksum asset, legal/SBOM/provenance roster digests | two-build archive identity, archive root exact set, `REDIST-01..12` all green |
| Canonical component roster | owner provenance, first-party/source/npm/release-wide component records, R2-owned Runtime candidate/component slice digest | R2가 Runtime slice를 freeze하고 G는 이를 read-only로 결합; `THIRD_PARTY_NOTICES`·original licenses·SBOM·provenance는 이 하나의 roster에서 생성되며 surface별 actual component set과 exact equality |
| Mach-O | manifest-declared Mach-O path별 bytes/mode, verifier command·version, observed signature status/identity, pre-archive·post-local-extract·post-download-extract result | Missing·unknown result 0, byte/mode/signature evidence가 reviewed expected roster와 exact match |
| Landing·README | immutable base display artifact bytes/digest, Pages assembler digest, exact command, download/installed/free-space values, compatibility, repository/Docs/license/trust links, rollback omission, fixed public `release/current.json` URL·schema, README conditional copy | Base value가 위 authority에서 생성되고 fixture/placeholder/moving tag 0; S9 assembler는 base를 바꾸지 않고 S8 ledger에서 sentinel만 생성; README는 sentinel이 같은 application version·tag·binding-ledger digest를 반환할 때만 command를 current/support로 표시 |
| Publication plan | public repository/npm/GitHub Releases/Pages exact target, candidate digest, 계획한 write·conditional cleanup scope | G1은 승인자·승인 시각을 예언하지 않고 target fallback 0; actual authorization은 S1 detached record가 소유 |

Ticket 005의 public source required set은 release 대상 product source·tests·fixtures·build/test/release surface, root package file, product README·public Docs entry, `LICENSE`, `NOTICE`, generated `THIRD_PARTY_NOTICES.md`·original license tree·SBOM·provenance, `SECURITY.md`, DCO를 포함한 `CONTRIBUTING.md`, `PRIVACY.md`, brand asset·provenance, public `CONTEXT.md`, 선별한 product/architecture docs·adopted ADR, public-owned `.github` 표면이다. Remote readback은 allowlist digest만 비교하지 않고 이 required set의 exact inclusion을 따로 판정한다.

Hard-deny set은 camp `AGENTS.md`, `.agents/**`, `skills-lock.json`, camp `.github/**`, `artifacts/**`, `references/openai-codex` gitlink, Wayfinding·implementation ticket/spec·agent 운영·archive/spike·internal backlog, clone-local state다. Public remote tree·npm tarball·Runtime/release asset은 자신의 선언된 surface roster와 exact set equality여야 하고 이 hard-deny path는 0개여야 한다.

Mach-O gate는 GitHub asset digest나 release attestation을 code-signing 판정으로 확대하지 않는다. GitHub evidence는 hosted archive byte와 tag/commit mapping을 증명한다. Candidate owner가 기록한 actual signature status·identity를 archive 전, local extraction 뒤, GitHub에서 다시 받은 archive extraction 뒤 각각 실행해 비교한다.

2026-07-23 local candidate의 초기 observation은 다음과 같다. 이 표는 G1이 새로 생성할 reviewed expected roster의 seed일 뿐 authority가 아니다.

| Native executable | SHA-256·mode | Local observed signature | Local verification |
| --- | --- | --- | --- |
| `codex` | `3302acbda5f53de1a71ebdb0c0f2aae0d47f9324aa9fb6b4e78a47014fd51c7d`, `0755` | Identifier `codex`, Developer ID Application `OpenAI OpCo, LLC`, team `2DC432GLL2`, CDHash `a6f353dd199a4225508cc1df3d1a41a7d41b5d0d` | strict `codesign` validation green |
| `codex-code-mode-host` | `d0ace4fdb7f9d3872cb158c1493bdb3b2bfe4cb3c0d4c5dfaa3e0e2762574b21`, `0755` | Identifier `codex-code-mode-host`, Developer ID Application `OpenAI OpCo, LLC`, team `2DC432GLL2`, CDHash `42f396b7d8ee40580ec62f6692b18e245d4bd410` | strict `codesign` validation green |
| `rg` | `4fdf1d8365af224bc70e3c1490d8461d859c37cc70e739a11e987af0215f3e94`, `0755` | Identifier `rg`, ad-hoc, CDHash `a7dbf01facbbddf9e0356a5cefb5af62452a2c78` | strict `codesign` validation green |
| patched `zsh` | `b69893d9da08786211bac0862212e26a8a31af24eb77da21692671c58d388b8d`, `0755` | Identifier `zsh`, ad-hoc, CDHash `03e3b9c0452e51b6cc69498d36891e9036fb0b78` | strict `codesign` validation green |

G1은 매 candidate에서 이 결과를 재생성하고, 각 executable의 SHA-256·mode·signature status/identity·strict validation을 pre-archive, post-local-extract, post-GitHub-download-extract 세 지점에서 exact 비교한다. `unsigned`, ad-hoc, named identity 중 무엇인지 모르는 상태는 차단한다. Apple도 `codesign --verify --strict`와 policy assessment를 구분하고 `spctl`은 top-level app bundle에만 적용하라고 안내하므로, command-line Mach-O를 `spctl`이 app으로 accept해야 한다는 gate는 만들지 않는다. [Apple TN2206: macOS Code Signing In Depth](https://developer.apple.com/library/archive/technotes/tn2206/)

현재 네 file에는 `com.apple.provenance` xattr가 있고 `com.apple.quarantine`은 없었다. 이처럼 quarantine/provenance xattr는 파일시스템·download channel이 부여하는 metadata이지 archive byte identity가 아니므로 tar roster 보존 equality에 넣지 않는다. Clean Mac의 quarantine·Gatekeeper·native execution 행동은 Ticket 016의 public smoke가 별도로 판정한다. Ticket 015는 유료 Developer ID나 notarization을 새 요구사항으로 만들지 않는다.

## 권고 release ledger

Ledger는 Runtime selection authority가 아니다. Exact package 안의 `runtime-release.json`과 canonical manifest가 계속 startup trust root이며, ledger는 source↔public commit↔GitHub releases↔npm↔Pages의 mapping과 external effect를 증명한다.

하나의 mutable boolean이나 자기 자신을 참조하는 “final ledger” 파일 대신 다음 네 material을 분리한다.

1. `release-intent.json` — G1이 만든 immutable, non-self-referential publication input. Accepted artifact digest, 계획된 repository·tag·version·URL·write/cleanup policy, binding-ledger schema/filename을 담지만 실제 승인자·승인 시각이나 아직 생기지 않은 external release ID·attestation을 예언하지 않는다. External write 후에도 bytes를 수정하지 않는다.
2. `publication-authorization.json` — S1에서 생성하는 owner-only detached immutable approval record. `sha256(release-intent.json)`, approver identity, approval timestamp, exact targets, 허용한 writes·conditional cleanup scope를 담는다. Authorization은 intent에 나중에 삽입하지 않고 public asset에 approver identity를 노출하지 않으며, public ledger는 그 digest만 참조한다.
3. Public `application-binding-ledger.json` — source, immutable Runtime, npm exact version/provenance·credential retirement, Ticket 016 exact public smoke까지 authoritative readback한 후 한 번 freeze하는 application release asset. Intent·authorization digest, S2–S7 receipt digest와 `sha256(prebinding-publication-receipts.jsonl)`, descriptor·manifest·artifact digest, natural external identity, verifier version/result를 담지만 자신을 싣을 application release의 미래 release ID·asset digest·attestation은 담지 않는다.
4. Append-only `publication-receipts.jsonl`과 derived `publication-projection.json` — application release publish/readback과 Pages deploy/readback을 append하고 intent·authorization·binding ledger와 연결한다. 각 receipt는 `reconciliationEpoch`, 이전 receipt digest, 현재 생성된 authority digest, non-personal actor role, timestamp, command/tool version, redacted request identity를 가진다. S8은 현 complete epoch의 S2–S7 prefix bytes를 public-safe `prebinding-publication-receipts.jsonl`로 freeze하고 application release asset에 싣는다. Projection은 여기서 현재 phase와 retained/yanked/current를 계산하며 사람이 수동으로 `published=true`를 쓰지 않는다.

S2–S7의 pre-binding operation/readback receipt는 아직 존재하지 않는 ledger digest를 참조하지 않고 intent·authorization digest와 이전 receipt digest를 참조한다. S8은 이 exact receipt prefix bytes·digest를 `prebinding-publication-receipts.jsonl`·`application-binding-ledger.json`에 한 번 freeze한다. Application release는 immutable intent, prebinding receipt snapshot, exact descriptor/checksum sidecar, public binding ledger를 싣고 owner-only authorization은 digest로만 연결한다. S8 application activation과 S9 Pages receipt는 intent·authorization·binding-ledger digest를 모두 참조한다. 이 transitive chain으로 미래 ledger를 이전 receipt에 넣거나 immutable asset을 다시 고치는 순환을 막는다.

최소 identity는 다음과 같다.

```text
schemaVersion
releaseAttemptId
hubSourceSha
exporterRevision + allowlistDigest + publicTreeId + publicCommitSha
applicationVersion + applicationTag
runtimeReleaseId + runtimeTag
npmTarballSha256 + npmTarballIntegrity
runtimeArchiveName + runtimeArchiveBytes + runtimeArchiveSha256
descriptorSha256 + manifestSha256 + legalEvidenceDigest
landingBaseDisplayDigest + pagesAssemblerDigest + currentSentinelUrl
publicationAuthorizationSha256
```

External publication receipt는 서비스별 natural identity를 반드시 가진다.

| Surface | Reconciliation key | 보존할 readback |
| --- | --- | --- |
| Public Git | repository + public commit SHA + tag | remote ref SHA, commit tree ID, provenance manifest digest, visibility |
| GitHub release | repository + exact tag | release ID, `draft`, `immutable`, target tag commit, `published_at`, attestation verification receipt |
| GitHub asset | release ID + exact asset name | asset ID, actual name, `state`, bytes, GitHub `sha256:` digest, downloaded SHA-256 |
| npm | registry + `ay-ple@<exact>` | version, `dist.integrity`, `dist.shasum`, tarball URL, downloaded tarball digests, repository, provenance verification, `deprecated` |
| dist-tag | registry + package + tag | before mapping, requested mapping, after mapping |
| npm publish credential | npm account + nonsecret token ID | expiry, injection point, delete response, exact-token `whoami` explicit rejection·timestamp; token bytes/log는 제외 |
| Exact public smoke | attempt ID + exact npm version + Runtime release ID | isolated root/profile, exact command, package integrity, Runtime archive digest, outcome, process cleanup, Ticket 016 evidence reference |
| Pages | repository + `pages_build_version`/deployment ID | workflow run, source commit, assembled artifact digest, deployment status, page URL, site status, HTTPS Landing digest, current-sentinel tuple/body digest |

Sensitive token, Authorization header, OIDC token, npm token 값과 local credential path는 ledger에 넣지 않는다. npm credential receipt에는 nonsecret token ID·expiry·retirement readback만 남긴다.

Coordinator의 physical working record는 G-owned ignored root `distribution/releases/<releaseAttemptId>/publication/` 아래에 둔다. `release-intent.json`과 `publication-authorization.json`은 각각 create-exclusive로 freeze하고, `publication-receipts.jsonl`은 이전 record digest를 연결해 append하며, `publication-projection.json`은 매번 immutable inputs·journal·remote readback에서 atomic하게 재생성한다. 이 directory는 owner-only local release evidence이지 package·Runtime·Landing input authority가 아니다.

Pre-S8에 journal이 유실되면 없어진 previous digest에 append하지 않는다. Intent·authorization bytes가 보존되고 모든 external natural identity를 다시 관찰할 수 있을 때만 새 `reconciliationEpoch`을 시작하고 `evidenceLoss=true`와 full re-observation receipt를 첫 record로 남긴다. S8 ledger는 이 complete replacement epoch만 commit하며, immutable input이 없거나 external state를 재구성할 수 없으면 `blocked_evidence_loss`다. Post-S8에 local journal이 유실되면 owner-only authorization bytes가 여전히 digest를 통과하는 경우에만 immutable application release의 prebinding receipt snapshot·ledger로 S2–S7을 복원하고 S8/S9 natural identity를 다시 읽어 새 post-binding epoch을 만든다. Authorization 또는 immutable snapshot이 missing·mismatch·unavailable이면 current를 복원하지 않고 `blocked_evidence_loss`에 멈춘다.

## 권고 state machine과 blocking gate

### `S0 LOCAL_RC_ACCEPTED`

`G1`, `I1`, `I2`가 같은 candidate digest를 가리키고 Ticket 014의 root/deterministic/packed/live gates가 green이어야 한다. 여기의 `I2`는 retained local package/Runtime을 쓰는 **prepublication live candidate gate**이며 S7의 postpublication public-command smoke와 다르다. `REDIST-*`, canonical component roster, pack complete-tree, Runtime archive, Mach-O observed signature, Landing display 중 하나라도 missing·unknown·human-review이면 외부 write를 시작하지 않는다. G1은 승인 사실을 예언하지 않는 non-self-referential `release-intent.json`을 freeze하고 digest를 남긴다.

### `S1 PUBLICATION_AUTHORIZED`

사용자가 exact target repository, npm registry/package, application/Runtime tag, candidate digest에 대한 external publication을 승인한다. Coordinator는 `sha256(release-intent.json)`을 참조하는 `publication-authorization.json`에 approver·time·target·scope를 create-exclusive로 기록하고 digest를 다시 읽어 확인한다. 승인 범위는 source push, 두 GitHub release publish, npm exact version publish, **주입된 publish GAT의 revoke·auth-rejection probe**, Pages deploy, **현 attempt가 만든 unpublished application·Runtime draft/starter의 proven-safe cleanup**, post-npm gate 실패 시 exact deprecate/`preview` tag 제거까지를 조건부로 명시한다. Published release 삭제, npm unpublish, Pages unpublish 같은 추가 withdrawal은 별도 승인이다.

Preflight는 다음을 확인한다.

- Repository release immutability endpoint가 **첫 draft 전** `200`·`enabled=true`를 반환한 readback receipt
- Application/Runtime exact tag pattern의 active tag ruleset과 release coordinator create permission; expected tag가 아직 생성되지 않았거나 exact source SHA에 있음
- Public repository target과 `package.json.repository`의 case-sensitive equality
- Repository visibility가 public이고 Private Vulnerability Reporting readback이 enabled이며 public `SECURITY.md`·Privacy·License·NOTICE target이 candidate와 일치함. [Private vulnerability reporting REST API](https://docs.github.com/en/rest/repos/repos#check-if-private-vulnerability-reporting-is-enabled-for-a-repository)
- `ay-ple`의 즉시 registry availability/ownership readback, auth·2FA/publish permission, exact `preview` tag grammar
- Public GitHub-hosted publish workflow의 protected environment/manual approval, `id-token: write`, npm이 brand-new package create에 허용하는 최소 write scope·짧은 만료의 bypass-2FA GAT, nonsecret token ID·expiry와 unconditional delete/auth-rejection retirement plan
- Publish workflow가 protected `refs/tags/v<applicationVersion>`로 dispatch되고 credential 주입 전 `GITHUB_REPOSITORY`가 expected public repository, `GITHUB_REF`가 exact tag ref, `GITHUB_SHA`·`GITHUB_WORKFLOW_SHA`가 S2 public commit임을 assert하는 gate
- Pages가 branch-push auto-deploy가 아니라 custom workflow/manual environment gate를 사용함
- Public source commit/tag와 npm version이 아직 다른 identity로 쓰이지 않았음

### `S2 PUBLIC_SOURCE_VERIFIED`

Fixed clean snapshot을 public root commit으로 push한다. Remote에서 commit을 다시 fetch해 expected tree ID·provenance manifest digest를 비교하고 required-set exact inclusion·hard-deny-set absence·surface roster exact equality를 다시 판정한다. Active tag ruleset 아래 release coordinator가 `v<applicationVersion>`을 이 public commit에 만들고 remote ref SHA를 다시 읽는다. 새 Runtime byte를 publish할 때만 `runtime-v<runtimeReleaseId>`도 같은 commit에 만든다. 기존 Runtime을 reuse하면 그 earlier tag를 이동하지 않고 S4에서 기존 immutable release를 다시 검증한다. Tag update/delete는 허용하지 않고 published commit은 force-push하지 않는다. Immutable release publish 전 tag ruleset이 임시 보호를, publish 후 GitHub release immutability가 영구 보호를 담당한다.

이 단계부터 source는 public이다. 여러 registry를 하나의 transaction처럼 숨길 수 없으므로 projection은 `source_visible_install_unverified`를 정직하게 가진다. Fixed source README의 exact command는 fixed public `release/current.json` sentinel이 같은 application version·tag·binding-ledger digest를 반환할 때만 supported라는 조건과 sentinel link와 함께 보인다. S9 전 sentinel의 404·stale·mismatch는 current가 아니다. Pages branch-push deployment은 꺼 두고 ADR 0015의 fixed snapshot 뒤 source/presentation commit을 추가하지 않는다. Official current 표시는 S9 Pages readback 전까지 열지 않는다.

### `S3 APPLICATION_DRAFT_STAGED`

Exact application tag/public commit에 `draft=true`, `make_latest=false` release를 만든다. Candidate-declared initial asset roster로 G1이 accept한 **reference** npm `.tgz`, 그 tarball 안과 byte-for-byte 같은 `runtime-release.json`, `release-intent.json`, 해당 checksum sidecar를 upload한다. Owner-only `publication-authorization.json`은 asset에 싣지 않고 receipt/ledger가 digest로만 참조한다. List-assets 전체 pagination을 읽어 actual name set, `state=uploaded`, bytes, GitHub `sha256:` digest를 검사하고 모든 asset을 authenticated download해 G1 bytes와 다시 비교한다. Tarball을 새 temp root에 풀어 descriptor·canonical manifest·complete-tree와 sidecar equality도 다시 확인한다.

Draft release ID와 exact reference tarball asset ID를 publish workflow의 expected-byte input으로 고정한다. GitHub-hosted job은 authenticated asset download로 reference bytes를 받고, public source checkout에서 실제로 rebuild한 output과 대조한다. 이 phase의 draft는 application release 활성화·current·public install authority가 아니며, public get-by-tag이 보이지 않는 것이 정상이다. `draft=false` PATCH는 S8 전에 금지한다.

### `S4 RUNTIME_RELEASE_VERIFIED`

Pinned Runtime이 새 byte라면 다음 순서로 처리한다.

1. Exact Runtime tag와 public commit SHA로 `draft=true`, `make_latest=false` release를 만든다.
2. Candidate-declared asset roster만 upload한다. 최소 Runtime archive와 checksum을 포함하고, 별도 공개하는 legal/SBOM/provenance sidecar가 있다면 archive 안 canonical copy와 digest가 같아야 한다.
3. List-assets 전체 pagination을 읽어 expected name 집합과 exact equality, 모든 `state=uploaded`, bytes, `sha256:` digest를 검사한다. `starter`, rename, missing, extra, duplicate는 실패다.
4. 모든 asset을 API로 다시 download해 local candidate digest를 비교한다. Runtime archive를 새 temp root에 extract하고 canonical manifest·recipient legal/SBOM/provenance complete-tree와 Mach-O signature roster를 다시 검증한다.
5. Draft를 `draft=false`, `make_latest=false`로 publish한다.
6. Public get-by-tag가 같은 release ID/tag를 돌려주고 `draft=false`, `immutable=true`인지 확인한다. `gh release verify`와 모든 retained local asset에 대한 `gh release verify-asset`을 실행하고 release attestation receipt를 남긴다.

이미 같은 Runtime을 reuse한다면 create/upload를 건너뛰되 위 6번과 public asset download·archive extraction·digest/legal/signature readback을 모두 다시 수행한다. `same-or-earlier`는 tag 문자열 비교가 아니라 candidate descriptor가 지정한 exact Runtime release ID/tag/digest가 이미 immutable하게 존재한다는 뜻이다. New·reused 모두 descriptor의 `distribution.repository`, `runtimeAssetReleaseTag`, exact asset name·URL이 live release repository/tag·asset과 같아야 하고, URL은 GitHub API가 반환한 `browser_download_url`과 exact match해야 한다.

### `S5 NPM_VERSION_VERIFIED`

Public GitHub repository의 GitHub-hosted workflow를 protected `refs/tags/v<applicationVersion>`로 dispatch한다. Credential이 없는 preflight job이 `GITHUB_REPOSITORY`, `GITHUB_REF`, `GITHUB_SHA`, `GITHUB_WORKFLOW_SHA`를 기록하고 각각 expected repository, exact application tag ref, S2 public commit, S2 public commit과 같음을 assert한다. 하나라도 다르면 environment approval·GAT 주입·npm write 전에 실패한다.

그 뒤 runner가 S2 source commit을 exact checkout하고 reviewed deterministic package generator/build와 pinned Node/npm/toolchain을 실행해 새 `.tgz`를 만든다. S3의 exact release/asset ID로 reference tarball을 authenticated download한 뒤 CI output의 bytes·SHA-256·SHA-512 SRI·SHA-1·unpacked path/type/mode/digest roster·dependency closure가 G1/reference와 exact match하는지 검사한다. Provenance가 주장하는 trigger/ref/workflow source와 실제 checkout·build·publish byte 경로가 같아야 한다.

Mismatch이 하나라도 있으면 npm write는 0회이고 현 attempt를 incident로 닫는다. Source·generator·package bytes를 바꾸어야 하면 이미 public인 application tag·draft를 덮지 않고 새 `releaseAttemptId`·application version·tag로 G1부터 다시 시작한다. Equality가 green일 때만 protected environment의 manual approval을 통과한 publish job이 `contents: read`, `id-token: write`와 brand-new package create에 필요한 최소 write scope·짧은 만료의 bypass-2FA GAT를 받고 **CI가 만든 그 exact output**을 한 번 publish한다.

```text
npm publish ./<ci-built-and-matched-ay-ple-tarball>.tgz \
  --access public \
  --tag preview \
  --provenance
```

Token value·Authorization header·local credential path는 log/receipt에 남기지 않고 nonsecret token ID·expiry만 기록한다. Actual npm/Node/tool version·generator digest·workflow run과 CI tarball digest를 attempt receipt에 기록한다. Publish 뒤 다음 readback을 모두 통과해야 한다.

1. `npm view ay-ple@<exact> ... --json`으로 exact version, repository, `dist.integrity`, `dist.shasum`, `dist.tarball`, `deprecated`를 읽는다.
2. Registry tarball URL과 `npm pack ay-ple@<exact>`으로 public tarball을 다시 받고 candidate의 SHA-512 SRI·SHA-1·SHA-256·bytes와 actual complete-tree roster를 비교한다.
3. Tarball의 descriptor·canonical manifest·workspace resource complete tree와 legal/SBOM/provenance가 canonical component roster/G1 candidate와 같고 ambient repository instructions가 없는지 다시 검사한다.
4. Isolated consumer에 exact version을 내려받아 `npm audit signatures`로 registry signature와 provenance attestation을 검증한다. Expected public repository, commit/workflow mapping을 확인하고 verifier npm version·result를 남긴다.
5. `npm dist-tag ls ay-ple --json`에서 `preview`가 exact version을 가리키고, first preview policy상 `latest`가 의도치 않게 이 version을 가리키지 않는지 확인한다.
6. Published `package.json` 선언 dependency, published `npm-shrinkwrap.json`의 registry `resolved`/`integrity` closure, isolated install actual closure, package SBOM component set이 exact equality이고 bundler origin-input set이 `bundled_js` roster와 exact equality인지 확인한다.

`preview` tag는 exposure quarantine이 아니다. Exact version은 이미 installable하므로 phase는 `npm_published_unactivated`로 정직하게 기록한다. 이 tag는 unsupported bare `npx ay-ple`가 accidental current pointer가 되는 것을 막을 뿐이며 public visibility를 숨기지 않는다.

### `S6 NPM_PUBLISH_CREDENTIAL_RETIRED`

S6은 success phase 하나가 아니라 **GAT가 주입된 모든 terminal outcome의 unconditional finally barrier**다. Publish request 전 실패, request/response loss, registry·provenance mismatch, success 모두 `npm token delete <id>`와 retirement readback으로 합류한다. 조건부 deprecate/dist-tag 정산이 필요하면 승인된 incident branch에서 retirement 전에 끝내거나, fresh cleanup GAT를 쓰고 그 credential도 같은 retirement barrier를 통과한다. 모든 injected GAT의 retirement 전에는 same-token retry, incident closure, 새 release attempt, public smoke, application release, Pages로 가지 않으며 retry는 새 GAT를 사용한다. Retirement receipt 자체는 S5 success를 합성하지 않는다. S5가 green인 branch만 `S5 green ∧ all injected GAT retired` guard를 통과해 S7로 가고, S5 failure branch는 retirement 뒤 retry 또는 incident로만 간다.

Delete response를 기록한 뒤 해당 exact GAT를 ephemeral memory에서만 사용해 `npm whoami`·registry `/-/whoami`를 bounded poll한다. Registry의 explicit invalid/unauthorized-token response만 retirement green이며 delete response loss도 이 rejection으로 success reconcile할 수 있다. Credential이 아직 성공하거나 network·5xx·timeout뿐이면 최대 1시간 deadline까지 poll하고, 그 뒤에도 explicit rejection이 없으면 `credential_retirement_reconciliation`이다. Token expiry 예정이나 delete exit code만으로 green을 합성하지 않는다.

### `S7 EXACT_PUBLIC_SMOKE_VERIFIED`

Registry readback이 green인 뒤 새 isolated consumer root/profile에서 Landing command와 같은 exact package spec을 자동화용 `--yes`로 실행한다.

```text
npx --yes ay-ple@<exact-version>
```

이 smoke는 local tarball path나 repository checkout이 아니라 actual public npm tarball을 받고, package descriptor가 pin한 S4의 actual public Runtime URL/asset을 사용해야 한다. Receipt는 exact npm version·`dist.integrity`, Runtime release ID/tag/archive SHA-256, isolated root/profile, outcome, 정상·실패 후 process-tree cleanup을 연결한다. Clean supported Mac의 quarantine·Gatekeeper·native execution, OAuth/setup wizard, `Semester Ready`, failure matrix의 정확한 pass/fail protocol은 Ticket 016이 소유한다. Ticket 015는 Ticket 014의 I2를 다시 열지 않고, 서로 다른 postpublication green receipt를 blocking input으로 삼는다.

Network·service transient 실패에서 registry/Runtime bytes가 그대로임을 authoritative readback한 후에는 같은 exact version으로 fresh isolated smoke를 재시도할 수 있다. Product/artifact defect로 판정되면 application draft를 unused로 표시하고 안전하게 delete한 뒤 `preview` tag를 제거하고 exact npm version을 deprecate한다. Runtime은 자체 validation이 여전히 green이고 defect와 무관할 때만 그 exact release를 다음 candidate에 reuse한다. Application release·Pages는 열지 않는다.

### `S8 APPLICATION_RELEASE_VERIFIED`

S2–S7 authoritative receipt chain을 `release-intent.json`·`publication-authorization.json` digest와 연결한 public `application-binding-ledger.json`으로 한 번 freeze한다. Ledger에는 source commit/tree, Runtime release/asset/attestation, npm version/tarball/provenance·credential retirement, exact public-smoke identity/result를 담고 자신을 싣을 application release의 미래 ID·attestation을 넣지 않는다.

Binding ledger, exact `prebinding-publication-receipts.jsonl`, candidate-declared final checksum·legal/SBOM/provenance sidecar를 S3 application draft에 upload한다. 그 뒤 **draft 전체 asset roster를 처음부터 다시** list/download하여 expected exact set, actual name, `state=uploaded`, bytes, GitHub digest, downloaded digest를 검증한다. `.tgz`와 descriptor/manifest, intent, authorization digest, prebinding receipt snapshot, binding ledger, 모든 sidecar 사이의 equality가 green이고 `starter`·rename·missing·extra·duplicate·self-reference가 0개일 때만 `draft=false`, `make_latest=false`로 publish한다.

Public get-by-tag의 same release ID/tag, `draft=false`, `immutable=true`, target tag commit을 확인한다. `gh release verify`와 모든 retained local asset의 `gh release verify-asset`, release attestation을 검증한 뒤 application activation receipt를 external journal에 append한다. Binding ledger asset을 application release 자신의 ID를 넣기 위해 다시 수정하지 않는다. Runtime/application release 모두 moving latest authority로 사용하지 않는다.

### `S9 PAGES_DEPLOYMENT_VERIFIED`

Landing deployment은 S8의 verified application activation receipt·immutable binding ledger를 읽는다. G-owned Pages assembler는 fixed S2 source의 G1 base display artifact와 S8 ledger만 입력으로 두 temp root에 output을 만들고 complete-tree·bytes identity를 비교한다. Base path/bytes는 G1에서 바뀌지 않고 declared `release/current.json`만 추가하며, sentinel은 `schemaVersion`, exact application version·tag/release URL, `sha256(application-binding-ledger.json)`을 담고 자신이나 Pages artifact의 미래 digest를 넣지 않는다. Equality가 green일 때 Pages artifact digest를 S9 receipt에 freeze한다.

Fixed S2 README는 exact command·application tag·fixed sentinel URL과 “이 sentinel이 같은 version·tag와 immutable ledger digest를 반환할 때만 supported”라는 조건만 가지며 public `main`에 presentation-only commit을 추가하지 않는다. Application/Runtime tag도 움직이지 않는다.

Pages는 branch push로 자동 배포하지 않는다. Protected application tag/ref의 manual custom workflow가 fixed S2 source와 public S8 ledger를 읽어 위 exact assembled artifact를 upload하고, deploy job은 protected `github-pages` environment, `pages: write`, `id-token: write`, build job `needs`를 사용한다. 이 단계에서 source·release value를 moving state로 재생성하지 않는다.

다음 조건이 모두 green이어야 한다.

- Pages deployment ID/SHA status가 `succeed`
- Pages site API가 `status=built`, `public=true`, expected `html_url`과 HTTPS state를 반환
- 실제 public HTTPS Landing response가 S9 Pages artifact의 expected display digest, `npx ay-ple@<exact>`, download·installed·free-space 값, repository/Docs/Privacy/Security/LICENSE/NOTICE link를 포함
- Public `release/current.json`이 exact application version·tag/release URL·binding-ledger SHA-256을 반환하고 application release에서 다운로드한 ledger bytes와 같음
- Placeholder, fixture version/size, `@latest`, bare command, stale rollback, missing trust link가 0개
- Public README의 exact command·application tag·sentinel URL이 Landing/sentinel의 version·tag와 같고, sentinel이 404·stale·mismatch이면 supported/current 아님

CDN 반영은 최대 10분 bounded poll한다. Workflow success만 있고 public body가 stale이면 `PAGES_PENDING_RECONCILIATION`이며 current가 아니다.

### `S10 CURRENT_PUBLIC_PREVIEW`

Projection은 immutable `prebinding-publication-receipts.jsonl`의 S2–S7 chain이 intent·authorization을, S8–S9 receipts가 intent·authorization·binding ledger를 가리키는 transitive digest chain을 검증한 뒤만 `current`가 된다. 첫 release에는 prior public pair가 없으므로 rollback command·`still-supported` older pair를 생성하지 않는다. Final evidence bundle은 `release-intent.json`, owner-only `publication-authorization.json`, immutable prebinding receipt snapshot, public binding ledger, post-binding receipts, `publication-projection.json`, external IDs, readbacks, tool versions, timestamps와 redacted logs를 보존하고 RC path가 사라져도 public bytes를 다시 검증할 수 있어야 한다.

## Retry와 partial failure reconciliation

모든 external operation은 `read-before-write → one write → read-after-write`를 따른다. Timeout이나 connection loss 뒤 같은 write를 바로 반복하지 않고 natural identity로 먼저 reconcile한다.

Npm GAT가 한 번이라도 주입된 branch는 아래 결과와 관계없이 S6 retirement barrier로 합류한다. Incident 정산 mutation이 필요하면 그 뒤 모든 사용 credential의 explicit auth rejection을 확인하고 나서야 retry·incident closure·다음 attempt로 이동한다.

| Failure point | 먼저 읽을 것 | 같은 candidate로 허용하는 resume | 금지·incident 처리 |
| --- | --- | --- | --- |
| Public source push ambiguous | remote exact ref·commit/tree | Expected commit/tree가 있으면 success로 reconcile, 없고 remote가 untouched임이 확인되면 같은 commit push | Force-push, published commit 교체 |
| Protected tag create ambiguous | Remote exact ref·ruleset | Expected tag가 exact public commit을 가리키면 success; absence가 확인되면 coordinator가 same tag create | Existing tag move/delete, bypass로 mismatch 덮기 |
| Application draft create ambiguous | Authenticated list-releases에서 exact tag/release ID | Exact draft가 candidate commit을 가리키면 그 ID로 resume | 같은 tag의 다른 release/commit을 delete·overwrite |
| Asset upload `502` | List-assets의 name/state/size/digest | Exact attempt가 만든 empty `starter`만 delete 후 same bytes retry | Uploaded unknown/mismatched asset 자동 삭제 |
| Asset upload `422` duplicate | Existing asset full readback | Name·size·digest·downloaded bytes가 exact면 success로 reconcile | Mismatch asset을 덮기 위한 blind delete/re-upload |
| Application draft staging mismatch | Release/asset ID, full asset list/download, npm version absence | Current attempt의 unpublished draft이고 G1 bytes가 그대로 보존됐음을 확인하면 draft 전체를 delete·recreate해 same bytes를 다시 검증. Candidate bytes가 바뀌면 새 attempt/version | Mismatched uploaded asset blind delete/replacement, `--clobber`, draft를 publish해 숨기기 |
| Runtime draft publish ambiguous | Public get-by-tag, authenticated release-by-ID | Exact immutable published release면 success; exact draft가 남아 있으면 bounded PATCH retry | Published release를 draft로 되돌리기, tag reuse |
| Runtime post-publish immutable/attestation/asset failure | Runtime release·asset·attestation·download bytes, public application tag·draft | 없음. Runtime을 `unusable`로 기록하고 현 attempt의 unpublished Runtime·application draft/starter만 승인 범위에서 safe cleanup; npm은 시작하지 않음 | Runtime asset/tag 수정·재사용. 새 Runtime binding으로 descriptor/package bytes가 바뀌면 이미 public인 application tag도 재사용하지 않고 새 release attempt·application version·tag로 시작 |
| CI reference rebuild mismatch | CI output·G1/application draft reference bytes, source SHA, generator/toolchain digest | 없음. npm write 0회, attempt incident 기록 | Draft reference를 CI output으로 덮어쓰기, provenance와 다른 local tarball publish; source/generator/bytes 변경 시 새 application identity |
| npm publish가 request body 전 명확히 실패 | `npm view ay-ple@<exact>`, GAT injection receipt | Version absence와 current GAT retirement을 확인하고 auth/precondition failure가 수정됐으면 fresh GAT로 user-authorized same tarball retry | 같은 GAT retry, version bump 없이 다른 tarball 사용 |
| npm publish response가 ambiguous | Exact `npm view`, registry tarball, provenance, GAT injection receipt | Exact version이 존재하고 모든 digest/provenance가 같으면 publish success로 reconcile하되 credential retirement 후에만 branch 완료 | Request body 전송 뒤 automatic republish; readback timeout을 absence로 단정; retirement 생략 |
| npm exact version exists but mismatch/provenance missing | Exact packument·tarball·attestation·application draft, GAT injection receipt | 없음. Version은 burned; 승인된 `preview` 제거·exact deprecate 후 사용한 모든 GAT를 retire하고 unused draft safe cleanup·incident closure | Unpublish 후 same version reuse, tarball replacement, application activation, retirement 생략 |
| npm token retirement ambiguous | Nonsecret token ID, delete response, exact-token `whoami`/`/-/whoami` response | Explicit invalid/unauthorized-token response면 response-loss success; 최대 1시간 bounded poll | Credential success·network·5xx·timeout만 보이면 `credential_retirement_reconciliation`; retry·incident closure·smoke/application release/Pages 진행 금지 |
| Dist-tag mutation ambiguous | `npm dist-tag ls` before/after | Expected mapping이면 success, 아니면 explicit add/rm을 한 번 재승인 | `--dry-run`이 보호한다고 가정; npm docs상 network dist-tag는 dry-run 대상이 아님 |
| Exact public smoke failure | npm/Runtime readback, Ticket 016 trace, process tree | External bytes가 exact하고 transient임이 분류되면 fresh isolated root에서 same exact command retry | Product/artifact defect이면 S1의 조건부 승인 범위에서 unused draft cleanup·`preview` 제거·exact deprecate; Runtime은 독립 gate green일 때만 retain/reuse |
| Application draft final upload/publish ambiguous | Authenticated release ID·full assets, public get-by-tag | Exact draft가 남았으면 asset set 전체를 재검증한 후 bounded resume; exact immutable release면 success | 다른 ledger/asset으로 덮기, app release 검증 없이 Pages 진행 |
| Application post-publish immutable/attestation/asset failure | Application release·asset·attestation·binding ledger | Application release는 `unusable`; npm `preview` 제거·exact deprecate 후 새 application version. Runtime은 독립 gate green이면 reuse | Asset/ledger 수정, 같은 application tag/version 재사용, Pages 진행 |
| Journal loss | Intent·authorization, immutable prebinding snapshot/ledger, 모든 external natural identity | Pre-S8은 full re-observation의 새 epoch, post-S8은 immutable snapshot 복원+새 post-binding epoch | Missing digest에 append, receipt bytes 없이 ledger green 합성; immutable input/snapshot을 복원할 수 없으면 `blocked_evidence_loss` |
| Pages deploy ambiguous | Deployment ID, fixed S2 source SHA·assembled artifact digest·current sentinel, site API, HTTPS body | Same artifact/source deployment가 succeed면 success; failed면 같은 artifact의 새 deployment를 별도 attempt로 기록 | Moving `main`에서 rebuild해 candidate bytes 변경, presentation-only source commit 추가 |
| Pages body mismatch | Deployment status + actual body | Bounded propagation readback 뒤에도 다르면 current를 합성하지 않음. 별도 withdrawal 승인으로 current deployment를 unpublish하고 exact same verified artifact를 redeploy할 수 있음 | GitHub/npm/Runtime artifact를 Pages 문제 때문에 삭제·변경 |

Blind automatic retry는 금지한다. Retry budget은 **authoritative readback이 remote state를 확정한 뒤 matrix가 명시적으로 허용한 proven-safe retry**, readback polling, 승인된 현 attempt의 unpublished application·Runtime draft/`starter` cleanup에만 둔다. 여기에는 verified empty `starter` upload retry, exact draft의 bounded publish PATCH retry와 same Pages artifact redeploy가 포함되며, identity가 불명확한 create/upload/publish 재호출은 포함되지 않는다. GitHub create의 secondary rate limit, npm propagation·token retirement, Pages deployment는 bounded backoff와 deadline을 기록한다. Deadline이 지나면 `blocked_reconciliation`이고 사람이 external state를 확인하기 전 새 candidate나 destructive action으로 넘어가지 않는다.

## Retain·yank·withdraw 계약

| Surface | Default incident action | 실제 의미 |
| --- | --- | --- |
| Immutable Runtime release | Retain하고 ledger에서 `unusable` 또는 `unreferenced`; 새 package/Landing이 pin하지 않음 | Asset을 고칠 수 없으며 tag도 재사용할 수 없다. Delete는 uncached exact launcher를 깨므로 security/legal emergency와 별도 사용자 승인에만 고려 |
| Immutable application release | Retain하고 `unusable`; GitHub latest authority로 사용하지 않음 | Descriptor sidecar와 tag/commit evidence를 보존한다. 새 application identity가 필요 |
| npm exact version | 모든 dist-tag가 이 version을 가리키지 않게 확인하고 exact version을 actionable message로 deprecate | Exact install은 계속 가능하지만 warning이 보인다. Byte/provenance는 고칠 수 없다 |
| npm unpublish | 정상 release recovery에서는 사용하지 않음 | Policy 조건과 별도 사용자 승인이 필요하고 irreversible하며 version은 영구 소진 |
| Pages | Wrong/stale public entrypoint이면 별도 사용자 승인 뒤 current deployment만 unpublish | Repository source와 settings는 남고 exact corrected deployment로 재개 가능 |

Yank는 Runtime cache의 remote kill switch가 아니다. 새 Landing/package가 해당 pair를 안내하지 않고 ledger에 사유를 남기는 publication operation이다. 이미 verified cache가 있는 사용자의 byte를 원격 삭제하지 않으며, missing Runtime asset에서 다른 cached version으로 자동 downgrade하지 않는다. First public release에는 이전 whole pair가 없으므로 rollback을 약속하지 않는다.

## 구현 acceptance

Ticket 015를 소비하는 `G0/P1` 구현은 최소 다음을 자동 판정해야 한다.

1. Fixed `G1` candidate가 아니거나 detached authorization의 intent digest·target·scope가 다르면 external write 0회로 실패한다.
2. Immutable prebinding receipt snapshot→intent/authorization→binding ledger→application activation/Pages receipt의 transitive digest chain을 검증하고, public source remote tree, Runtime/application immutable releases, GitHub asset digests·download bytes·release attestations, npm registry tarball/provenance, Pages public body를 같은 candidate identity로 연결한다.
3. Public remote tree에 Ticket 005 required set이 exact inclusion되고 camp/agent/internal hard-deny set은 0개이며, allowlist digest와 별개로 두 판정을 readback한다.
4. Source bundle→staging→local reference→CI rebuild→registry tarball의 workspace resource complete tree가 같고 ambient root `AGENTS.md`·`.agents/**`는 tarball root와 resource subtree 모두에서 기대 roster 밖 0개다.
5. npm descriptor = application release descriptor sidecar, npm canonical Runtime manifest = Runtime archive `manifest.json`, descriptor repository·release tag·asset name·URL·bytes/SHA = live GitHub release/list-assets/`browser_download_url`/download bytes가 new·reused Runtime 모두에서 exact하다.
6. Runtime archive extraction 전후와 GitHub download 뒤 Mach-O byte/mode/signature observed roster가 같고, actual signature status가 unknown이면 publication을 차단한다.
7. R2-owned Runtime component slice를 G가 read-only로 결합한 canonical roster 하나에서 `REDIST-01..12`, notices·original licenses·SBOM·provenance를 생성하고 artifact surface별 actual component set과 exact equality를 판정한다.
8. Published `package.json` dependency→`npm-shrinkwrap.json` registry `resolved`/`integrity`→isolated installed closure→SBOM이 exact set equality이고 bundler origin-input→`bundled_js` roster도 exact set equality이다.
9. GitHub draft의 `starter`·duplicate·rename, Runtime/application post-publish failure, CI reference mismatch, npm ambiguous success·mismatch·credential retirement ambiguity, pre/post-binding journal loss, Pages pending/stale를 scripted fake에서 재현하고 blind retry·missing-chain append 없이 위 reconciliation/block state로 수렴한다.
10. Publish credential 주입 전 protected application tag/ref의 `GITHUB_REPOSITORY`, `GITHUB_REF`, `GITHUB_SHA`, `GITHUB_WORKFLOW_SHA`가 expected repository·tag·S2 source/workflow commit과 exact match해야 한다.
11. GitHub-hosted CI가 exact S2 source에서 만든 tarball이 G1/application draft reference와 byte/roster equality일 때만 그 CI output을 non-latest tag·provenance로 publish한다. GAT를 주입한 모든 success/failure branch는 delete 후 exact-token auth rejection을 확인하며, 그 전에 retry·incident closure·public smoke로 가지 않는다. S7 guard는 `S5 green ∧ all injected GAT retired`이고 retirement-only failure branch는 S7로 승격하지 않는다.
12. Fixed source README는 exact command·public current-sentinel link를 conditional-current로만 표시하고 후속 presentation commit을 만들지 않는다. Pages assembler는 G1 base와 S8 ledger에서 exact `release/current.json`을 deterministic하게 추가하며, deployment·HTTPS Landing·sentinel·ledger equality가 모두 확인되기 전 `current`가 아니다.
13. Withdrawal path는 default retain, npm exact deprecate/dist-tag 제거, Pages unpublish를 분리하고 GitHub release delete·npm unpublish에는 별도 사용자 승인을 요구한다.

## 범위 밖

- General auto-update, moving channel, multi-platform release와 장기 version migration policy
- `.app`·`.dmg`, Developer ID/notarization 도입
- First release에 존재하지 않는 older public pair의 rollback UI
- npm의 newer staged publishing/trusted-publisher runtime으로 product prerequisite를 올리는 일
- GitHub/npm/Pages를 atomic transaction처럼 보이게 하는 별도 cloud release service

이 연구는 아직 version이 정해지지 않은 첫 public preview를 안전하게 한 번 게시하고 중간 failure에서 같은 candidate를 식별·재개하는 contract만 닫는다.
