# Issue Tracker

Matt Pocock specs, implementation tickets, and Wayfinder artifacts for this repo live in local Markdown by default. GitHub Issues are used only when the user explicitly requests GitHub publication and confirms the target repository or request surface. Pull requests are also a limited request and triage surface.

This repo is PR-based, but normal work happens on a `codex/...` branch rather than `main` or either `N180_하성욱` branch. The default name is the current camp day, `codex/w<week>d<day>`, such as `codex/w1d4`. An explicitly chosen `codex/<work>` name is still just a working branch; it does not introduce another required merge level.

| Role | GitHub repository and branch | Local Git ref | Purpose |
| --- | --- | --- | --- |
| Working branch | `swh3467/hub`의 `codex/w1d4` 또는 `codex/<work>` | `codex/...`, 게시 후 `fork/codex/...` | 구현, 문서, spike 작업 |
| Prototype evidence | `swh3467/hub`의 `prototype/<slug>` | `prototype/...`, 필요시 `fork/prototype/...` | prototype primary source 보존; `/camp-pr` 통합 대상 아님 |
| Fork integration | `swh3467/hub`의 `N180_하성욱` | `fork/N180_하성욱` | 완료한 working branch를 모으는 개인 통합 브랜치 |
| Upstream target | `connect-AIAgentChallenge-26-1/hub`의 `N180_하성욱` | `origin/N180_하성욱` | 캠프 제출을 받는 최종 브랜치 |

For PRs, `base` is the destination branch that receives changes, and `head` is the source branch that contains the changes.

## Permissions

Do not assume the current contributor can create labels, apply labels, push to the upstream repo, or administer the repository. If a GitHub write operation fails because of permissions, leave a clear PR/issue comment or local summary instead.

## Pull Requests

PRs as a request surface: yes, limited to external PRs or PRs explicitly named for triage.

Collaborator in-flight PRs for this participant are review artifacts, not triage input. For those PRs, connect the work to the source spec, implementation ticket, Wayfinder ticket, agent brief, spike report, or handoff document rather than forcing the camp submission template into the PR body.

PR 흐름은 두 단계뿐이다. `/camp-pr`가 두 단계를 모두 소유한다.

| Purpose | PR repository | Base | Head |
| --- | --- | --- | --- |
| Working branch integration | `swh3467/hub` | `N180_하성욱` | 현재 `codex/...` working branch |
| Upstream camp submission | `connect-AIAgentChallenge-26-1/hub` | `N180_하성욱` | `swh3467:N180_하성욱` |

Daily branch names keep the camp week/day identity. Camp labels are upstream submission metadata and do not create another branch level or need to be copied to fork-local integration PRs.

Use `fork/N180_하성욱` as the source of truth for the fork integration branch and `origin/N180_하성욱` as the fetched upstream target. Do not calculate readiness from a stale local `N180_하성욱` checkout.

When triaging PRs, read the PR body, comments, and diff. Use `gh pr view <number> --comments` and `gh pr diff <number>` when the CLI is available.

The workflow `.github/workflows/auto-merge.yml` is template-provided but active in the repo. It attempts scheduled PR merges, skips PRs targeting `main`, skips PRs with the GitHub `review` label, defers changes-requested PRs, and closes conflicting PRs. Treat the GitHub `review` label as an auto-merge control, not as an agent triage state.

The PR template in `.github/pull_request_template.md` is only for the upstream camp submission PR. `/camp-pr` writes and merges the fork-local integration PR with a concise work brief, then reports upstream readiness. It creates or updates the upstream submission PR only when the user explicitly asks to submit to camp, and merges that PR only on a separate explicit merge request. Matt Pocock skill templates remain spec, ticket, Wayfinder, agent brief, and review artifact shapes rather than GitHub PR templates.

## Local Matt artifacts

The `docs/prds/` directory name is retained for compatibility with existing links. New files in it are semantically specs produced by `/to-spec`.

| Artifact | Default location | Initial state | Next actor |
| --- | --- | --- | --- |
| Spec from `/to-spec` | `docs/prds/YYYY-MM-DD-<slug>.md` | `draft` or `ready-for-ticketing` | `/grill-with-docs`, `/wayfinder`, or `/to-tickets` |
| Implementation ticket from `/to-tickets` | `docs/issues/<spec-slug>/NNN-<slug>.md` | `ready-for-agent` | `/implement` |
| Wayfinder map | `docs/wayfinding/<effort>/map.md` | `active` | `/wayfinder` |
| Wayfinder decision ticket | `docs/wayfinding/<effort>/tickets/NNN-<slug>.md` | `open` | `/wayfinder` |
| Wayfinder evidence asset | `docs/wayfinding/<effort>/assets/<name>` | not applicable | linked from the owning ticket |

