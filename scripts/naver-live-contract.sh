#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
readonly ROOT_DIR
LIVE_ENV_FILE="${ROOT_DIR}/.env.live.local"
readonly LIVE_ENV_FILE
LIVE_CONTRACT_LABEL='Naver live contract'
readonly LIVE_CONTRACT_LABEL
# shellcheck source=scripts/lib/live-contract-env.sh
source "${ROOT_DIR}/scripts/lib/live-contract-env.sh"

live_contract_assert_local_file "${ROOT_DIR}" "${LIVE_ENV_FILE}"
live_contract_load_env "${LIVE_ENV_FILE}"
live_contract_require_mode
live_contract_require_credential NAVER_API_HUB_KEY_ID 1024
live_contract_require_credential NAVER_API_HUB_KEY 1024

mode=''
key_id=''
key=''
live_contract_value PLACEPICK_EXTERNAL_MODE mode
live_contract_value NAVER_API_HUB_KEY_ID key_id
live_contract_value NAVER_API_HUB_KEY key
live_contract_clear_parsed_values

export PLACEPICK_EXTERNAL_MODE="${mode}"
export NAVER_API_HUB_KEY_ID="${key_id}"
export NAVER_API_HUB_KEY="${key}"
unset PROXY_TOKEN CHAT_PROXY_URL EMBEDDING_PROXY_URL OPENAI_MODEL OPENAI_EMBEDDING_MODEL

cd "${ROOT_DIR}"
set +e
./gradlew :backend:naverLiveContractTest --no-daemon
gradle_status=$?
set -e

unset NAVER_API_HUB_KEY_ID NAVER_API_HUB_KEY PLACEPICK_EXTERNAL_MODE
set +e
bash "${ROOT_DIR}/scripts/scan-test-reports.sh" \
  "${ROOT_DIR}/backend/build/test-results/naverLiveContractTest" \
  "${ROOT_DIR}/backend/build/reports/tests/naverLiveContractTest"
scan_status=$?
set -e

(( scan_status == 0 )) || exit "${scan_status}"
exit "${gradle_status}"
