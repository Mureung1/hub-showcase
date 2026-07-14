#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
readonly ROOT_DIR
LIVE_ENV_FILE="${ROOT_DIR}/.env.live.local"
readonly LIVE_ENV_FILE
LIVE_CONTRACT_LABEL='LLM live contract'
readonly LIVE_CONTRACT_LABEL
# shellcheck source=scripts/lib/live-contract-env.sh
source "${ROOT_DIR}/scripts/lib/live-contract-env.sh"

live_contract_assert_local_file "${ROOT_DIR}" "${LIVE_ENV_FILE}"
live_contract_load_env "${LIVE_ENV_FILE}"
live_contract_require_mode
live_contract_require_llm_configuration

mode=''
proxy_token=''
chat_proxy_url=''
embedding_proxy_url=''
chat_model=''
embedding_model=''
live_contract_value PLACEPICK_EXTERNAL_MODE mode
live_contract_value PROXY_TOKEN proxy_token
live_contract_value CHAT_PROXY_URL chat_proxy_url
live_contract_value EMBEDDING_PROXY_URL embedding_proxy_url
live_contract_value OPENAI_MODEL chat_model
live_contract_value OPENAI_EMBEDDING_MODEL embedding_model
live_contract_clear_parsed_values

export PLACEPICK_EXTERNAL_MODE="${mode}"
export PROXY_TOKEN="${proxy_token}"
export CHAT_PROXY_URL="${chat_proxy_url}"
export EMBEDDING_PROXY_URL="${embedding_proxy_url}"
export OPENAI_MODEL="${chat_model}"
export OPENAI_EMBEDDING_MODEL="${embedding_model}"
unset NAVER_API_HUB_KEY_ID NAVER_API_HUB_KEY

cd "${ROOT_DIR}"
set +e
./gradlew :backend:llmLiveContractTest --no-daemon
gradle_status=$?
set -e

unset PROXY_TOKEN CHAT_PROXY_URL EMBEDDING_PROXY_URL OPENAI_MODEL \
  OPENAI_EMBEDDING_MODEL PLACEPICK_EXTERNAL_MODE
set +e
bash "${ROOT_DIR}/scripts/scan-test-reports.sh" \
  "${ROOT_DIR}/backend/build/test-results/llmLiveContractTest" \
  "${ROOT_DIR}/backend/build/reports/tests/llmLiveContractTest"
scan_status=$?
set -e

(( scan_status == 0 )) || exit "${scan_status}"
exit "${gradle_status}"
