#!/usr/bin/env bash
# PreToolUse hook: git push 직전에 diff 안에 하드코딩된 비밀키/토큰이 있는지 스캔한다.
# 매치되면 exit 1로 push를 차단한다.

input=$(cat)
cmd=$(printf '%s' "$input" | node -e '
let d = "";
process.stdin.on("data", c => d += c);
process.stdin.on("end", () => {
  try {
    const j = JSON.parse(d);
    process.stdout.write(j?.tool_input?.command || "");
  } catch (e) {}
});
' 2>/dev/null)

case "$cmd" in
  *"git push"*) ;;
  *) exit 0 ;;
esac

repo_root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$repo_root" || exit 0

upstream=$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null)
if [ -n "$upstream" ]; then
  base=$(git merge-base HEAD "$upstream" 2>/dev/null)
else
  base=$(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD origin/master 2>/dev/null)
fi

if [ -n "$base" ]; then
  range="$base..HEAD"
else
  range="HEAD"
fi

diff_output=$(git diff "$range" 2>/dev/null; git diff --cached 2>/dev/null)

match=$(printf '%s\n' "$diff_output" | grep -nE \
  -e 'AIza[0-9A-Za-z_-]{20,}' \
  -e 'sk-[0-9A-Za-z]{20,}' \
  -e 'eyJ[A-Za-z0-9_-]{20,}' \
  -e 'SUPABASE[A-Z_]*KEY' \
  -e 'GEMINI[A-Z_]*KEY' \
  -e 'api[_-]?key[[:space:]]*[:=][[:space:]]*["'"'"'][^"'"'"' ]{12,}')

if [ -n "$match" ]; then
  echo "🚫 push 차단: diff에서 비밀키로 의심되는 패턴이 발견됨 (범위: $range)" >&2
  echo "$match" >&2
  echo "실제 비밀키가 맞다면 커밋 히스토리에서 제거한 뒤 다시 push 하세요." >&2
  exit 1
fi

exit 0
