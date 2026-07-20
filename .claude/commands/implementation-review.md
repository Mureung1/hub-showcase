---
description: 구현 직후 Claude Code 서브에이전트로 1차 코드리뷰를 실행한다
argument-hint: [리뷰할 변경 범위와 확정된 설계/이슈 링크]
---

Ask the `implementation-code-reviewer` subagent to review the implementation below.
The subagent should do detailed file inspection and verification command execution.
The final review report must be written in Korean.

## Review Target
$ARGUMENTS

## Review Criteria
- AGENTS.md
- docs/DEVELOPMENT.md
- docs/plan/README.md
- Relevant product/design documents
- Relevant docs/quality criteria
- Changed code and tests

## Request
- Review only. Do not modify files.
- Prioritize design mismatch, missing implementation, over-implementation, security boundaries, DB constraint mismatch, and missing failure cases.
- Run practical verification commands directly.
- Present findings first, ordered by severity.
- Keep file paths, commands, code identifiers, API names, DB columns, and raw logs in their original language.
- Write the final report to the user in Korean.
- At the end, list what Codex should double-check during final verification.
