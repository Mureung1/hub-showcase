---
name: ay-ple-first-assignment
description: Identify or update a first Assignment from actual SemesterWorkspace files, request semantic Review before mutation, and apply only an accepted change. Use for a user's first-Assignment task.
---

# First Assignment

## Workflow

1. Read the actual target file and every source file needed for the task.
   Resolve ambiguity with the user instead of inventing facts.
2. Draft the proposed final content without changing the actual target file.
   Express the proposal as a domain-neutral semantic Review with a short
   `summary`, a `question`, and ordered `changes`. Give each change a human
   readable `label`, `description`, and meaningful `before` and/or `after`
   value. When exact file evidence helps the user review a change, include its
   POSIX workspace-relative `relativePath`, whole-file lowercase SHA-256
   `contentDigest`, and a `locator` with type `text_quote`, an exact `quote`,
   and its 1-based `occurrence`.
3. Re-read the actual target file immediately before Review. Confirm that it
   still has the bytes used to prepare the proposal, then call
   `propose_state_patch` before changing any actual file.
4. Treat the structured result as the decision about this proposal:
   - On `accept`, obtain any required native file permission, re-read the target
     to detect drift, apply only the reviewed changes with native file tools,
     and verify the resulting file.
   - On `revise`, keep the actual file unchanged. Incorporate the feedback,
     re-read the current file, and make a fresh `propose_state_patch` call.
     Start a new Review for the fresh call; do not replace or reopen the settled
     one.
   - On `reject`, keep the actual file unchanged and stop applying this
     proposal.
5. After an accepted file change, follow the active SemesterWorkspace
   `AGENTS.md` and native permission policy. When the change is a meaningful
   checkpoint, inspect the exact diff and commit only the intended paths.

Rely on the App only to return the Review result; never ask or expect it to edit
a SemesterWorkspace file or run Git for AY. Keep a Review result independent
from native execution approval, and obtain any required file or Git permission
through the native execution flow. Do not seek the same semantic decision
through a second interaction channel. If the Review call fails or its result is
unavailable, do not infer an outcome or apply the proposed mutation.
