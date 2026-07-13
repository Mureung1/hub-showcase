---
name: preserve-product-intent
description: Preserve product intent by routing repository work through applicable AGENTS.md guidance and only the relevant product, design, API, and architecture documentation. Use when Codex plans, implements, modifies, or reviews repository code or docs. Do not use for simple status checks, Git-only operations, or general questions unrelated to repository behavior.
---

# Preserve Product Intent

Keep plans, changes, and reviews aligned with the repository's documented product intent without loading unrelated documentation.

## Workflow

1. Announce briefly that this skill is being used and why.
2. Apply the closest relevant `AGENTS.md` instructions already available in context. Do not reread unchanged instructions provided verbatim in the current turn.
3. Discover the current documentation layout with `rg --files docs` or the repository equivalent. Do not assume paths from memory.
4. Inspect filenames, headings, and targeted search results before reading document bodies.
5. Select only the sources needed for the task using the routing guidance below.
6. Form a short internal alignment brief containing:
   - requested outcome and success criteria;
   - product rules that must remain true;
   - explicit in-scope and out-of-scope behavior;
   - affected public contracts, permissions, and data ownership;
   - unresolved conflicts or decisions.
7. Inspect the existing implementation and current Git changes before proposing or making changes.
8. Use the smallest change that satisfies the request and the alignment brief.
9. Compare the resulting plan or diff with the brief, run relevant verification, and check whether related docs must change.

## Documentation Routing

Adapt to the repository's actual structure and naming.

| Work type | Read first |
|---|---|
| Product behavior, scope, or policy | Relevant PRD, feature specification, and user flow sections |
| UI, interaction, or frontend presentation | Relevant feature specification, screen flow, design system, and design guidelines |
| API, backend, authentication, or authorization | Relevant feature policy, API specification, data model, and existing backend pattern |
| Persistence or data ownership | Relevant feature policy, data model, API contract, and existing storage pattern |
| Technical choice or configuration | `AGENTS.md` technology constraints, package manifests, architecture docs, and setup docs |
| Documentation-only change | The source-of-truth document and directly affected contracts only |

Read broader documents only when the change crosses multiple product areas or a targeted search cannot resolve the requirement. Never read the entire docs directory by default.

## Conflict Policy

Treat these as important conflicts:

- product goal, MVP scope, or user flow;
- authentication, authorization, privacy, or security policy;
- recipe or content ownership and modification rights;
- public API request, response, error, or route contracts;
- persisted data fields, relationships, or deletion behavior;
- confirmed versus undecided technology choices.

When an important conflict is unresolved, pause before mutation, cite the conflicting files or sections, and request a user decision. If the user explicitly changes a product decision, include the affected source-of-truth docs in the planned change.

For minor naming, wording, formatting, or local implementation differences, follow the nearest established pattern and continue. Do not expand scope to fix unrelated drift.

## Token Discipline

- Reuse relevant documents already read in the current turn when they have not changed.
- Search headings and keywords before opening long files.
- Read the smallest section that establishes the rule, then expand only if dependencies require it.
- Do not copy repository documentation into this skill or restate it in the final response.
- Keep the alignment brief internal unless a conflict, new decision, or documentation mismatch affects the user.

## Completion Check

Before reporting completion, confirm that:

- the requested flow still matches the product intent;
- permissions and ownership are enforced in the backend, not only the UI;
- public contracts and data models agree;
- no out-of-scope feature or dependency was introduced;
- tests or checks cover the changed success and failure paths;
- required documentation was updated or a remaining mismatch was reported.
