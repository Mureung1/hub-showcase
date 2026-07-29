#!/usr/bin/env bash
# 부스 A3 인쇄물 PDF 생성 + 검증.
#
# 사용법: 저장소 루트에서
#   npx --yes http-server . -p 4321 -c-1 &      # 정적 서버 (또는 .claude/launch.json 의 "booth")
#   bash docs/booth/build-pdf.sh
#
# 왜 스크립트로 두는가:
#   Chrome이 웹폰트 로딩이 끝나기 전에 인쇄하면 글자가 통째로 빠진 PDF가 나온다.
#   실제로 24KB짜리 빈 PDF가 만들어진 적이 있어서, --virtual-time-budget 으로 기다리게 하고
#   만들어진 PDF에 Pretendard가 실제로 임베드됐는지 매번 확인한다.
set -euo pipefail

PORT="${PORT:-4321}"
BASE="http://localhost:${PORT}/docs/booth"
OUT="$(cd "$(dirname "$0")" && pwd)"

CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
[ -f "$CHROME" ] || CHROME="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
[ -f "$CHROME" ] || { echo "Chrome/Edge를 찾을 수 없다. CHROME=... 로 경로를 넘겨라."; exit 1; }

render() { # $1=html이름  $2=pdf파일명
  local src="$BASE/$1.html" dst="$OUT/$2"
  echo "── $2"
  "$CHROME" --headless=new --disable-gpu --virtual-time-budget=15000 \
    --no-pdf-header-footer --print-to-pdf="$(cygpath -w "$dst" 2>/dev/null || echo "$dst")" \
    "$src" >/dev/null 2>&1

  local size pages fonts
  size=$(stat -c%s "$dst")
  pages=$(grep -a -o '/Count [0-9]*' "$dst" | head -1 | tr -d '/Count ')
  fonts=$(grep -a -c 'FontFile2' "$dst" || true)

  echo "   크기 ${size}B · 페이지 ${pages} · FontFile2 ${fonts}건"
  [ "$size" -gt 50000 ] || { echo "   ✗ 너무 작다 — 폰트 로딩 전에 찍혔을 가능성. 다시 실행."; exit 1; }
  [ "$pages" = "1" ]    || { echo "   ✗ 1페이지가 아니다 (${pages}). 지면 넘침 확인."; exit 1; }
  [ "$fonts" -ge 1 ]    || { echo "   ✗ 폰트가 임베드되지 않았다."; exit 1; }
  echo "   ✓"
}

curl -sf -o /dev/null "$BASE/planning.html" || {
  echo "정적 서버가 안 떠 있다: $BASE"; exit 1; }

render planning "N111_양서형_WeatherPilot_기획.pdf"
render workflow "N111_양서형_WeatherPilot_워크플로우.pdf"
echo "완료 — 인쇄 전 PDF를 열어 눈으로 한 번 더 확인할 것."
