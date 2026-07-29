# skills.sh 설치형 Skill 생태계 조사

- 작성일: 2026-07-28
- 분류: 기술 참고
- 성숙도: 초안
- 조사 기준: `vercel-labs/skills` `main`의
  [`e173b8c88f2581cfdaa1b6767c6519a08155790e`](https://github.com/vercel-labs/skills/tree/e173b8c88f2581cfdaa1b6767c6519a08155790e),
  npm package `skills` 1.5.20
- 근거 정책: `skills.sh` 공식 문서, `vercel-labs/skills` source와 Skill publisher의 공식
  repository만 사용

## 현재 판정

`skills.sh`는 immutable package registry라기보다 공개 Skill을 찾아보는 directory이고, npm package
`skills`는 Git repository나 local directory에서 `SKILL.md` 묶음을 찾아 agent directory로 복사하거나
연결하는 설치 도구에 가깝다. 사이트도 자신을 public Skill을 색인하고 익명 설치 telemetry로 순위를
매기는 open directory라고 설명한다. 운영 주체는 Vercel이고, CLI package의 source repository는
`vercel-labs/skills`이다.
([skills.sh About](https://www.skills.sh/about),
[`package.json`](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/package.json#L1-L8),
[`package.json` repository metadata](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/package.json#L115-L124))

`skills-lock.json`은 Matt Pocock Skill bundle이 정의한 파일이 아니라 `skills` CLI가 project-scoped
설치 결과를 기록하는 파일이다. 다만 이름과 달리 현재 구현은 npm lockfile 같은 exact artifact pin이
아니다. source, optional branch/tag ref, Skill 경로와 설치 당시 content hash를 기록하지만 resolved
commit이나 package version은 기록하지 않는다. restore도 저장된 source/ref에서 다시 가져오기 때문에
mutable branch를 쓴다면 같은 파일 재현을 보장하지 않는다.
([project lock schema](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/local-lock.ts#L5-L59),
[`experimental_install`](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/install.ts#L9-L82))

따라서 생태계의 현재 관행은 “설치 후 절대 갱신하지 않는다”까지는 아니다. CLI는 `update`, `remove`,
project lock restore를 지원한다. 그러나 그 lifecycle은 source를 다시 fetch하고 덮어쓰는 수준이며,
Skill별 semantic version, release migration, consumer workspace data migration을 제공하는 체계는 아니다.
([CLI command surface](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/cli.ts#L105-L172),
[update implementation](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/update.ts#L285-L748),
[replace-on-install](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/installer.ts#L155-L170))

이 조사로 판정할 수 있는 범위는 여기까지다. 즉, `skills.sh` 호환성을 이유로 AY-PLE가 지금
package-manager 수준의 bundle versioning이나 workspace migration framework를 갖춰야 한다는 외부
요구는 확인되지 않았다. AY-PLE가 이를 실제로 유예할지, 언제 durable compatibility baseline을
세울지는 제품의 SemesterWorkspace 수명과 배포 약속을 근거로 별도 결정해야 한다.

## 관찰

### 1. skills.sh와 `skills` package의 역할

| 관찰 | 공식 근거 |
| --- | --- |
| `skills.sh`는 공개 Skill을 CLI telemetry로 색인하고 source repository, install count와 audit 결과를 보여주는 directory다. Skill 자체는 각 author가 유지한다. | [skills.sh About](https://www.skills.sh/about), [skills.sh FAQ](https://www.skills.sh/docs/faq) |
| npm package 이름은 `skills`, CLI binary도 `skills`이며 source repository는 `vercel-labs/skills`다. | [`package.json`](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/package.json#L1-L14), [`package.json` repository metadata](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/package.json#L115-L124) |
| Skill의 필수 형식은 `SKILL.md` frontmatter의 `name`과 `description`이다. 표준 필수 필드에 Skill version은 없다. | [`README.md`](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/README.md#L225-L228), [`README.md`](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/README.md#L330-L360), [`parseSkillMd`](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/skills.ts#L75-L127) |

이 구조에서 skills.sh는 distribution artifact를 보관하는 versioned registry가 아니라 discovery와
install telemetry layer다. 설치 가능한 source의 authority는 계속 원래 Git repository나 local
directory에 있다.

### 2. `npx skills add` 설치 semantics

`add`는 GitHub shorthand/URL, repository 안의 직접 경로, GitLab, 임의 Git URL과 local path를
source로 받는다. 여러 Skill이 발견되면 `--skill`로 고르고 `--agent`로 destination agent를 고른다.
project scope가 기본이고 `-g`가 global scope다.
([source formats and options](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/README.md#L28-L60),
[`runAdd` source resolution](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/add.ts#L1084-L1208))

설치 방식의 `Symlink`는 개발 source directory를 agent directory에 직접 연결한다는 뜻이 아니다.
구현은 먼저 canonical `.agents/skills/<skill-name>`에 source를 복사하고 agent별 경로가 다르면 그
canonical copy를 향하는 symlink를 만든다. `Copy` mode는 agent path로 직접 복사한다. 기존 destination은
먼저 지우고 다시 만들므로 재설치는 삭제되거나 이름이 바뀐 보조 파일까지 정리한다.
([documented installation methods](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/README.md#L90-L104),
[`getCanonicalSkillsDir`](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/installer.ts#L98-L149),
[`installSkillForAgent`](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/installer.ts#L265-L412))

Codex의 project Skill directory는 `.agents/skills`이고, CLI가 말하는 canonical project directory와
같다. 단일 Codex destination에서는 별도 symlink가 필요 없으므로 설치된 파일은 source의 live view가
아니라 copy다.
([Codex agent configuration](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/agents.ts#L203-L210),
[`add` install-mode selection](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/add.ts#L1497-L1567))

### 3. `skills-lock.json`의 생성 주체와 schema

project install이 성공하면 `add`가 현재 working directory의 `skills-lock.json`을 갱신한다.
CLI source는 이 파일을 version control에 넣는 project-scoped lock이라고 명시하고, timestamp를
의도적으로 넣지 않으며 Skill key를 정렬해 branch 간 merge conflict를 줄인다.
([lock definition and path](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/local-lock.ts#L5-L65),
[`writeLocalLock`](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/local-lock.ts#L94-L110),
[`add` project-lock write](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/add.ts#L1856-L1895))

현재 project lock schema version은 `1`이다.

| field | 의미 |
| --- | --- |
| `version` | lock schema version이다. Skill bundle version이 아니다. |
| `skills.<name>.source` | `owner/repo`, local path 등 설치 source다. |
| `sourceUrl?` | readable source로 normalize하기 전의 원격 URL이 필요한 경우 보존한다. |
| `ref?` | 설치에 사용한 branch 또는 tag다. |
| `sourceType` | `github`, `gitlab`, `git`, `local`, `node_modules` 같은 provider 종류다. |
| `skillPath?` | source repository 안의 해당 `SKILL.md` 경로다. |
| `computedHash` | Skill directory의 모든 상대 경로와 파일 내용을 합친 SHA-256이다. |
| `subagents?` | Eve 전용 설치 위치 복원을 위한 선택 정보다. |

Schema와 hash 계산은 CLI가 직접 소유한다.
([`LocalSkillLockEntry`](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/local-lock.ts#L8-L59),
[`computeSkillFolderHash`](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/local-lock.ts#L112-L156))

현재 repository의 [`skills-lock.json`](../../../skills-lock.json)은 이 v1 schema와 일치하고 각 entry의
`source`가 `mattpocock/skills`다. 즉 Matt repository는 설치 source이고, lock format과 생성
행위의 owner는 Vercel의 `skills` CLI다. 모든 entry에 `ref`가 없으므로 현재 lock은 Matt repository의
특정 release/tag를 고정하지 않고 update/reinstall 시점에 default branch를 다시 resolve한다.
([project update source resolution](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/update.ts#L497-L645),
[`cloneRepo` default/ref behavior](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/git.ts#L235-L246))

Global install은 별도의 `.skill-lock.json`을
`$XDG_STATE_HOME/skills/` 또는 `~/.agents/` 아래에 기록한다. 이 schema는 현재 version 3이며
GitHub tree SHA, `installedAt`, `updatedAt` 등을 포함한다. project `skills-lock.json`과 이름, 위치,
schema가 다르다.
([global lock schema and path](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/skill-lock.ts#L8-L73))

### 4. lock이 보장하는 것과 보장하지 않는 것

`computedHash`는 설치 당시 content를 식별하지만 restore input은 아니다. 현재 restore command인
`experimental_install`은 lock entry를 source별로 묶고 저장된 `source`, `sourceUrl`, `ref`,
`skillPath`로 다시 `runAdd`를 호출한다. 저장된 hash와 일치하는 artifact를 내려받거나 검증하는
단계는 없다. 또한 이 command는 canonical project location인 `.agents/skills/`만 복원하고
agent-specific directory는 복원하지 않는다.
([`runInstallFromLock`](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/install.ts#L9-L97))

`install`이라는 stable-looking command는 현재 restore command가 아니라 `add`의 alias다.
lock restore는 CLI help에서도 `experimental_install`로 노출된다.
([CLI help](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/cli.ts#L105-L145),
[command dispatch](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/cli.ts#L343-L365))

따라서 이 lock은 다음 용도에는 유효하다.

- 어떤 source에서 어떤 Skill을 설치했는지 provenance를 남긴다.
- branch/tag ref가 명시된 경우 같은 ref를 다시 사용한다.
- update/remove/experimental restore가 사용할 Skill 이름과 source 경로를 제공한다.
- 현재 파일이 설치 당시와 같은지 hash로 비교할 수 있는 정보를 남긴다.

반면 다음을 보장하지 않는다.

- source default branch의 resolved commit pin
- immutable artifact cache
- semantic version constraint와 dependency resolution
- Skill schema migration이나 SemesterWorkspace data migration
- mutable branch/tag에서 byte-for-byte 재현되는 fresh install

### 5. update, check, remove와 migration 지원

| 기능 | 현재 구현 | 한계 |
| --- | --- | --- |
| `update [skills...]` | project/global scope와 Skill 이름을 선택할 수 있다. global GitHub Skill은 upstream folder hash를 비교한 뒤 변경된 Skill을 `add`로 재설치한다. project Skill은 source와 저장된 ref에서 다시 가져와 해당 Skill을 덮어쓴다. | project update는 `local`과 `node_modules` source를 건너뛴다. `skillPath`가 없는 오래된 entry는 자동 갱신하지 못한다. 별도 semantic version 선택이나 migration hook은 없다. ([global update](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/update.ts#L285-L494), [project update](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/update.ts#L497-L688)) |
| `check` | current command dispatcher는 `check`, `update`, `upgrade`를 모두 같은 `runUpdate`로 보낸다. | 현재 main에서 `check`는 독립적인 read-only dry run이 아니다. update와 같은 재설치 경로를 실행할 수 있다. ([command dispatch](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/cli.ts#L389-L397), [`runUpdate`](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/update.ts#L691-L748)) |
| `remove` | project/global 및 agent별 installed path를 제거하고, 더 쓰는 agent가 없으면 canonical copy도 제거하며 해당 lock entry도 삭제한다. | uninstall lifecycle이지 사용자 workspace content migration은 아니다. ([`removeCommand`](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/remove.ts#L216-L305)) |
| lock schema migration | project lock reader와 global lock reader 모두 schema `version`을 검사한다. | 이전 version을 변환하는 migration은 없고 current보다 낮은 version은 empty lock으로 읽는다. global source는 이를 backwards-incompatible reset이라고 명시한다. ([project lock read](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/local-lock.ts#L68-L91), [global lock read](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/skill-lock.ts#L75-L103)) |

### 6. version pin의 실제 범위

CLI가 가진 version-like 입력은 repository `ref`다. shorthand에서는 `owner/repo#branch-or-tag`가
ref이고 `owner/repo@skill-name`의 `@...`는 version이 아니라 설치할 Skill selector다. ref는 lock에
저장되고 update/restore source를 다시 만들 때 유지된다.
([source parser fragment/ref](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/source-parser.ts#L203-L240),
[`@skill` parser](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/source-parser.ts#L394-L423),
[`formatSourceInput`](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/update-source.ts#L17-L22))

Matt 문서의 `npx skills@latest add ...`에서 `@latest`는 npm installer package `skills`의 version을
고르는 표기이며 설치 대상 Skill bundle의 version constraint가 아니다.
([Matt Pocock install command](https://github.com/mattpocock/skills/blob/2ab958093e83e0ec752e6c1c5932da465bf23e0c/README.md#L48-L70),
[`skills` npm package metadata](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/package.json#L1-L14))

Git clone 경로는 ref가 있으면 shallow clone의 `--branch <ref>`로 사용한다. 즉 branch 또는 tag를
따르는 기능이고 npm-style resolved version field는 아니다. 움직이지 않는 tag를 project가
운영 규칙으로 사용하면 사실상의 pin은 만들 수 있지만, CLI가 tag immutability나 resolved commit을
보장하는 것은 아니다.
([`cloneRepo`](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/git.ts#L235-L246))

### 7. local Skill edit와 개발 workflow

공식 CLI가 제공하는 가장 단순한 authoring 흐름은 `npx skills init [name]`으로 `SKILL.md` template을
만들고, local path를 `npx skills add ./my-local-skills`로 설치하는 것이다.
([`skills init`](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/README.md#L174-L182),
[local source](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/README.md#L28-L48))

설치된 canonical copy는 authoring source와 live-linked되지 않으므로 source를 수정한 뒤에는 같은
`skills add <local-path>`를 다시 실행해 덮어써야 한다. project lock에는 `sourceType: "local"`로
기록될 수 있지만 project `update`는 local source를 의도적으로 제외한다.
([copy/symlink implementation](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/installer.ts#L321-L412),
[project update filtering](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/update.ts#L225-L240))

Matt Pocock의 공식 repository도 두 설치 철학을 명시적으로 구분한다. Claude Code plugin은
managed read-only bundle로 자동 갱신하지만, `skills.sh` 경로는 project 안에 소유·편집할 일반
파일을 복사하고 사용자가 원할 때 `npx skills update`를 실행하는 흐름이다. 따라서 현재 hub의 Matt
Skill이 editable project copy와 `skills-lock.json`으로 존재하는 것은 Matt가 별도 lock format을
bundle한 결과가 아니라 Vercel CLI 설치 방식과 일치한다.
([Matt Pocock `skills` installation](https://github.com/mattpocock/skills/blob/2ab958093e83e0ec752e6c1c5932da465bf23e0c/README.md#L25-L70))

### 8. 이름 변경은 version update가 아니라 identity 변경이다

공식 형식에서 `name`은 unique identifier이고, CLI는 이를 설치 directory 이름과 lock의 map key로
사용한다. 현재 contract에는 rename alias나 이전 이름 migration field가 없다. 따라서 source의
`name`을 바꾸는 것은 같은 Skill의 content refresh라기보다 새 identity 설치에 가깝고, 기존 이름의
copy와 lock entry 정리는 별도 remove 또는 clean materialization이 맡아야 한다.
([required `name`](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/README.md#L327-L354),
[install directory derivation](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/installer.ts#L265-L300),
[project lock key](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/src/local-lock.ts#L158-L183))

## AY-PLE에 주는 제한적 시사점

| 조사 근거가 지지하는 해석 | 이 조사만으로 결정되지 않는 것 |
| --- | --- |
| `skills-lock.json`의 `version`은 AY-PLE Skill bundle version으로 해석할 수 없다. `computedHash`도 immutable artifact pin이나 restore 검증값은 아니다. | AY-PLE가 별도의 release manifest와 hash 검증을 언제 도입할지 |
| `skills.sh`의 project 흐름은 editable copy와 명시적 refresh를 정상 경로로 취급한다. `hub/skills/` 수정 후 disposable 개발 workspace를 다시 materialize하는 접근은 이 생태계와 모순되지 않는다. | 현재 bootstrap을 덮어쓰기, clean rebuild, migration 중 어느 정책으로 바꿀지 |
| 여러 Skill을 발견·설치할 catalog seam은 Skill bundle versioning이나 workspace migration과 별개의 문제다. | 단일 `ay-ple-first-assignment` bootstrap을 언제 어떤 roster/catalog로 일반화할지 |
| `name` 변경에는 stale identity 정리가 필요하지만, 그 사실만으로 multi-version migration engine이 필요해지지는 않는다. | `ay-ple-first-assignment`의 새 이름과 기존 개발 workspace 보존 여부 |
| 외부 fixture 경로는 `skills` ecosystem contract가 아니다. | `../fixtures/year-2-semester-1` 복사를 수동으로 둘지, 인자를 받는 local helper를 둘지 |

따라서 이 문서는 source catalog 확장과 release-grade lifecycle을 한 작업으로 묶어야 한다고 결론내리지
않는다. 또한 migration을 영구히 배제하지 않는다. durable SemesterWorkspace format이나 Skill 실행
계약이 compatibility promise가 되는 시점에는 현재의 copy/refresh 모델과 별개로 version baseline과
migration 요구를 다시 평가해야 한다.
