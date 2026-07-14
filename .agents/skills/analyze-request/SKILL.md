---
name: analyze-request
description: Use when a new AIAgentChallenge hub request must be converted into goal, scope, constraints, assumptions, risks, and acceptance criteria before planning or implementation. Do not use for direct implementation.
---

# Analyze Request

## Purpose

Turn a user request into a clear project-local brief before any file changes.

## Input

- User request
- Current `AGENTS.md`
- `docs/status.md`
- Relevant project docs

## Preconditions

- Git status and branch have been checked.
- The request is not a trivial answer-only question.

## Procedure

1. Restate the goal in one paragraph.
2. List explicit constraints and protected files.
3. Separate confirmed facts from assumptions.
4. Identify impacted areas: app, docs, skills, agents, Wiki, scripts, CI.
5. Define acceptance criteria.
6. Mark whether user approval is required before implementation.

## Agent

- Prefer `researcher` for evidence gathering.
- Use `planner` only after the request is understood.

## Tools

- `rg`
- read-only file inspection
- git status with project `safe.directory` when needed

## Output

- Goal
- Scope
- Constraints
- Assumptions
- Risks
- Acceptance criteria
- Approval points

## Stop Conditions

- Required scope is not approved.
- Request asks for secrets, automatic commits, pushes, merges, or deployments without explicit approval.
