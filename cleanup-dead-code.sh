#!/usr/bin/env bash
# ============================================================
#  cleanup-dead-code.sh  —  1단계: 죽은/외래 코드 제거
# ------------------------------------------------------------
#  실행 위치: 프로젝트 루트 (backend/ 와 frontend/ 가 보이는 폴더)
#
#  기본은 "미리보기"라 아무것도 지우지 않는다.
#    bash cleanup-dead-code.sh                      # 무엇을 지울지 목록만 출력
#    bash cleanup-dead-code.sh --apply              # 실제 삭제 (안전 세트)
#    bash cleanup-dead-code.sh --apply --include-migrations
#                                                   # V3/V5/V6 마이그레이션까지 삭제
#                                                   # (V1 재작성과 짝이라 기본은 제외)
#    bash cleanup-dead-code.sh --apply --include-auto-merge
#                                                   # auto-merge.yml 까지 삭제
#
#  ⚠️ 실행 전에 반드시:
#     git switch -c cleanup/dead-code       # 새 브랜치에서
#     git add -A && git commit -m "wip"     # 현재 상태 커밋 (되돌릴 안전줄)
# ============================================================

set -euo pipefail

APPLY=0
INCLUDE_MIGRATIONS=0
INCLUDE_AUTO_MERGE=0

for arg in "$@"; do
  case "$arg" in
    --apply)               APPLY=1 ;;
    --include-migrations)  INCLUDE_MIGRATIONS=1 ;;
    --include-auto-merge)  INCLUDE_AUTO_MERGE=1 ;;
    *) echo "알 수 없는 옵션: $arg"; exit 1 ;;
  esac
done

# ── 색상 ────────────────────────────────────────────────────
C_CYAN=$'\033[36m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'
C_GRAY=$'\033[90m'; C_RED=$'\033[31m'; C_OFF=$'\033[0m'

# ── 0. 프리플라이트 ─────────────────────────────────────────
if [[ ! -d backend || ! -d frontend ]]; then
  echo "${C_RED}여기는 프로젝트 루트가 아닙니다. backend/ 와 frontend/ 가 있는 폴더에서 실행하세요.${C_OFF}"
  exit 1
fi

if [[ $APPLY -eq 1 ]]; then MODE="삭제 실행"; else MODE="미리보기 (아무것도 지우지 않음)"; fi
echo ""
echo "${C_CYAN}==================================================${C_OFF}"
echo "${C_CYAN}  모드: ${MODE}${C_OFF}"
echo "${C_CYAN}==================================================${C_OFF}"

# git 상태 경고 (커밋 안 했으면 되돌리기 어렵다)
if [[ $APPLY -eq 1 ]] && command -v git >/dev/null 2>&1; then
  if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
    echo ""
    echo "${C_YELLOW}⚠️ 커밋되지 않은 변경이 있습니다. 지금 삭제하면 되돌리기 어렵습니다.${C_OFF}"
    read -r -p "   그래도 진행할까요? (y/N) " ans
    if [[ "$ans" != "y" ]]; then echo "중단했습니다."; exit 0; fi
  fi
fi

# ── 삭제 헬퍼 ───────────────────────────────────────────────
removed=0
skipped=0

kill_path() {  # $1=경로  $2=이유
  local path="$1" reason="$2"
  if [[ -e "$path" ]]; then
    printf "  ${C_YELLOW}[삭제] %-52s %s${C_OFF}\n" "$path" "$reason"
    if [[ $APPLY -eq 1 ]]; then rm -rf -- "$path"; fi
    removed=$((removed+1))
  else
    printf "  ${C_GRAY}[없음] %-52s (이미 없음)${C_OFF}\n" "$path"
    skipped=$((skipped+1))
  fi
}

group() { echo ""; echo "${C_GREEN}── $1${C_OFF}"; }

# ============================================================
#  A. 인증 A세대 (com.hub.auth) — B세대와 중복, 부팅 블로커
#     검증: auth 패키지 밖에서 import 0건
# ============================================================
group "A. 인증 A세대 제거 (com.hub.auth 패키지 전체)"
kill_path "backend/src/main/java/com/hub/auth" "B세대와 중복 · 설정키 불일치"
kill_path "backend/src/main/resources/application-auth.yml.example" "A세대 auth 설정 예시(jwt.secret, lineup.*)"

