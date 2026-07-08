# Pro Bridge Artifacts

This directory stores prompts and answers exchanged with external high-context models for product, domain, or architecture review.

## Folder convention

Use topic-first kebab-case folders with an ISO date suffix:

```text
artifacts/pro-bridge/<topic-slug>-YYYY-MM-DD/
```

Examples:

```text
artifacts/pro-bridge/semesterops-domain-modeling-2026-07-08/
artifacts/pro-bridge/runtime-adapter-review-2026-07-09/
artifacts/pro-bridge/ui-composition-review-2026-07-10/
```

Avoid bare date prefixes such as `0708-modeling`. The folder name should first explain what question the artifact answers, then record when the bridge happened. If the same topic needs multiple rounds on the same day, append a round suffix:

```text
artifacts/pro-bridge/semesterops-domain-modeling-2026-07-08-r2/
```

## File convention

Each bridge folder should prefer these names:

| File | Purpose |
| --- | --- |
| `question.md` | Prompt sent to the external model |
| `answer.md` | External model answer |
| `notes.md` | Optional local synthesis or follow-up decisions |
