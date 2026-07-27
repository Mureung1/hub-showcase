# `data/` — Curriculum Agent Knowledge Chunks

This directory holds the official-doc chunks the curriculum agent uses for grounding
(`searchKnowledgeChunks` in `backend/modules/knowledge/adapters/jsonlKnowledgeRepository.mjs`).

## File naming

One `.jsonl` file per knowledge topic. The topic is inferred from the file name in
`inferTopicFromFileName` (same file):

| File name                              | Topic               | Curriculum track(s) it grounds |
| --------------------------------------- | -------------------- | ------------------------------- |
| `react_docs.jsonl`                      | `react`               | `frontend`, `fullstack`         |
| `docker-docs-chunks.jsonl`              | `docker`              | `devops`                        |
| `backend-docs-chunks.jsonl`             | `backend`             | `backend`, `fullstack`          |
| `software-engineer-docs-chunks.jsonl`   | `software-engineer`   | `software-engineer`             |

`fullstack` goals search both the `react` and `backend` topics (see
`backend/modules/curriculum/domain/trackTopicKeywords.mjs`) — it does not need its own file.

New files must be added to `defaultKnowledgeChunkFileNames` in
`jsonlKnowledgeRepository.mjs` and given a branch in `inferTopicFromFileName` if the
file name doesn't already contain the topic string.

## Line schema

Each non-empty line is one JSON object:

```json
{
  "docTitle": "string, required — the source document's title",
  "sectionHeading": "string, optional — defaults to docTitle if omitted",
  "chunkText": "string, required, 20–2000 chars — the excerpt used for grounding",
  "url": "string, required — must start with http:// or https://",
  "sourcePath": "string, optional — defaults to url if omitted"
}
```

`title` and `content` are accepted as aliases for `docTitle` and `chunkText` (see
`normalizeKnowledgeChunkInput` in `jsonlKnowledgeRepository.mjs`) for compatibility with
`react_docs.jsonl`'s existing shape.

## Adding a new source file

1. Create `data/<topic>-docs-chunks.jsonl` with one JSON object per line, per the schema above.
2. Validate it: `npm run knowledge:validate -- data/<topic>-docs-chunks.jsonl`
3. Fix any reported line/message pairs until the validator prints `OK: ...`.
4. Register the file name in `defaultKnowledgeChunkFileNames` and, if needed, a topic
   branch in `inferTopicFromFileName` (both in `jsonlKnowledgeRepository.mjs`).
5. Run `npm test` to confirm nothing regresses.

## Current gap

`backend-docs-chunks.jsonl` and `software-engineer-docs-chunks.jsonl` do not exist yet.
Until they're added, goals classified into the `backend` or `software-engineer` topics
generate a curriculum with `knowledgeContext: []` — the agent still works, it just has no
official-doc grounding for its rationale on those two tracks. This is a known, tracked gap,
not a bug: `recommendCurriculum` and `searchKnowledgeChunks` both handle the empty-chunk
case safely (see the regression test in
`backend/modules/curriculum/application/recommendCurriculum.test.mjs`).

Populating these two files is a content-curation task: pull representative chunks from
each track's official documentation (FastAPI's own docs are a natural fit for `backend`,
given `backend-docs-chunks.jsonl` and the existing `fastapi` keyword already wired into
`trackTopicKeywords.mjs`), keep `chunkText` to a focused single-topic excerpt per line
(20–2000 chars), and validate with `npm run knowledge:validate` before committing.
