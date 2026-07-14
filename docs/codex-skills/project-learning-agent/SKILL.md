---
name: project-learning-agent
description: Use when updating AIAgentChallenge hub learning notes in docs/learning: extracting study keywords from implementation or docs work, adding concise learning index entries, mapping keywords to reference code paths, creating ChatGPT study questions, or preventing long tutorial-style explanations in learning files.
---

# Project Learning Agent

> Repository copy for review and reuse. Install a local copy under `.codex/skills/project-learning-agent` when this skill should be auto-discovered by Codex.

## Purpose

Keep `docs/learning/` short, searchable, and useful for later ChatGPT study sessions.

The learning files are not lecture notes. They are lightweight prompts for what to study next.

## Required Context

Before editing learning notes, read:

- `docs/learning/README.md`
- The implementation or document files that caused the learning update
- Related docs only when needed, such as `docs/mvp-functional-spec.md`, `docs/design-system.md`, or `docs/agent-design.md`

## Output Shape

Each learning note should contain only:

1. Study keywords
2. Why it matters in one short paragraph or one line
3. Project code or document paths to inspect
4. Specific parts to check
5. Example questions to ask ChatGPT

Prefer bullets over prose. Keep explanations short enough that the user can scan the file in under a minute.

## Workflow

1. Identify the topic from the current work.
2. Reuse an existing `docs/learning/*.md` file when the topic fits.
3. Create a new numbered file only when the topic does not fit an existing file.
4. Add or update keywords first.
5. Add concrete repo paths after checking they exist or are planned docs.
6. Add 2-4 ChatGPT questions that the user can paste into a study chat.
7. Check for Korean mojibake before finishing.

## Writing Rules

- Do not write long textbook explanations.
- Do not duplicate full implementation details from source files.
- Do not mark unimplemented behavior as implemented.
- Do not include secrets, API keys, private schedule details, school/location data, or personal credentials.
- Use relative project paths in learning files.
- Keep headings consistent with the existing learning note style.
- If a file contains broken Korean text, fix the broken text while preserving the short-note structure.

## Template

```markdown
# Topic Name

## Keywords

- keyword
- keyword
- keyword

## Why It Matters

This concept helps explain or modify [feature/flow] in this project.

## Reference Code Paths

- src/path/example.ts
- docs/example.md

## Parts To Check

- Specific functions, types, state values, or CSS rules
- Where the data is created and where it is used

## ChatGPT Questions

- Explain [keyword] using this project structure.
- Walk through how [concept] is used in [code path].
```

## Finish Checklist

- [ ] The note is keyword-first.
- [ ] Every referenced path is useful and specific.
- [ ] The note does not become a tutorial.
- [ ] Korean text is readable.
- [ ] `docs/learning/README.md` lists a new file if one was added.
