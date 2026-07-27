---
name: semester-workspace-init
description: Prepare or update a user-owned Git SemesterWorkspace before AY-PLE starts, including its v4 identity, minimal instructions, built-in Skill, required Interaction MCP declaration, and reviewable checkpoints. Use from a native Codex client opened at the AY-PLE hub when a user creates, adopts, or refreshes a semester workspace.
---

# Semester Workspace Init

Prepare exactly one SemesterWorkspace without starting AY-PLE or changing its
registry.

## Inputs

Obtain these values from the user before running the bootstrap:

- An explicit absolute target path.
- `year-level`, an integer from 1 through 20.
- `term-key`, a lowercase ASCII slug such as `fall` or `first-semester`.
- `term-display-name`, the user-facing semester name.
- Optional explicit workspace-relative material paths to baseline. Never infer
  baseline paths from the target inventory.

## Workflow

1. Run the bundled script from the current AY-PLE hub:

   ```bash
   node --import tsx .agents/skills/semester-workspace-init/scripts/bootstrap.mts \
     --target "<absolute-target>" \
     --year-level "<year-level>" \
     --term-key "<term-key>" \
     --term-display-name "<term-display-name>"
   ```

   Append one `--baseline "<workspace-relative-path>"` for each material path
   the user explicitly approved.
2. Use the native client's normal file and Git command approval. Do not broaden
   permissions, add an App permission profile, or treat a dirty tree as a
   blocker.
3. If the script reports a conflict, show the supplied actionable diff or
   reason. Preserve the original bytes and stop; do not improvise an overwrite,
   recursive parent creation, symlink, extra Runtime root, or broad Git stage.
4. On success, report the canonical prepared root, checkpoint result, and the
   exact `npm run dev -- --workspace "<absolute-prepared-root>"` guidance printed
   by the script. Do not start the App unless the user separately asks, and do
   not claim that final text changed the WorkspaceRegistry.

Re-running the same command is an update check. Exact managed resources produce
no byte change and no empty commit. Only an otherwise exact managed MCP block
whose root-relative adapter command became stale may be refreshed
automatically; other managed-byte differences require explicit resolution.
