---
name: wiki-query
description: Use when answering questions from the project Wiki while tracing important claims back to source paths. Do not automatically ingest generated answers back into the Wiki.
---

# Wiki Query

## Purpose

Answer project knowledge questions from the Wiki without treating generated synthesis as source material.

## Do Not Use When

- The question cannot be answered from Wiki pages or their `source_paths`.
- The user wants to add new source material to the Wiki; use `wiki-ingest` instead.
- The task requires implementation, verification, or file edits outside the Wiki.
- The answer depends on external systems that are not configured or approved.

## Input

- User question
- `docs/wiki/index.md`

## Preconditions

- Wiki exists.
- Query can be answered from project knowledge or source paths.

## Procedure

1. Read `docs/wiki/index.md` first.
2. Select only relevant Wiki pages.
3. Trace important claims to `source_paths`.
4. Mark missing or stale evidence as uncertain.
5. Do not append generated answers to Wiki unless a separate `wiki-ingest` task is approved.

## Agent

- Use `researcher` for read-only queries.
- Use `wiki_curator` only for approved Wiki edits.

## Tools

- `rg`
- read-only file inspection

## Output

- Answer
- Source paths
- Confidence
- Missing evidence

## Stop Conditions

- Wiki has no relevant source.
- The answer requires external systems that are not configured or approved.
