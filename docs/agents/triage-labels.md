# Triage State Markers

This repo does not rely on GitHub labels for agent triage state. Contributors may not have permission to create or apply labels.

Instead, record triage state in the PR or issue body with this section:

```markdown
## Agent triage

- State: needs-triage
- Surface: pull-request
- Next actor: human
```

If the body cannot be edited, post the same block as a comment.

| Canonical state | Marker value | Meaning |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | Maintainer or agent needs to evaluate this request |
| `needs-info` | `needs-info` | Waiting on the reporter or PR author |
| `ready-for-agent` | `ready-for-agent` | Fully specified and ready for an AFK agent |
| `ready-for-human` | `ready-for-human` | Requires human implementation or judgment |
| `completed` | `completed` | Implemented, verified, and closed with outcome evidence |
| `wontfix` | `wontfix` | Will not be actioned |

Use `Next actor: none` for terminal `completed` and `wontfix` artifacts. A
completed local PRD or issue should also record its implementation evidence and
verification result so another agent does not infer live behavior from triage
state alone.

The GitHub `review` label is separate from these states. It is used by the auto-merge workflow to prevent automatic merging, and should not be treated as an agent triage state.
