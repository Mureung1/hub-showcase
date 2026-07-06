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
| `wontfix` | `wontfix` | Will not be actioned |

The GitHub `review` label is separate from these states. It is used by the auto-merge workflow to prevent automatic merging, and should not be treated as an agent triage state.
