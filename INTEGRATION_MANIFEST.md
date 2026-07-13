# NoticePilot Instruction and Quality Harness Integration Manifest

Date: 2026-07-10

## Purpose

This manifest records the local integration of the instruction bundle from:

`/Users/chan/Downloads/noticepilot-live-review-s4-integrated-with-instructions.zip`

The integration was applied selectively. It did not overwrite application source code, dependencies, lockfiles, existing auto-merge workflow behavior, secrets, or Git history.

## Applied scope

### Instruction and policy files

- `AGENTS.md`
- `.codex/step_gated_policy.md`
- `.codex/checklists/security_review.md`

### Code review skill

- `.codex/skills/noticepilot-code-review/SKILL.md`
- `.codex/skills/noticepilot-code-review/references/review-boundaries.md`
- `.codex/skills/noticepilot-code-review/references/schema-and-adapter-review.md`
- `.codex/skills/noticepilot-code-review/references/calendar-and-ics-review.md`

### Package scripts

`package.json` now defines the local quality commands used by the harness:

- `npm test`
- `npm run test:schemas`
- `npm run test:adapters`
- `npm run build`
- `npm run security:audit`

No dependency versions were changed, and `package-lock.json` was not changed.

### GitHub Actions workflow

- `.github/workflows/quality-gate.yml`

The workflow is included in the repository integration scope. After it is pushed to GitHub, it can run on pull requests and manual dispatch, installing dependencies with `npm ci` before running tests, build, and the high-severity dependency audit. This integration does not configure branch protection or make the workflow a required status check.

## Explicitly excluded scope

The following ZIP contents were not applied as source changes during this integration:

- application source replacement;
- package dependency or lockfile updates;
- `.github/workflows/auto-merge.yml` changes;
- Git branch creation, push, or pull request creation;
- credential, token, secret, or `.env` handling;
- remote repository branch protection or required status check configuration.

The repository integration commit is limited to `.github/workflows/quality-gate.yml`, this manifest, and `docs/qa/s3-local-security-harness-consistency-report.md`.

## Local verification result

S8 full local validation completed with these results:

- `npm ci`: pass
- `npm run test:schemas`: pass, 46 tests
- `npm run test:adapters`: pass, 61 tests
- `npm test`: pass, 113 tests
- `npm run build`: pass
- `npm run security:audit`: pass, 0 vulnerabilities
- `git diff --check`: pass
- `package-lock.json`: unchanged

The first local audit attempt failed because the sandbox could not resolve `registry.npmjs.org`. The same command passed after approved network access.

## Local-only Codex operational scope

`AGENTS.md` and `.codex/**` are local Codex operational artifacts and are intentionally excluded from the repository commit. They are not automatically available in other clones or collaboration environments. The applied-scope entries above record the harness used in this local workspace, not repository-distributed configuration.

## Consistency report

The detailed local consistency report is:

- `docs/qa/s3-local-security-harness-consistency-report.md`
