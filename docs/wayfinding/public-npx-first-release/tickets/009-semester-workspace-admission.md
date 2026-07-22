# 009 — 첫 public release의 SemesterWorkspace schema·scaffold 경계를 정한다

## Wayfinder ticket

- Type: research
- State: resolved
- Blocked by: [첫 public preview의 성공 여정을 고정한다](004-first-public-preview-success-journey.md)

## Question

사용자가 학년·학기와 위치를 고르면 AY-PLE이 생성하는 정규화된 `SemesterWorkspace`에서 어떤 최소 directory seam, `WorkspaceManifest`, schema version, 학기·`Course` identity, app-owned state와 validation 결과를 canonical로 둘 것인가? Current v2 store가 이미 가진 stable workspace ID·Course identity와 새 `WorkspaceManifest`를 중복 authority로 두지 않으려면 하나의 versioned format으로 통합할지, 비중첩 physical format으로 나눌지와 bytes-preserving migration·failure를 어떻게 정할 것인가? 학년 1~4·1·2학기를 UI 기본값으로 제공하되 계절학기·초과학기를 schema로 막지 않고, 부분 생성·기존 빈 디렉터리·이미 생성된 workspace·상위 경로 충돌을 fail-closed하면서 deterministic scaffold·validation·migration 계약을 어떻게 정할 것인가? 기존 자료 폴더는 이 Ticket의 workspace admission이 아니라 후속 `ImportSource` migration 분기로 남긴다.

## Answer

상세 current evidence, 대안 비교와 failure matrix는 [SemesterWorkspace schema·scaffold 조사](../assets/semester-workspace-schema-scaffold-research.md)에 기록했다.

첫 normalized workspace는 current `.ay-ple/workspace-state.json` aggregate seam을 explicit `formatVersion: 3`으로 올린다. 한 aggregate 안에서 logical `WorkspaceManifest`가 opaque workspace ID, 학기 metadata와 zero-or-more Course identity·projection 관계를 단독 소유하고, dynamic state는 해당 ID를 reference할 뿐 다시 정의하지 않는다. Physical Manifest/state split은 장기 locality가 좋지만 첫 preview부터 version-pair·cross-file transaction과 recovery를 요구하므로 보류한다. 이 authority placement는 기존 정본인 [ADR 0014](../../../adr/0014-create-app-owned-normalized-semester-workspaces.md)에 반영했다.

사용자가 선택하는 위치는 existing canonical parent이며 App은 그 아래 non-existent child leaf 하나만 exclusive하게 생성한다. Existing empty/nonempty directory, symlink, 다른 workspace와 unowned partial tree는 adopt·overwrite·delete하지 않는다. Initial scaffold는 v3 aggregate와 empty `inbox/`·`courses/`를 만들고 aggregate를 마지막 durable authority로 no-clobber publish한다. 이후 reopen은 디렉터리의 영구적 emptiness가 아니라 controlled root의 presence·type과 aggregate를 fresh validation한다. Course와 `RawMaterial`은 없어도 된다.

`학년`은 `yearLevel`로 저장하고 UI의 1–4는 preset일 뿐 schema range가 아니다. Closed enum이 아닌 bounded term key·display name을 사용해 계절학기·초과학기를 format change 없이 표현한다. Calendar 학년도는 이번 setup input·schema 결정에 추가하지 않는다. Path·folder name·registry·validation receipt는 workspace identity가 아니다.

App-owned deep Module의 external Interface는 side-effect-free `inspect(intent)`와 `apply(authorityBoundPlan)` 두 operation으로 제한한다. Module이 create·open·owned resume·owned discard의 path canonicalization, ID 발급, exclusive create, schema codec, no-clobber publish와 fresh validation을 숨긴다. `ready-relaunch`의 valid committed reopen은 사용자 review를 요구하지 않고, mutation별 review policy는 Ticket 010이 정한다. Result는 `new_target`, explicit reopen의 `admitted`, same-request의 `already_ready`, 다른 valid target의 `workspace_exists`, `owned_incomplete`, `legacy_migration_required`, `collision`, `incompatible`, `unsafe/unavailable` 의미를 구분하며 admitted capability만 active `workspaceRoot`·native `cwd`가 될 수 있다. Exact type·copy·filesystem primitive는 resulting implementation spec이 고정한다.

App은 expected target·workspace ID·input digest를 app data에 먼저 기록하지만 그것만으로 root ownership을 증명하지 않는다. Exclusive `mkdir` 뒤 durable root marker 전 crash로 생긴 leaf는 unowned collision으로 보존해 manual recovery나 다른 target 선택을 요구한다. Resume·discard는 matching app-data transaction과 root marker가 모두 맞을 때만 가능하고, final aggregate destination은 matching owned artifact·expected digest가 아니면 절대 replace하지 않는다. Owned discard도 known file을 no-follow 재검증해 개별 제거하고 empty directory만 제거하며 recursive tree delete를 금지한다. 정상 committed workspace reopen은 app-data evidence 없이 v3 aggregate와 required seam의 fresh validation으로 성립한다.

Current v2는 normalized workspace나 `ImportSource`로 자동 승격하지 않는다. 모든 decoder-valid v2 serialization에 대해 first preview의 supported migration set을 비워 두고 original store·source bytes를 `legacy_migration_required/readOnly`로 보존한다. 후속 migration은 새 ID·reference rewrite 또는 durable source retirement·lineage 중 identity policy를 먼저 결정해야 하며 registry pointer만 바꾸면서 두 root에 같은 identity를 남기지 않는다. Source root는 자동 rewrite·delete하지 않는다.

이 판정으로 Ticket 010은 App-owned `inspect`·`apply`를 호출하는 Skill/script orchestration과 defaults를, Ticket 011은 matching setup evidence·registry·resume/discard와 process interruption을, Ticket 012는 Course-free admitted workspace의 Browser-safe 완료 경험을 각각 결정할 수 있다. Setup progress·registry와 `Semester Ready` composition은 이 ticket의 schema authority가 아니다.
