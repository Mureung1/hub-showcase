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

Each bridge folder should use turn-numbered names so follow-up prompts and answers stay paired:

| File | Purpose |
| --- | --- |
| `question-1.md` | First prompt sent to the external model |
| `answer-1.md` | External model answer to `question-1.md` |
| `question-2.md` | Follow-up prompt sent to the external model |
| `answer-2.md` | External model answer to `question-2.md` |
| `notes.md` | Optional local synthesis or follow-up decisions |

Continue the same sequence for additional turns, for example `question-3.md` and `answer-3.md`. Do not overwrite earlier answers when asking follow-up questions.
