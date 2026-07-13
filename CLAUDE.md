# CLAUDE.md

프로젝트 작업 규칙은 `AGENTS.md`에 있다. Claude Code와 Codex가 같은 규칙을 공유하기 위해 내용을 한 곳에서만 관리한다.

@AGENTS.md

## Claude Code

새로 만들 때만 아래 위치를 사용한다. 기존 파일은 Claude Code가 자동으로 읽으므로 따로 찾지 않아도 된다.

- 특정 경로에만 적용되는 조건부 규칙: `.claude/rules/`
- 반복 작업 절차: `.claude/skills/`
- 전문 에이전트: `.claude/agents/`
- 훅 실행 스크립트: `.claude/hooks/` (등록은 `.claude/settings.json`)
