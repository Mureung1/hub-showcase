---
name: wiki-lint
description: Use to check project Wiki structure, frontmatter, index coverage, missing source paths, broken relative links, duplicate titles, stale pages, and append-only log format.
---

# Wiki Lint

## Purpose

Check Wiki hygiene before considering Wiki work complete.

## Do Not Use When

- The task is not related to `docs/wiki/`.
- The user is asking a knowledge question from the Wiki; use `wiki-query` instead.
- The user is adding approved source material; use `wiki-ingest` first, then lint.
- The expected fix would require deleting or rewriting Wiki history without approval.

## Input

- `docs/wiki/`
- `scripts/verify-harness.ps1`

## Preconditions

- Wiki files exist.

## Procedure

1. Check `docs/wiki/index.md` exists.
2. Check `docs/wiki/log.md` exists.
3. Check Wiki pages have required frontmatter.
4. Check `source_paths` point to existing files or clearly documented external sources.
5. Check pages are listed in `index.md`.
6. Check `log.md` has append-only dated entries.
7. Report stale or conflicting pages instead of deleting them.

## Agent

- Use `verifier`.

## Tools

- `scripts/verify-harness.ps1`
- `rg`
- read-only file inspection

## Output

- Pass/fail result
- Broken links or missing sources
- Missing index entries
- Stale/conflict warnings

## Stop Conditions

- Missing index or log.
- Missing source paths for factual pages.