# ============================================================
#  B. 북마크 슬라이스 — 외래 MySQL 과제, Company 없는 JPQL
#     검증: bookmark 패키지 밖에서 import 0건
# ============================================================
group "B. 북마크 슬라이스 제거 (범위 밖 · 외래 조각)"
kill_path "backend/src/main/java/com/hub/bookmark" "Company 엔티티 없는 JPQL · userId 파라미터 보안구멍"
kill_path "frontend/src/components/Bookmarks.jsx" "하드코딩 USER_ID=1 · import 안 됨"
kill_path "REQUIREMENTS.md" "북마크 과제 명세 (기획서 범위 밖)"
kill_path ".claude/agents/feature-verifier.md" "'MySQL 스택' 전제의 북마크 검증 에이전트"

# ============================================================
#  C. lineup / 이메일인증 UI 잔재 — 어디서도 import 안 되는 dead code
# ============================================================
group "C. lineup · 이메일인증 UI 잔재 제거 (dead code)"
kill_path "LineupIntro.jsx" "lineup 프로젝트 소개 컴포넌트 · import 안 됨"
kill_path "frontend/src/components/SignupForm.jsx" "A세대 코드/verify 가입 UI · import 안 됨"

# ============================================================
#  D. 빌드 산출물
# ============================================================
group "D. 스테일 빌드 산출물 제거"
kill_path ".next-hub" "이전 Next 빌드 산출물"

# ============================================================
#  E. (선택) 마이그레이션 V3/V5/V6
#     V1 재작성과 짝이라 기본은 제외. --include-migrations 로만 삭제.
#     ⚠️ 로컬 DB에 이미 적용됐다면, 다음 단계에서 DB를 drop/recreate 해야 함.
# ============================================================
if [[ $INCLUDE_MIGRATIONS -eq 1 ]]; then
  group "E. 깨진 마이그레이션 제거 (V1 재작성과 함께 진행)"
  kill_path "backend/src/main/resources/db/migration/V3__matching_precision.sql" "테이블명 단수 · app_user 없음"
  kill_path "backend/src/main/resources/db/migration/V5__bookmarks.sql" "MySQL 문법 (Postgres 불가)"
  kill_path "backend/src/main/resources/db/migration/V6__auth.sql" "MySQL 문법 · password_hash 중복"
else
  echo ""
  echo "${C_GRAY}── E. 마이그레이션 (건너뜀)${C_OFF}"
  echo "${C_GRAY}     V3/V5/V6 는 V1 재작성과 함께 지우는 게 안전합니다.${C_OFF}"
  echo "${C_GRAY}     지금 지우려면: --include-migrations 옵션 추가${C_OFF}"
fi

# ============================================================
#  F. (선택) 부트캠프 auto-merge 워크플로
# ============================================================
if [[ $INCLUDE_AUTO_MERGE -eq 1 ]]; then
  group "F. 부트캠프 auto-merge 워크플로 제거"
  kill_path ".github/workflows/auto-merge.yml" "crong 자동 머지 자동화 (제품 코드 아님)"
else
  echo ""
  echo "${C_GRAY}── F. auto-merge.yml (건너뜀)${C_OFF}"
  echo "${C_GRAY}     PR 자동머지 플로우를 안 쓰면: --include-auto-merge 로 삭제${C_OFF}"
fi

# ── 요약 ────────────────────────────────────────────────────
echo ""
echo "${C_CYAN}==================================================${C_OFF}"
if [[ $APPLY -eq 1 ]]; then
  echo "${C_CYAN}  완료: ${removed} 개 삭제, ${skipped} 개 건너뜀${C_OFF}"
  echo ""
  echo "${C_CYAN}  다음 확인:${C_OFF}"
  echo "    1) git status  로 지워진 목록 확인"
  echo "    2) 아직 컴파일은 안 됩니다 (다음 단계: V1 재작성 + 엔티티 보강)"
else
  echo "${C_CYAN}  미리보기 끝: 위 [삭제] 항목이 실제로 지워질 대상입니다.${C_OFF}"
  echo "${C_CYAN}  실제로 지우려면:  bash cleanup-dead-code.sh --apply${C_OFF}"
fi
echo "${C_CYAN}==================================================${C_OFF}"
echo ""
