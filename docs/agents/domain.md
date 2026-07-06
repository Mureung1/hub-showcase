# Domain Docs

How engineering skills should consume this repo's domain documentation.

## Layout

This repo uses a single-context layout:

- `CONTEXT.md` at the repo root
- `docs/adr/` at the repo root

If these files do not exist yet, proceed silently. The domain-modeling flow can create them later when project language or architectural decisions become clear.

## Before Exploring

Before changing code, read `CONTEXT.md` if it exists. Also read any ADRs in `docs/adr/` that touch the area being changed.

## Vocabulary

When writing issues, PRDs, tests, or implementation notes, use the domain terms from `CONTEXT.md` when available. If a needed term is missing, note it as a domain-modeling follow-up rather than inventing competing vocabulary.

## ADR Conflicts

If a proposed change conflicts with an existing ADR, call that out explicitly and explain why the decision may need to be revisited.
