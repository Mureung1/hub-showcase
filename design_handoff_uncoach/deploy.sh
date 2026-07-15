#!/usr/bin/env bash
# 언코 통합 배포 — 한 번에 Firebase(앱/UI) + GitHub(레포, Vercel 프록시 자동배포)
#
# 사용법:
#   bash deploy.sh "커밋 메시지"     # 메시지 지정
#   bash deploy.sh                    # 메시지 생략 시 자동(날짜시각)
#
# 하는 일:
#   1) 인라인 스크립트 문법 검증(깨진 코드 배포 방지)
#   2) 변경분 커밋 + GitHub(zer8m/uncoach)에 push
#      → Vercel이 이 레포에 연동돼 있으면 채점 프록시(api/)도 자동 재배포됨
#   3) Firebase Hosting 배포(앱/UI 반영)
#
# 참고: UI/기능 수정은 대부분 Firebase 쪽만 바뀝니다. Vercel(프록시)은
#       api/ 를 건드릴 때만 실제로 달라지지만, push가 자동배포를 겸하므로 그냥 두면 됩니다.

set -e
cd "$(dirname "$0")"

MSG="${1:-deploy: $(date +%F_%H%M)}"

echo "━━━ ① 문법 검증 ━━━"
node -e '
const fs=require("fs"),vm=require("vm");
const html=fs.readFileSync("index.html","utf8");
const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi; let m,i=0,err=0;
while((m=re.exec(html))){i++;try{new vm.Script(m[1]);}catch(e){if(e instanceof SyntaxError){console.log("  문법오류 블록#"+i+": "+e.message);err++;}}}
if(err){console.log("  ✗ 배포 중단");process.exit(1);}
console.log("  ✓ index.html 인라인 스크립트 "+i+"개 OK");
'

echo "━━━ ② GitHub 커밋·push (→ Vercel 자동배포) ━━━"
git add -A
if git diff --cached --quiet; then
  echo "  변경 없음 — 커밋 건너뜀"
else
  git commit -q -m "$MSG"
  echo "  커밋: $MSG"
fi
git push -q origin HEAD
echo "  ✓ push 완료 (origin/main)"

echo "━━━ ③ Firebase Hosting 배포 ━━━"
firebase deploy --only hosting

echo ""
echo "✅ 배포 완료"
echo "   앱:    https://unco-965ab.web.app"
echo "   프록시: https://uncoach-pi.vercel.app/api/gemini (레포 연동 시 자동 갱신)"