Local Matt artifacts do not create upstream camp-visible GitHub noise and do not use `.github/pull_request_template.md`.

## Reference resolution

- A local Markdown path means that exact local artifact.
- A URL means that exact remote artifact.
- A bare number is never assumed to be a GitHub issue or PR unless the user explicitly names GitHub and the target repository or request surface.
- Local blocking references use exact relative paths and readable titles, not bare numbers alone.

## Implementation frontier

An implementation ticket is on the frontier when:

1. its `State` is `ready-for-agent`,
2. every ticket under `Blocked By` has `State: completed`,
3. no other session has changed it to `claimed`.

`/implement` claims one ticket before code changes, completes that ticket, and stops. The next frontier ticket starts in a fresh context.

## Wayfinding operations

`/wayfinder` uses local files as a tracker-specific map and child-ticket model.

- **Map**: `docs/wayfinding/<effort>/map.md`.
- **Child ticket**: `docs/wayfinding/<effort>/tickets/NNN-<slug>.md`.
- **Asset**: `docs/wayfinding/<effort>/assets/<name>`.
- **Type**: `research`, `prototype`, `grilling`, or `task`.
- **Ticket states**: `open`, `claimed`, `resolved`, `out-of-scope`.
- **Map states**: `active`, `ready-for-spec`, `complete`.
- **Blocking**: an exact path list under `Blocked by`; a ticket is unblocked when every referenced ticket is `resolved`.
- **Frontier**: `open`, unblocked tickets ordered by filename number.
- **Claim**: set `State: claimed` and save before work.
- **Resolve**: append the answer and evidence links under `## Answer`, set `State: resolved`, then add only a one-line gist and link to the map's `Decisions so far`.
- **Out of scope**: set `State: out-of-scope` and add a linked explanation to the map's `Out of scope`, not `Decisions so far`.

Wayfinder artifacts are decision and investigation records, not implementation work. They never use `ready-for-agent`. Work at most one Wayfinder ticket per session. Local Markdown Wayfinder work is sequential by default to avoid duplicate claims and lost map updates.

When no open tickets or in-scope fog remain, set the map to `ready-for-spec` and report the exact next command:

```text
/to-spec docs/wayfinding/<effort>/map.md
```

`/to-spec` reads the linked resolved answers, writes the implementation-ready spec, links it from the map, and sets the map to `complete`.

## Closing local Matt artifacts

Close existing local artifacts instead of creating a separate completion document.

For an implementation ticket:

1. Mark verified acceptance criteria as checked.
2. Set `State: completed` and `Next actor: none`.
3. Add a concise `Result` with relevant commits.
4. Record commands and outcomes under `Verification`.
5. Update the primary architecture note or package README when the live implementation map changed.

After every ticket in a spec is complete, close the parent spec in a separate bookkeeping pass by setting `State: completed`, `Next actor: none`, and linking the completed ticket set. Keep the original problem statement and decisions as historical context.

For Wayfinder, the resolved ticket answer remains the detailed decision source. The map becomes `complete` only after the resulting spec or destination artifact is linked.

Completion evidence records what shipped or was decided, while primary architecture documents and current code/tests remain the source of truth for live behavior.

## When a skill says "publish to the issue tracker"

For `/to-spec`, `/to-tickets`, and `/wayfinder`, publish local Markdown as described above. Do not create GitHub Issues unless the user explicitly asks for GitHub publication and confirms the target repository or request surface.

For other skills, prefer local Markdown when the artifact is an internal Matt planning artifact. If a GitHub write is explicitly requested but unavailable, publish the content in the relevant PR body or PR comment using the marker format in `docs/agents/triage-labels.md`.

## When a skill says "fetch the relevant ticket"

For internal work PRs, prefer the linked local spec, implementation ticket, Wayfinder artifact, agent brief, spike report, handoff document, or other owning source before treating the PR body as the source of truth.

When the user explicitly names GitHub and passes a bare number, remember that GitHub shares one number space across issues and PRs. Try the named surface first and inspect comments and diff as appropriate.
