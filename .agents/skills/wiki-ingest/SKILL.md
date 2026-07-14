---
name: wiki-ingest
description: Use when approved source material should be added to the project Wiki with traceable source paths, index updates, and append-only log entries. Do not use for app code changes.
---

# Wiki Ingest

## Purpose

Turn approved source material into traceable project Wiki pages.

## Input

- Source path
- Topic
- Intended Wiki page type: source, entity, concept, or synthesis

## Preconditions

- Source material is inside the project or explicitly approved.
- Wiki update is approved.

## Procedure

1. Read `docs/wiki/index.md`.
2. Check for an existing related page.
3. Create or update only the relevant Wiki page.
4. Include frontmatter with title, type, status, updated, source_paths, confidence, and tags.
5. Update `docs/wiki/index.md`.
6. Append a log entry to `docs/wiki/log.md`.

## Agent

- Use `wiki_curator`.

## Tools

- read-only inspection for source material
- `apply_patch` for Wiki edits
- `wiki-lint` after changes

## Output

- Updated Wiki page
- Updated index entry
- Log entry

## Stop Conditions

- Source path is missing.
- The page would duplicate an existing page without adding value.
- Source contains secrets or personal information.
