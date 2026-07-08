#!/bin/bash
# git commit 전 oxlint 게이트 — 린트 실패 상태의 커밋을 차단한다.
# PreToolUse(Bash) 훅 — stdin으로 tool_input JSON을 받는다.
cmd=$(jq -r '.tool_input.command // ""')

case "$cmd" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

if ! out=$(npx oxlint 2>&1); then
  jq -n --arg out "$out" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:("커밋 차단: oxlint 실패. 린트 오류를 먼저 수정하세요.\n\n" + ($out | .[0:1500]))}}'
fi
exit 0
