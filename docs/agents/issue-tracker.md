# Issue Tracker: GitHub

Issues and PRDs for this repo live in GitHub Issues. Pull requests are also a request and triage surface.

This repo is PR-based. Work for this participant must stay on the existing `N180_하성욱` branch; do not create or switch to `main` or another branch for implementation work.

## Permissions

Do not assume the current contributor can create labels, apply labels, push to the upstream repo, or administer the repository. If a GitHub write operation fails because of permissions, leave a clear PR/issue comment or local summary instead.

## Pull Requests

PRs as a request surface: yes.

When triaging PRs, read the PR body, comments, and diff. Use `gh pr view <number> --comments` and `gh pr diff <number>`.

The workflow `.github/workflows/auto-merge.yml` is template-provided but active in the repo. It attempts scheduled PR merges, skips PRs targeting `main`, skips PRs with the GitHub `review` label, defers changes-requested PRs, and closes conflicting PRs. Treat the GitHub `review` label as an auto-merge control, not as an agent triage state.

## When a skill says "publish to the issue tracker"

Prefer creating a GitHub issue if permissions allow. If issue creation is unavailable, publish the content in the relevant PR body or PR comment using the marker format in `docs/agents/triage-labels.md`.

## When a skill says "fetch the relevant ticket"

Resolve bare numbers carefully: GitHub shares one number space across issues and PRs. Try `gh pr view <number> --comments` first for PR-based work, then fall back to `gh issue view <number> --comments`.
