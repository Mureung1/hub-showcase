# AGENTS.md

## Purpose

This file provides guidance for development agents working in this repository. It
is not the runtime system prompt or behavior policy for `gamepm_agent`.

## Project Context

This project is an AI-powered game planning and project management platform.
The core product principle is Human in the Loop: AI may analyze, draft, and
propose changes, but actual project changes must go through approval-oriented
flows.

## Key References

- Project overview and usage: `README.md`
- Product goals and user scenarios: `docs/plan.md`
- Development checklist: `docs/checklist.md`
- Architecture notes: `docs/architecture.md`

## Development Rules

- Preserve the approval-based workflow.
- Do not bypass Approval Queue, Version History, Decision Log, or source/version
  reconfirmation behavior.
- Prefer the existing Python package structure under `gamepm_agent/`.
- Keep dependencies minimal and document new runtime dependencies in
  `requirements.txt`.
- Do not hardcode API keys, tokens, or other secrets.
- Keep changes scoped to the requested behavior and avoid unrelated refactors.
- Add or update focused tests under `tests/` for behavior changes.

## Commands

- Run tests: `python3 -m pytest`
- See `README.md` for CLI usage examples.

## Style

- Keep implementation simple and explicit.
- Match existing code and test patterns before introducing new abstractions.
- Preserve the Korean product documentation style unless asked otherwise.
