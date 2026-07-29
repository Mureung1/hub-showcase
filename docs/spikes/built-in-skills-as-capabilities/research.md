# Built-in Skill catalog를 agent capability surface로 사용하는 사례 조사

- 작성일: 2026-07-29
- 분류: 기술 참고
- 성숙도: 초안
- 조사 기준:
  - OpenClaw `main`
    [`206f989069fb7b5b3854fb490fc95e65c486b99b`](https://github.com/openclaw/openclaw/tree/206f989069fb7b5b3854fb490fc95e65c486b99b)
  - Hermes Agent `main`
    [`f228e145ba35cbbf785eded2021ae6682285b91b`](https://github.com/NousResearch/hermes-agent/tree/f228e145ba35cbbf785eded2021ae6682285b91b)
- 근거 정책: 각 제품의 공식 문서와 공식 GitHub repository의 README·source만 사용

## 현재 판정

OpenClaw와 Hermes Agent는 모두 **Skill catalog를 agent가 발견하고 필요할 때 읽는 절차
capability surface**로 사용한다. 새 `SKILL.md`를 catalog에 추가하면 이름·설명이 agent의 discovery
surface와 slash command에 나타나고, agent는 그 지침을 기존 tool과 조합할 수 있다. 이 범위에서는
App code나 native tool schema를 고치지 않고도 사용자가 체감하는 workflow capability를 빠르게
넓힐 수 있다.

그러나 두 제품 모두 Skill을 native execution capability와 동일시하지 않는다.

- OpenClaw의 공식 정의는 “Skills teach the agent how and when to use tools”이고, 구현도
  `name`·`description`·`location` catalog를 prompt에 넣은 뒤 `read` tool로 `SKILL.md`를 읽게 한다.
  별도의 OpenClaw “capability”는 typed core contract와 plugin registration surface를 뜻한다.
  ([공식 설명](https://github.com/openclaw/openclaw/blob/206f989069fb7b5b3854fb490fc95e65c486b99b/docs/tools/skills.md#L11-L15),
  [prompt formatter](https://github.com/openclaw/openclaw/blob/206f989069fb7b5b3854fb490fc95e65c486b99b/src/skills/loading/skill-contract.ts#L38-L64),
  [capability contributor guide](https://github.com/openclaw/openclaw/blob/206f989069fb7b5b3854fb490fc95e65c486b99b/docs/plugins/adding-capabilities.md#L18-L45))
- Hermes의 공식 authoring 문서는 Skills를 “새 capability를 추가하는 preferred way”라고 표현하지만,
  곧바로 **existing tool로 표현할 수 있으면 Skill**, auth·정확한 custom processing·binary·streaming이
  필요하면 Tool이라고 경계를 긋는다.
  ([공식 주장과 경계](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/website/docs/developer-guide/creating-skills.md#L7-L24))

이 조사에서 도출한 AY-PLE 적용 가설은 다음과 같다.

> 새로운 학업 workflow는 우선 built-in Skill로 제공하고, 기존 native tool과
> InteractionCapability로 완결되지 않는 사용자 맥락·typed 판단 UI·실행 primitive가 확인될 때만
> App Interface를 확장한다.

이 가설은 “Skill directory 하나가 곧 완성된 App feature”라는 뜻이 아니다. Skill은 workflow와
도구 조합을 소유하고, App은 typed interaction·UI lifecycle·runtime binding을 소유한다는
연구 해석이다. 채택된 현재 제품 원칙은
[Product Brief](../../product/ay-ple-product-brief.md#skill-first-capability-expansion),
workspace materialization 결정은
[ADR 0018](../../adr/0018-adopt-user-owned-git-semester-workspaces.md),
작업 상태와 adoption gate는
[개발 백로그](../../product/ay-ple-development-backlog.md)가 각각 소유한다.

## 근거를 읽는 방법

이 문서는 근거의 성격을 다음처럼 구분한다.

| 표기 | 의미 |
| --- | --- |
| 공식 주장 | 제품 문서가 Skill의 가치나 권장 사용법을 설명한 문장 |
| 구현 사실 | 조사 commit의 loader, prompt builder, command dispatch, install/update source가 실제로 하는 일 |
| AY-PLE 해석 | 위 근거를 현재 AY-PLE architecture에 적용한 판단이며 외부 제품이 보장하는 사실은 아님 |

## 비교 요약

| 질문 | OpenClaw | Hermes Agent |
| --- | --- | --- |
| bundled source | 설치 package의 `skills/`를 runtime이 직접 읽는다. | repository의 `skills/`를 install/update 때 profile의 `~/.hermes/skills/`로 복사한다. |
| 실행 authority | bundled copy와 여러 local root를 precedence로 merge한 effective entry다. Workspace `skills/`가 bundled보다 우선한다. | `~/.hermes/skills/`가 bundled·Hub·agent-created Skill이 공존하는 primary source of truth다. |
| discovery | 여러 root를 재귀 scan하고 eligibility·allowlist를 적용한 뒤 compact prompt catalog와 slash command를 만든다. | profile과 external dir를 scan하고 metadata index를 system prompt에 넣으며 `skills_list`·`skill_view`와 slash command를 제공한다. |
| Skill activation | agent는 prompt의 location을 보고 `read`로 본문을 읽는다. Slash 호출은 기본적으로 “이 Skill을 사용하라”는 user message로 바뀐다. | `skill_view` 또는 slash 호출이 본문을 읽어 turn message에 삽입한다. |
| tool 관계 | Skill은 기존 tool 사용법을 가르친다. `command-dispatch: tool`도 이미 registry에 있는 tool을 가리킨다. | Skill은 기존 `terminal`, `web_extract` 같은 tool과 helper script를 조합한다. 새 native tool은 registry·plugin·MCP가 제공한다. |
| bundled update | package-bundled directory를 직접 읽으므로 package 교체가 bundled catalog 교체다. Workspace override는 별도 파일로 남는다. | `.bundled_manifest`의 origin hash와 local hash를 비교해 unmodified copy만 갱신하고 user edit·deletion은 보존한다. |
| 외부 install/update | ClawHub는 version과 provenance를 추적하고 update한다. Git/local source는 재설치해야 한다. | Hub lock은 source와 content hash를 저장하고 upstream bundle hash 비교 뒤 재설치한다. |

## OpenClaw

### Discovery와 layout

#### 공식 주장

OpenClaw는 Skill을 tool 사용법을 가르치는 Markdown instruction으로 정의한다. Loading precedence는
workspace `skills/`, workspace `.agents/skills/`, personal `.agents/skills`, managed
`~/.openclaw/skills`, bundled, extra/plugin directories 순이다. 같은 `name`이면 높은 source가
이기고, root 아래 최대 6단계까지 `SKILL.md`를 찾는다. Directory path는 organization일 뿐
identity와 slash command는 frontmatter `name`이 정한다.
([loading order와 identity](https://github.com/openclaw/openclaw/blob/206f989069fb7b5b3854fb490fc95e65c486b99b/docs/tools/skills.md#L32-L61))

Plugin도 `openclaw.plugin.json`에 Skill directory를 선언할 수 있지만 plugin Skill은 extra
directory와 같은 낮은 precedence다. Plugin이 켜져 있을 때만 load되고 일반 Skill과 같은 eligibility
gate를 적용받는다.
([plugin Skill](https://github.com/openclaw/openclaw/blob/206f989069fb7b5b3854fb490fc95e65c486b99b/docs/tools/skills.md#L128-L140))

#### 구현 사실

OpenClaw package는 root `skills/`를 배포 file에 포함한다. Loader는 이 bundled root를 executable
sibling 또는 package root에서 찾고, extra → bundled → managed → personal
`.agents/skills` → project `.agents/skills` → workspace `skills` 순으로 같은 이름의 entry를
덮어쓴다. 즉 bundled Skill을 workspace로 seed하는 구조가 아니라 **shipped catalog를 직접 읽고
더 가까운 scope의 Skill로 override**하는 구조다.
([package file list](https://github.com/openclaw/openclaw/blob/206f989069fb7b5b3854fb490fc95e65c486b99b/package.json#L330-L343),
[bundled root resolution](https://github.com/openclaw/openclaw/blob/206f989069fb7b5b3854fb490fc95e65c486b99b/src/skills/loading/bundled-dir.ts#L37-L90),
[root load와 merge](https://github.com/openclaw/openclaw/blob/206f989069fb7b5b3854fb490fc95e65c486b99b/src/skills/loading/workspace.ts#L1181-L1274))

Eligibility를 통과한 Skill 가운데 model-visible entry는 `name`, `description`, `location`과
content-derived version을 가진 XML catalog로 prompt에 들어간다. Catalog 지침은 task가 description과
맞으면 `read` tool로 해당 file을 읽으라고 말한다. Full `SKILL.md` 본문을 모든 turn의 system
prompt에 미리 넣는 구조가 아니다.
([prompt catalog](https://github.com/openclaw/openclaw/blob/206f989069fb7b5b3854fb490fc95e65c486b99b/src/skills/loading/skill-contract.ts#L32-L64),
[eligibility와 snapshot](https://github.com/openclaw/openclaw/blob/206f989069fb7b5b3854fb490fc95e65c486b99b/src/skills/loading/workspace.ts#L1564-L1610))

이 catalog의 `<version>`은 `SKILL.md` content에서 계산한 prompt re-read marker이지 Skill의
semantic release version이 아니다. `name`은 merge, allowlist, slash command와 prompt identity에
사용되므로 stable slug로 다루는 편이 맞다. OpenClaw가 선택적으로 제공하는 `skillKey`는 config
identity를 display name에서 분리할 뿐 bundle release system은 아니다.
([prompt version](https://github.com/openclaw/openclaw/blob/206f989069fb7b5b3854fb490fc95e65c486b99b/src/skills/loading/skill-version.ts#L1-L6),
[name과 skillKey parsing](https://github.com/openclaw/openclaw/blob/206f989069fb7b5b3854fb490fc95e65c486b99b/src/skills/loading/frontmatter.ts#L193-L229))

### Install과 update

#### 공식 주장

`openclaw skills install`은 ClawHub, `skills-sh:` reference, Git repository와 local directory를
workspace `skills/`에 설치하고 `--global`이면 managed root에 설치한다. `update`는
ClawHub-tracked install만 갱신하며 Git/local source는 다시 설치해야 한다. ClawHub native install은
version을 선택할 수 있고, `skills-sh:` reference는 ClawHub가 exact synchronized GitHub commit으로
resolve한다.
([CLI semantics](https://github.com/openclaw/openclaw/blob/206f989069fb7b5b3854fb490fc95e65c486b99b/docs/cli/skills.md#L72-L92),
[version·update·trust details](https://github.com/openclaw/openclaw/blob/206f989069fb7b5b3854fb490fc95e65c486b99b/docs/cli/skills.md#L99-L131))

#### 구현 사실

ClawHub lock entry는 installed `version`, registry, owner, requested reference, artifact와 Skill
file hash, whole tree hash를 기록한다. Git/local install은 별도 origin metadata에 source spec과
resolved commit을 기록하되 ClawHub update 대상은 아니다.
([ClawHub lock schema](https://github.com/openclaw/openclaw/blob/206f989069fb7b5b3854fb490fc95e65c486b99b/src/skills/lifecycle/clawhub-store.ts#L19-L74),
[Git/local origin schema](https://github.com/openclaw/openclaw/blob/206f989069fb7b5b3854fb490fc95e65c486b99b/src/skills/lifecycle/source-install.ts#L23-L48))

이 lifecycle은 public registry와 shared installation을 위한 별도 subsystem이다. Bundled catalog의
일상 authoring model은 package source를 바꾸고 다음 package build/install에서 그 catalog를 직접
읽는 것이며, workspace가 같은 이름으로 override하면 그 local version이 계속 우선한다.

### Skill, Tool, Plugin, capability의 경계

#### 공식 주장

OpenClaw contributor 문서에서 `plugin`은 ownership boundary, `capability`는 shared core contract다.
새 capability는 typed core contract, plugin registration, shared runtime helper, vendor plugin과
contract test를 요구한다. 이는 `SKILL.md` catalog와 별도인 runtime extension 정의다.
([공식 capability model](https://github.com/openclaw/openclaw/blob/206f989069fb7b5b3854fb490fc95e65c486b99b/docs/plugins/adding-capabilities.md#L18-L55))

#### 구현 사실

일반 Skill slash command는 user input을 “Use the `<name>` skill for this request”로 바꿔 model이
catalog의 file을 읽고 따르게 한다. `command-dispatch: tool`을 선언한 특수 Skill만 model을 우회하지만,
그 경우에도 `command-tool`은 이미 만들어져 policy filtering을 통과한 registered tool이어야 한다.
Skill file이 tool handler나 schema를 자동 등록하지 않는다.
([command spec](https://github.com/openclaw/openclaw/blob/206f989069fb7b5b3854fb490fc95e65c486b99b/src/skills/discovery/command-specs.ts#L130-L181),
[slash rewrite와 registered-tool dispatch](https://github.com/openclaw/openclaw/blob/206f989069fb7b5b3854fb490fc95e65c486b99b/src/auto-reply/reply/get-reply-inline-actions.ts#L350-L468))

## Hermes Agent

### Discovery와 layout

#### 공식 주장

Hermes는 Skill을 on-demand knowledge document라고 부르고 `~/.hermes/skills/`를 primary source of
truth로 삼는다. Fresh install 때 bundled Skill을 repository에서 복사하며 Hub install과
agent-created Skill도 같은 tree에 들어간다. 외부 directory도 추가할 수 있다.
([Skills system](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/website/docs/user-guide/features/skills.md#L7-L13))

기본 profile은 bundled catalog로 seed되고 `hermes update`마다 새 bundled Skill을 받는다.
`.no-bundled-skills` marker로 seeding을 끌 수 있으며, `--remove`는 unmodified bundled copy만
지운다.
([blank-slate와 opt-out](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/website/docs/user-guide/features/skills.md#L20-L48))

Skill directory는 category 아래 `SKILL.md`, `references/`, `templates/`, `scripts/`, `examples/`,
`assets/`를 가질 수 있다. External Skill도 prompt index, `skills_list`, `skill_view`, slash command에
동일하게 나타나며 local name이 우선한다.
([directory와 external integration](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/website/docs/user-guide/features/skills.md#L283-L336))

#### 구현 사실

Hermes는 metadata-only `skills_list`, full content `skill_view`, linked-file `skill_view`의
progressive disclosure를 구현한다. System prompt에는 directory를 scan한 이름·설명 index와
`skill_view`로 load하라는 지침을 넣는다.
([공식 loading model](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/website/docs/user-guide/features/skills.md#L130-L140),
[prompt index 구현](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/agent/prompt_builder.py#L1514-L1617),
[prompt rendering](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/agent/prompt_builder.py#L1691-L1755))

Slash command는 Skill content와 absolute Skill directory, supporting-file hint를 turn message에
넣는다. Helper script는 별도 native tool이 되는 것이 아니라 agent가 기존 `terminal` tool로
실행한다.
([message construction](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/agent/skill_commands.py#L271-L371),
[slash invocation](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/agent/skill_commands.py#L569-L613))

### Bundled install과 update

#### 공식 주장

Bundled `skills/`는 install과 매 `hermes update`에 profile로 sync된다. `.bundled_manifest`는
Skill 이름별 origin content hash를 기록한다. Local copy가 origin과 같으면 upstream update를
적용하고, 다르면 user-modified로 보아 계속 보존한다. `reset`은 manifest baseline을 다시 잡고
`reset --restore`는 local copy를 지운 뒤 pristine bundled version을 복사한다.
([bundled update lifecycle](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/website/docs/user-guide/features/skills.md#L869-L904))

#### 구현 사실

Sync source는 이 규칙을 그대로 구현한다. New Skill은 복사하고, bundled source가 바뀌었지만 user
copy가 origin hash와 같을 때만 update하며, user edit·user deletion을 보존하고 upstream에서 사라진
entry는 manifest에서 정리한다.
([manifest contract](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/tools/skills_sync.py#L1-L22),
[sync decision](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/tools/skills_sync.py#L801-L921))

Hub install은 별도의 `skills/.hub/lock.json`에 source, identifier, trust, scan verdict, content hash와
install path를 기록한다. `check`는 같은 source에서 bundle을 다시 받아 hash를 비교하고 `update`는
changed Skill을 재설치한다.
([Hub lock](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/tools/skills_hub.py#L3402-L3473),
[update check](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/tools/skills_hub.py#L3705-L3797))

Hermes의 `SKILL.md` frontmatter에서 `version`은 optional metadata다. 실제 bundled sync와 Hub update
판정은 semantic version 비교가 아니라 각각 origin directory hash와 bundle content hash를 사용한다.
따라서 이 `version` 예시는 workspace data migration이나 release compatibility contract를 뜻하지
않는다.
([frontmatter contract](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/tools/skills_tool.py#L28-L46),
[bundled hash decision](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/tools/skills_sync.py#L836-L883),
[Hub hash decision](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/tools/skills_hub.py#L3784-L3795))

### Skill, Tool, Plugin, MCP의 경계

#### 공식 주장

Hermes는 instructions + shell + existing tools로 표현할 수 있는 capability에는 Skill을 권한다.
API key·auth flow·multi-component config, 항상 정확해야 하는 custom processing, binary·streaming·
real-time event에는 Tool을 권한다. Helper script도 existing `terminal`을 통해 실행하도록 안내한다.
([Skill 또는 Tool](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/website/docs/developer-guide/creating-skills.md#L9-L24),
[helper script execution](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/website/docs/developer-guide/creating-skills.md#L266-L301))

Built-in Tool은 handler·schema·registry registration을 갖고, custom Tool은 plugin route가 기본이다.
MCP server도 tool을 동적으로 등록한다. 즉 Skill content와 executable tool contract는 명시적으로
다른 extension seam이다.
([Tool authoring boundary](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/website/docs/developer-guide/adding-tools.md#L9-L34),
[built-in과 MCP tools](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/website/docs/reference/tools-reference.md#L7-L15))

Plugin은 tool handler와 schema를 registry에 연결하면서 namespaced read-only Skill도 함께 ship할 수
있다. 이 조합은 하나의 package가 runtime primitive와 그 사용 workflow를 함께 제공할 수 있음을
보여 주지만, 두 표면은 여전히 별도로 등록된다.
([plugin Skill과 Tool의 분리](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/website/docs/developer-guide/plugins/index.md#L360-L433))

### `hermes-agent-skill-authoring` meta-skill

#### 구현 artifact 사실

Hermes가 실제로 bundle하는
[`hermes-agent-skill-authoring`](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/skills/software-development/hermes-agent-skill-authoring/SKILL.md#L1-L27)은
Skill catalog 자체를 확장하는 agent workflow다.

| Meta-skill이 정한 경계 | 실제 지침 |
| --- | --- |
| Authoring 대상 | User-local Skill은 `~/.hermes/skills/`에 `skill_manage(action='create')`로 만들고, package와 함께 ship할 in-repo Skill은 `skills/<category>/<name>/`에 `write_file`로 만든 뒤 Git에 기록한다. Existing in-repo Skill의 작은 patch에는 `skill_manage`를 쓸 수 있지만 `create`는 repo tree를 대상으로 하지 않는다. ([source](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/skills/software-development/hermes-agent-skill-authoring/SKILL.md#L18-L27)) |
| Agent harness | Target category의 peer 2–3개 조사 → validator 확인 → `SKILL.md` 작성 → frontmatter·size local validation → `git add`와 commit 순서를 agent에게 지시한다. 즉 repository authoring discipline까지 Skill로 encode한다. ([source](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/skills/software-development/hermes-agent-skill-authoring/SKILL.md#L134-L155)) |
| Progressive extension | 항상 필요한 절차는 `SKILL.md`에 두고 branch-specific·bulky material은 `references/`, `templates/`, `scripts/`로 분리한다. Supporting-file write allowlist에는 `assets/`도 포함한다. ([source](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/skills/software-development/hermes-agent-skill-authoring/SKILL.md#L70-L83), [supporting files](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/skills/software-development/hermes-agent-skill-authoring/SKILL.md#L161-L166)) |
| Verification lifecycle | Current session의 discovery cache가 새 Skill을 catalog에 반영하지 않을 수 있으므로 fresh session에서 검증하라고 경고한다. Exact path의 `skill_view`는 file inspection escape hatch지만 current catalog refresh와 같지 않다. ([source](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/skills/software-development/hermes-agent-skill-authoring/SKILL.md#L154-L155), [pitfall](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/skills/software-development/hermes-agent-skill-authoring/SKILL.md#L182-L185)) |

이 artifact는 “built-in Skill 추가”가 수동 Markdown 작성만이 아니라 peer convention, validation과
Git checkpoint까지 포함한 repeatable agent capability가 될 수 있다는 직접 근거다. 다만 meta-skill
자체의 trigger는 사용자가 branch·repo에 Skill 추가를 요청한 경우다. Hermes 전체 prompt가 어려운
작업 뒤 Skill 저장·수정을 권하는 broader self-improvement posture와 이 명시적 authoring workflow를
같은 사실로 섞어서는 안 된다.
([meta-skill trigger](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/skills/software-development/hermes-agent-skill-authoring/SKILL.md#L23-L27),
[broader prompt posture](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/agent/prompt_builder.py#L1755-L1758))

#### AY-PLE 해석

다음은 Hermes가 보장하는 사실이 아니라 현재 AY-PLE에 대한 채택 판단이다. 이 meta-skill은 지금
SemesterWorkspace의 default built-in으로 설치하지 않고 future developer/Skill-authoring reference로
이 spike에 보존한다. Catalog authoring이 반복 병목이 될 때 maintainer가 명시적으로 호출하는
repo-scoped Skill로 재검토할 수는 있다. 그러나 resident agent가 사용 중인 학업 Skill을 스스로
계속 생성·수정하는 self-evolving posture, implicit repository write와 autonomous commit은 가져오지
않는다. AY-PLE의 built-in source 변경은 계속 explicit maintainer intent, validation, review와 Git
checkpoint를 거쳐야 한다.

## Skill 추가가 product capability를 넓히는 정확한 범위

| 변경 | 즉시 넓어지는 것 | 자동으로 생기지 않는 것 |
| --- | --- | --- |
| 새 instruction-only Skill | 발견 가능한 task vocabulary, 권장 절차, 검증 기준, 기존 tool 조합 | 새 API, auth, deterministic handler, typed UI |
| Skill에 reference·template 추가 | 더 깊은 domain knowledge와 일관된 output shape | runtime contract와 App state |
| Skill에 helper script 추가 | 기존 shell/terminal을 통한 reusable executable procedure | native tool schema, 별도 sandbox·approval 의미 |
| Skill이 existing typed tool을 사용 | 새 workflow에서 기존 App/tool primitive를 재사용하는 product capability | 그 tool이 지원하지 않는 새 request/result 의미 |
| 새 Tool·MCP·App capability 추가 | 새 typed operation, auth/transport/runtime behavior | 언제·왜 사용할지에 대한 좋은 학업 workflow |
| Tool과 companion Skill을 함께 추가 | runtime primitive와 사용 절차를 함께 제공 | 두 경계가 하나의 contract가 되는 것 |

따라서 “capability expansion”은 두 의미로 나눠야 한다.

1. **Agent workflow capability expansion**: 기존 primitive를 새 방식으로 조합할 수 있게 하는
   Skill catalog의 확장이다.
2. **Runtime/App capability expansion**: 이전에는 표현할 수 없던 typed operation이나 UI round
   trip을 Tool·MCP·App Interface에 추가하는 일이다.

OpenClaw와 Hermes의 built-in catalog는 1번을 빠르고 싸게 반복하는 제품 표면이다. 2번은 Skill의
존재가 아니라 실제 runtime gap이 증명할 때만 필요하다.

## AY-PLE 적용 후보와 채택 문서

아래 항목은 외부 사례에서 도출한 추천안이다. 현재 정책이나 구현 상태를 독립적으로 정의하지
않으며, 각 항목에 연결한 활성 문서의 채택 결과를 우선한다.

### 1. Skill-first Capability Expansion 후보

AY-PLE capability를 다음 세 단계로 분류하는 방식을 추천할 수 있다.

| 단계 | 판정 | 기본 구현 |
| --- | --- | --- |
| Skill-only | 일반 file·Git·native tool로 workflow가 완결된다. | `hub/skills/<skill>/` complete tree |
| Skill + existing App primitive | 기존 ActionInvocation 또는 InteractionCapability가 필요한 판단 UI를 이미 표현한다. | Skill이 기존 typed Interface를 호출 |
| New App surface | 새로운 request/result 의미, UI lifecycle, auth·transport·runtime primitive가 필수다. | capability contract를 먼저 설계하고 companion Skill을 추가 |

조사 당시 First Assignment workflow는 두 번째 단계의 사례로 해석했다. Skill은 source reading, proposal, drift
check, accepted apply와 Git checkpoint 순서를 소유하고 App은 domain-neutral semantic Review의
typed round trip만 소유한다. 이 책임 분리는
[AY-originated InteractionCapability 아키텍처](../../architecture/ay-app-interaction-capabilities.md)의
경계와 맞는다는 분석이었다. 현재 product vocabulary와 구현 상태는
[AY–App Interaction Layer](../../architecture/ay-app-interaction-layer.md)와
[Codex Chat 구현 지도](../../architecture/codex-chat-implementation-map.md)를 따른다.

### 2. Catalog discovery와 workspace materialization 분리 제안

`hub/skills/`의 직계 Skill directory를 repository-owned authoring catalog로 보고 Bootstrap이
유효한 complete tree를 generic하게 열거해 SemesterWorkspace `.agents/skills/`로 복사하는 구조를
추천했다. Bootstrap과 catalog discovery가 특정 `ay-ple-first-assignment` 하나를 hard-code하지 않고,
concrete ActionInvocation definition만 stable `skillId`를 참조할 수 있다는 구분이다. 현재 채택된
catalog validation·materialization contract는
[ADR 0018](../../adr/0018-adopt-user-owned-git-semester-workspaces.md)과
[ADR 0020](../../adr/0020-bootstrap-semester-workspaces-before-app-startup.md)이 소유한다.

이렇게 하면 새 Skill 추가는 catalog entry 추가로 끝나고 Bootstrap code는 바뀌지 않는다.
Workspace copy는 실제 native discovery와 Git review의 authority로 남는다. OpenClaw의 multi-root
precedence나 Hermes의 shared profile SSOT를 그대로 가져올 필요는 없다.

### 3. 개발 중 disposable workspace의 fresh materialization 후보

현재 사용자가 혼자 개발하고 `../fixtures/year-2-semester-1`을 disposable fixture로 쓰는 동안에는
다음 loop가 가장 단순하다는 제안을 도출했다.

1. `hub/skills/`에서 Skill을 수정·추가한다.
2. 필요한 fixture file을 개발 SemesterWorkspace에 복사한다.
3. Disposable SemesterWorkspace를 다시 만들고 `semester-workspace-init`으로 built-in catalog
   complete tree를 fresh materialize한다.
4. Workspace Git diff로 실제 적용된 Skill byte와 fixture 상태를 검토한다.

이는 OpenClaw의 package source + local override 방식보다 당시 AY-PLE의 disposable development
workspace에 맞고 Hermes의 manifest sync보다 단순하다는 분석이다. Existing workspace conflict와
update lifecycle에 대한 현재 결정은 [ADR 0018](../../adr/0018-adopt-user-owned-git-semester-workspaces.md),
current development flow와 후속 adoption gate는
[개발 백로그](../../product/ay-ple-development-backlog.md)가 소유한다.
반복 수작업이 실제 병목으로 확인되면 그때 source·destination을 명시적 argument로 받는 local-only
helper를 추가할 수 있다.

### 4. Scenario보다 지속되는 workflow capability를 나타내는 이름 제안

`ay-ple-first-assignment`는 fixture와 demo 순서를 identity에 넣었다. Catalog 확장을 가정하면
`semester modeling`, `assignment planning`, `source organization`처럼 학기 동안 반복되는 workflow
단위의 stable slug가 더 낫다는 제안이었다. 채택된 `SemesterModeling`,
`ay-ple-semester-modeling`, `model_semester` 구분과 rename 결과는
[ADR 0021](../../adr/0021-adopt-a-protocol-driven-ay-app-interaction-layer.md)이 소유한다.

이 구분은 두 사례에도 나타난다. OpenClaw은 directory path를 organization으로만 취급하고
frontmatter `name`을 slash command와 allowlist identity로 사용한다. Hermes도 같은 `name`을 manifest
key로 유지한 채 upstream directory recategorization을 복구한다. 즉 **content와 path는 갱신 가능하지만
logical name은 참조가 걸리는 identity**다.
([OpenClaw identity](https://github.com/openclaw/openclaw/blob/206f989069fb7b5b3854fb490fc95e65c486b99b/docs/tools/skills.md#L46-L56),
[Hermes move recovery](https://github.com/NousResearch/hermes-agent/blob/f228e145ba35cbbf785eded2021ae6682285b91b/tools/skills_sync.py#L756-L772))

### 5. App 확장 gate 후보

다음 조건은 새 App surface를 검토할 때 사용할 수 있는 연구 기반 후보다. 현재 확장 원칙은
[Product Brief](../../product/ay-ple-product-brief.md#skill-first-capability-expansion),
작업 순서는 [개발 백로그](../../product/ay-ple-development-backlog.md)를 따른다.

- 기존 InteractionCapability로 표현할 수 없는 새 사용자 결정 의미가 반복된다.
- native tool 조합만으로는 auth, lifecycle, deterministic validation 또는 binary/streaming 처리를
  안전하게 제공할 수 없다.
- 여러 Skill이 같은 typed operation을 중복 구현하기 시작한다.
- capability-specific UI가 일반 chat보다 명확한 사용자 가치와 failure semantics를 제공한다.

## 조사에서 비교한 비채택 후보

| 사례의 구조 | 조사 당시 곧바로 적용할 필요가 낮다고 본 이유 |
| --- | --- |
| OpenClaw의 workspace·project·personal·managed·bundled·extra·node multi-root precedence | AY-PLE는 한 SemesterWorkspace의 tracked `.agents/skills/`를 실행 authority로 두면 충분하다. 복수 root는 collision과 “어느 byte를 썼는가”를 흐린다. |
| OpenClaw ClawHub의 registry version, trust envelope, scan, global install | Public marketplace와 여러 publisher를 운영하지 않는다. |
| Hermes의 mutable shared `~/.hermes/skills/` SSOT와 agent self-edit | SemesterWorkspace Git review와 repository-owned built-in source 경계를 약화한다. |
| Hermes `.bundled_manifest` origin-hash merge와 Hub lock | Disposable development에서는 explicit rematerialization과 Git diff가 같은 문제를 더 단순하게 풀 수 있다. |
| Skill metadata에 product domain schema를 넣고 App이 해석하는 방식 | Skill과 App을 다시 이름·field에 coupling한다. App은 typed generic Interface만 알아야 한다. |
| Skill 추가 수를 feature 완료 수로 계산 | 실제 user outcome, tool availability, review UI와 end-to-end verification이 없으면 catalog entry일 뿐이다. |

## 결론

OpenClaw와 Hermes는 서로 다른 lifecycle을 쓰지만 같은 architectural lesson을 준다. Built-in Skill
catalog는 **기존 primitive 위에 새 agent workflow capability를 얹는 저비용 확장면**이고, Tool·MCP·
새 Runtime·App Interface는 **새 runtime primitive와 typed interaction을 만드는 고비용 확장면**이다.

따라서 이 조사는 AY-PLE이 전자를 우선 활용하고 `hub/skills/`를 generic catalog 후보로 두며,
새 학업 workflow를 Skill로 추가하는 방향을 추천했다. 실제로 채택한 catalog·workspace·update
경계는 [ADR 0018](../../adr/0018-adopt-user-owned-git-semester-workspaces.md)과
[ADR 0020](../../adr/0020-bootstrap-semester-workspaces-before-app-startup.md), capability 확장 원칙은
[Product Brief](../../product/ay-ple-product-brief.md#skill-first-capability-expansion), 현재 구현과
후속 작업은 [개발 백로그](../../product/ay-ple-development-backlog.md)를 기준으로 판단한다.
