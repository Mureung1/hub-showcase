# Issue Tracker

이 저장소의 Matt Pocock spec, implementation ticket, Wayfinder 산출물은 기본적으로 local Markdown으로 관리한다. GitHub Issues는 사용자가 GitHub 게시를 명시적으로 요청하고 대상 저장소 또는 request surface를 확인한 경우에만 사용한다. Pull Request도 제한적인 request·triage surface로만 취급한다.

정상 작업은 `main`이나 두 `N180_하성욱` 브랜치가 아니라 `codex/...` working branch에서 진행한다. 기본 이름은 현재 캠프 일차를 나타내는 `codex/w<week>d<day>`이며, 명시적으로 고른 `codex/<work>`도 동일한 working branch다. 별도의 merge 계층을 뜻하지 않는다.

## 저장소와 브랜치 mapping

| 역할 | GitHub 저장소와 브랜치 | Local Git ref | 용도 |
| --- | --- | --- | --- |
| Working branch | `swh3467/hub`의 `codex/w1d4` 또는 `codex/<work>` | `codex/...`, 게시 후 `fork/codex/...` | 구현, 문서, spike 작업 |
| Prototype evidence | `swh3467/hub`의 `prototype/<slug>` | `prototype/...`, 필요시 `fork/prototype/...` | prototype primary source 보존; `/camp-pr` 통합 대상 아님 |
| Fork integration | `swh3467/hub`의 `N180_하성욱` | `fork/N180_하성욱` | 완료한 working branch를 모으는 개인 통합 브랜치 |
| Upstream target | `connect-AIAgentChallenge-26-1/hub`의 `N180_하성욱` | `origin/N180_하성욱` | 캠프 제출을 받는 최종 브랜치 |

PR에서 `base`는 변경을 받는 destination branch이고, `head`는 변경을 담은 source branch다.

## 권한

현재 contributor가 label 생성·적용, upstream push, repository 관리 권한을 가진다고 가정하지 않는다. GitHub write가 권한 때문에 실패하면 명확한 PR/issue comment 또는 local summary를 남긴다.

## Pull Request 운영

PR을 request surface로 사용하는 범위는 외부 PR 또는 사용자가 triage 대상으로 명시한 PR로 제한한다.

이 participant의 collaborator in-flight PR은 triage input이 아니라 review artifact다. 해당 작업은 source spec, implementation ticket, Wayfinder ticket, agent brief, spike report, handoff document 중 실제 정본에 연결한다. camp submission template을 일반 work PR body에 강제로 적용하지 않는다.

PR 흐름은 아래 두 단계뿐이며 `/camp-pr`가 모두 소유한다.

| 목적 | PR 저장소 | Base | Head |
| --- | --- | --- | --- |
| Working branch integration | `swh3467/hub` | `N180_하성욱` | 현재 `codex/...` working branch |
| Upstream camp submission | `connect-AIAgentChallenge-26-1/hub` | `N180_하성욱` | `swh3467:N180_하성욱` |

Daily branch 이름은 캠프 week/day 정체성을 유지한다. Camp label은 upstream submission metadata이며 fork-local integration PR에 복사하거나 새 branch 계층으로 해석하지 않는다.

Fork integration 상태는 `fork/N180_하성욱`, upstream target 상태는 fetch한 `origin/N180_하성욱`를 기준으로 판단한다. 오래된 local `N180_하성욱` checkout으로 readiness를 계산하지 않는다.

PR을 triage할 때는 body, comments, diff를 함께 읽는다. CLI를 사용할 수 있으면 `gh pr view <number> --comments`와 `gh pr diff <number>`를 사용한다.

`.github/workflows/auto-merge.yml`은 template에서 제공됐지만 이 저장소에서 활성 상태다. 이 workflow는 `main` 대상 PR을 건너뛰고, GitHub `review` label이 붙은 PR을 건너뛰며, changes-requested PR을 보류하고 conflict PR을 닫을 수 있다. GitHub `review` label은 auto-merge control이며 agent triage state가 아니다.

`.github/pull_request_template.md`는 upstream camp submission PR에만 사용한다. `/camp-pr`는 fork-local integration PR을 간결한 work brief로 작성·병합하고 upstream readiness를 보고한다. Upstream submission PR 생성·갱신은 사용자가 camp 제출을 명시적으로 요청한 경우에만 수행하고, 병합은 별도의 명시적 요청이 있을 때만 수행한다.

## Local Matt artifact mapping

