#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
readonly ROOT_DIR
LIVE_ENV_FILE="${ROOT_DIR}/.env.live.local"
readonly LIVE_ENV_FILE

fail() {
  printf 'Naver live contract refused: %s\n' "$1" >&2
  exit 1
}

[[ -z "${CI:-}" ]] || fail "CI execution is forbidden."
[[ -f "${LIVE_ENV_FILE}" ]] || fail ".env.live.local is missing."
git -C "${ROOT_DIR}" check-ignore -q .env.live.local || fail ".env.live.local must be ignored by Git."

mode=""
key_id=""
key=""
seen_mode=0
seen_key_id=0
seen_key=0

while IFS= read -r raw_line || [[ -n "${raw_line}" ]]; do
  line="${raw_line%$'\r'}"
  [[ -z "${line}" || "${line}" == \#* ]] && continue
  [[ "${line}" == *=* ]] || fail "invalid environment file syntax."
  name="${line%%=*}"
  value="${line#*=}"
  case "${name}" in
    PLACEPICK_EXTERNAL_MODE)
      (( seen_mode == 0 )) || fail "duplicate mode entry."
      mode="${value}"
      seen_mode=1
      ;;
    NAVER_API_HUB_KEY_ID)
      (( seen_key_id == 0 )) || fail "duplicate key ID entry."
      key_id="${value}"
      seen_key_id=1
      ;;
    NAVER_API_HUB_KEY)
      (( seen_key == 0 )) || fail "duplicate key entry."
      key="${value}"
      seen_key=1
      ;;
    *) fail "unknown environment entry." ;;
  esac
done < "${LIVE_ENV_FILE}"

[[ "${mode}" == "live-contract" ]] || fail "PLACEPICK_EXTERNAL_MODE must be live-contract."
[[ "${key_id}" =~ ^[^[:space:][:cntrl:]]{8,1024}$ ]] || fail "key ID is missing or malformed."
[[ "${key}" =~ ^[^[:space:][:cntrl:]]{8,1024}$ ]] || fail "key is missing or malformed."

export PLACEPICK_EXTERNAL_MODE="${mode}"
export NAVER_API_HUB_KEY_ID="${key_id}"
export NAVER_API_HUB_KEY="${key}"

cd "${ROOT_DIR}"
exec ./gradlew :backend:liveContractTest --no-daemon
