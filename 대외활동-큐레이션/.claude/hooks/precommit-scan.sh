#!/bin/bash
# Claude Code PreToolUse 훅. Bash 도구 실행 직전에 호출된다.
# git commit일 때만 staged 변경에서 비밀키를 스캔하고, 있으면 커밋을 막는다(exit 2).
# git commit이 아니면 아무것도 안 하고 통과(exit 0)라, 다른 명령엔 영향이 없다.

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""' 2>/dev/null)

case "$cmd" in
  *"git commit"*) ;;   # 계속 진행
  *) exit 0 ;;          # 커밋이 아니면 그냥 통과
esac

# staged diff에서 비밀키 패턴 스캔
hits=$(git diff --cached 2>/dev/null | grep -iE "sk-ant-[a-zA-Z0-9]{15}|sb_secret_[a-zA-Z0-9]{6}|-----BEGIN[A-Z ]*PRIVATE KEY")

if [ -n "$hits" ]; then
  echo "커밋에 비밀키로 보이는 값이 있습니다. 확인하고 빼낸 뒤 다시 커밋하세요." >&2
  exit 2
fi

exit 0
