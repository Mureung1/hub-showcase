---
name: create-plan
description: Use when an approved or likely project change needs a small, file-level implementation plan with verification commands and rollback steps. Do not use for coding directly.
---

# Create Plan

## Purpose

Create a small, reversible plan grounded in the current repository.

## Do Not Use When

- The request is still ambiguous or lacks acceptance criteria; use `analyze-request` first.
- The user has already approved a specific file-level implementation step; use `execute-plan` instead.
- The task is only checking completed work; use `verify-result` instead.
- The work would require unapproved package installs, credentials, commits, pushes, merges, or deployments.

## Input

- An analyzed request
- Current repository facts
- Related docs and tasks

## Preconditions

- `analyze-request` output exists or the request is already clear.
- Relevant docs have been checked.

## Procedure

1. Choose the smallest viable scope.
2. Reuse existing docs, skills, scripts, and folders where possible.
3. List files to create or modify.
4. Identify files that must not be touched.
5. Assign agents by role.
6. Define narrow verification for each step.
7. Define rollback for each step.

## Agent

- Use `planner`.
- Use `researcher` for unknown repository facts.

## Tools

- read-only file inspection
- `rg`
- existing project docs

## Output

- Step list
- File scope
- Agent roles
- Verification commands
- Completion criteria
- Rollback notes
- User approval points

## Stop Conditions

- The plan requires unapproved file moves, deletes, package installs, external MCP setup, commits, pushes, merges, or deployments.
