# Harness Recommended Implementation Plan

## Context

This plan implements the approved Recommended harness design for the AIAgentChallenge hub repository.

The implementation must not change application behavior. It only adds or updates harness operations, agent role definitions, project skills, minimal Wiki structure, and local verification scripts.

## Approved Scope

- Keep the existing React + TypeScript + Vite app unchanged.
- Keep `docs/codex-skills/` as repository-side skill documentation.
- Add active Codex agent role configuration under `.codex/agents/`.
- Add project workflow skills under `.agents/skills/`.
- Add a minimal project Wiki under `docs/wiki/`.
- Add a local verification script under `scripts/`.
- Keep `docs/notion-dashboard-guide.md` out of the new official flow because it is an old unused document.

## Planned Files

- `.codex/config.toml`
- `.codex/agents/researcher.toml`
- `.codex/agents/planner.toml`
- `.codex/agents/implementer.toml`
- `.codex/agents/verifier.toml`
- `.codex/agents/wiki_curator.toml`
- `.agents/skills/analyze-request/SKILL.md`
- `.agents/skills/create-plan/SKILL.md`
- `.agents/skills/execute-plan/SKILL.md`
- `.agents/skills/verify-result/SKILL.md`
- `.agents/skills/wiki-ingest/SKILL.md`
- `.agents/skills/wiki-query/SKILL.md`
- `.agents/skills/wiki-lint/SKILL.md`
- `docs/wiki/index.md`
- `docs/wiki/log.md`
- `docs/wiki/sources/README.md`
- `docs/wiki/entities/README.md`
- `docs/wiki/concepts/README.md`
- `docs/wiki/synthesis/README.md`
- `scripts/verify-harness.ps1`
- Existing docs indexes and status files as needed.

## Verification Commands

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-harness.ps1
npm.cmd run typecheck
npm.cmd run build
```

## Completion Criteria

- Codex config TOML parses.
- Agent TOML files parse and have distinct names.
- Project skill frontmatter is present and names are unique.
- Wiki index/log/source structure is present and linkable.
- Local harness verification script passes.
- Existing `npm.cmd run typecheck` passes.
- Existing `npm.cmd run build` passes or any failure is reported with evidence.

## Completion Result

- Completed on 2026-07-14.
- `scripts/verify-harness.ps1` passed.
- `.codex/config.toml` and `.codex/agents/*.toml` parsed with Python `tomllib`.
- `npm.cmd run typecheck` passed.
- `npm.cmd run build` passed.
