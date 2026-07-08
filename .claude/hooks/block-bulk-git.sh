#!/bin/bash
# 최소단위 커밋 강제: 일괄 스테이징(git add . / -A / --all)과 git commit -a 차단.
# PreToolUse(Bash) 훅 — stdin으로 tool_input JSON을 받는다.
cmd=$(jq -r '.tool_input.command // ""')

# 따옴표로 감싼 구간(커밋 메시지 등)은 플래그 검사에서 제외
stripped=$(printf '%s\n' "$cmd" | sed -E "s/\"[^\"]*\"//g; s/'[^']*'//g")

if printf '%s\n' "$stripped" | grep -qE 'git add ([^ ]+ )*(\.|-A|--all)( |$)|git commit[^;|&]*( -a( |$)| -am | --all( |$))'; then
  jq -n '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:"최소단위 커밋 규칙 위반: git add . / -A / --all 및 git commit -a 는 금지입니다. 커밋할 파일을 경로로 명시해 스테이징하세요 (CLAUDE.md 커밋 규칙 참고)."}}'
fi
exit 0