`docs/prds/`라는 directory 이름은 기존 link 호환을 위해 유지한다. 새 파일의 의미는 `/to-spec`이 만드는 spec이다.

| 산출물 | 기본 경로 | 생성 시 상태 | 다음 actor |
| --- | --- | --- | --- |
| Spec | `docs/prds/YYYY-MM-DD-<slug>.md` | `draft` 또는 `ready-for-ticketing` | `/grill-with-docs`, `/wayfinder`, `/to-tickets`, 또는 user |
| Implementation ticket | `docs/issues/<spec-slug>/NNN-<slug>.md` | `ready-for-agent` | `/implement` |
| Wayfinder map | `docs/wayfinding/<effort>/map.md` | `active` | `/wayfinder` |
| Wayfinder decision ticket | `docs/wayfinding/<effort>/tickets/NNN-<slug>.md` | `open` | `/wayfinder` |
| Wayfinder evidence asset | `docs/wayfinding/<effort>/assets/<name>` | 해당 없음 | owning Wayfinder ticket에서 link |

이 local 산출물은 upstream camp-visible GitHub noise를 만들지 않으며 `.github/pull_request_template.md`를 사용하지 않는다.

## Local reference 표현

- Local Markdown path는 그 정확한 local artifact를 뜻한다.
- URL은 그 정확한 remote artifact를 뜻한다.
- Bare number는 사용자가 GitHub와 대상 repository 또는 request surface를 명시하지 않는 한 GitHub issue나 PR로 해석하지 않는다.
- Local blocking reference는 bare number만 쓰지 않고 정확한 relative path와 읽을 수 있는 title을 함께 쓴다.
- Implementation spec·ticket의 state는 `## Agent triage` 아래 `State:`에 기록한다.
- Wayfinder map·ticket의 metadata 위치와 형태는 `.agents/skills/wayfinder/SKILL.md`를 따른다.

## Lifecycle 소유권

이 문서는 repository-specific path, local reference 표현, remote/branch mapping만 소유한다. Generic lifecycle을 중복 정의하지 않는다.

| 계약 | 정본 skill |
| --- | --- |
| Spec readiness와 spec 작성 후 source Wayfinder map reconciliation | `.agents/skills/to-spec/SKILL.md` |
| Ticket graph, blocking edge, initial frontier와 실행 gate | `.agents/skills/to-tickets/SKILL.md` |
| Wayfinder state vocabulary, map의 `ready-for-spec` 판정, ticket claim·resolve | `.agents/skills/wayfinder/SKILL.md` |
| Implementation claim, verification, ticket·parent spec closeout와 final commit | `.agents/skills/implement/SKILL.md` |

이 문서와 skill의 generic lifecycle 설명이 충돌하면 위 정본 skill을 따른다. Tracker-specific path나 GitHub repository mapping이 충돌하면 이 문서를 따른다.

## Local Matt artifact closeout

별도의 completion document를 만들지 않고 기존 local artifact를 갱신한다.

- Implementation ticket과 parent spec closeout은 `/implement`가 수행한다. 상세 gate와 기록 형식은 해당 skill을 따른다.
- Wayfinder map의 상태 전이와 resulting spec link는 `/wayfinder`와 `/to-spec`의 정본 규칙을 따른다.

완료 기록은 무엇을 구현하거나 결정했는지 보존한다. 현재 동작의 source of truth는 primary architecture document와 current code/tests다.

## Skill이 “publish to the issue tracker”라고 할 때

`/to-spec`, `/to-tickets`, `/wayfinder`는 위 mapping에 따라 local Markdown을 작성한다. 사용자가 GitHub 게시를 명시적으로 요청하고 대상 repository 또는 request surface를 확인하지 않은 경우 GitHub Issues를 만들지 않는다.

다른 skill의 내부 planning artifact도 local Markdown을 우선한다. GitHub write가 명시적으로 요청됐지만 불가능하면 `docs/agents/triage-labels.md`의 marker 형식을 사용해 관련 PR body, PR comment 또는 local summary에 남긴다.

## Skill이 “fetch the relevant ticket”이라고 할 때

Internal work PR에서는 PR body보다 연결된 local spec, implementation ticket, Wayfinder artifact, agent brief, spike report, handoff document 또는 다른 owning source를 먼저 읽는다.

사용자가 GitHub를 명시하고 bare number를 전달한 경우 GitHub issue와 PR이 같은 number space를 공유함을 기억한다. 사용자가 지정한 surface를 먼저 조회하고 필요한 comments와 diff를 함께 확인한다.
