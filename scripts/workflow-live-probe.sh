#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
readonly ROOT_DIR
LIVE_ENV_FILE="${ROOT_DIR}/.env.live.local"
readonly LIVE_ENV_FILE
LIVE_CONTRACT_LABEL='Workflow split live probe'
readonly LIVE_CONTRACT_LABEL
# shellcheck source=scripts/lib/live-contract-env.sh
source "${ROOT_DIR}/scripts/lib/live-contract-env.sh"

temp_dir=''
gateway_pid=''
# shellcheck disable=SC2317 # trap에서 호출되는 정리 함수다.
cleanup() {
  if [[ -n "${gateway_pid}" ]] && kill -0 "${gateway_pid}" 2>/dev/null; then
    kill "${gateway_pid}" 2>/dev/null || true
    wait "${gateway_pid}" 2>/dev/null || true
  fi
  [[ -z "${temp_dir}" ]] || rm -rf -- "${temp_dir}"
}
trap cleanup EXIT INT TERM

live_contract_assert_local_file "${ROOT_DIR}" "${LIVE_ENV_FILE}"
live_contract_load_env "${LIVE_ENV_FILE}"
live_contract_require_mode
live_contract_require_credential NAVER_API_HUB_KEY_ID 1024
live_contract_require_credential NAVER_API_HUB_KEY 1024
live_contract_require_llm_configuration

approved_sha="${APPROVED_SHA:-}"
[[ "${approved_sha}" =~ ^[0-9a-f]{40}$ ]] ||
  live_contract_fail "APPROVED_SHA must be an exact 40-character lowercase commit SHA."
[[ "$(git -C "${ROOT_DIR}" rev-parse HEAD)" == "${approved_sha}" ]] ||
  live_contract_fail "APPROVED_SHA must exactly match HEAD."
[[ "$(git -C "${ROOT_DIR}" rev-parse origin/main)" == "${approved_sha}" ]] ||
  live_contract_fail "the probe is allowed only for the fetched origin/main SHA."
git -C "${ROOT_DIR}" diff --quiet -- ||
  live_contract_fail "tracked working tree changes must be absent."
git -C "${ROOT_DIR}" diff --cached --quiet -- ||
  live_contract_fail "staged changes must be absent."

command -v node >/dev/null 2>&1 || live_contract_fail "Node.js is required."
command -v curl >/dev/null 2>&1 || live_contract_fail "curl is required."
command -v rg >/dev/null 2>&1 || live_contract_fail "ripgrep is required."
node_major="$(node -p 'process.versions.node.split(".")[0]')"
[[ "${node_major}" == '24' ]] || live_contract_fail "Node.js 24 is required."
[[ -x "${ROOT_DIR}/node_modules/.bin/wrangler" ]] ||
  live_contract_fail "pinned Wrangler is missing; run npm ci in the Dev Container."

mode=''
naver_key_id=''
naver_key=''
proxy_token=''
chat_proxy_url=''
chat_model=''
live_contract_value PLACEPICK_EXTERNAL_MODE mode
live_contract_value NAVER_API_HUB_KEY_ID naver_key_id
live_contract_value NAVER_API_HUB_KEY naver_key
live_contract_value PROXY_TOKEN proxy_token
live_contract_value CHAT_PROXY_URL chat_proxy_url
live_contract_value OPENAI_MODEL chat_model
live_contract_clear_parsed_values

local_token="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')"
port="$(node - <<'NODE'
const net = require('node:net');
const server = net.createServer();
server.listen(0, '127.0.0.1', () => {
  const address = server.address();
  if (typeof address !== 'object' || address === null) process.exit(1);
  process.stdout.write(String(address.port));
  server.close();
});
NODE
)"
[[ "${port}" =~ ^[0-9]+$ ]] || live_contract_fail "a loopback port could not be allocated."

temp_dir="$(mktemp -d)"
gateway_log="${temp_dir}/gateway.log"
gateway_env_file="${temp_dir}/gateway.env"
umask 077
printf '%s=%s\n' \
  'PLACEPICK_EXTERNAL_MODE' "${mode}" \
  'LOCAL_WORKFLOW_TOKEN' "${local_token}" \
  'NAVER_API_HUB_KEY_ID' "${naver_key_id}" \
  'NAVER_API_HUB_KEY' "${naver_key}" \
  'PROXY_TOKEN' "${proxy_token}" \
  'CHAT_PROXY_URL' "${chat_proxy_url}" \
  'OPENAI_MODEL' "${chat_model}" \
  > "${gateway_env_file}"
(
  cd "${ROOT_DIR}/edge"
  exec env \
    -u PLACEPICK_EXTERNAL_MODE \
    -u NAVER_API_HUB_KEY_ID \
    -u NAVER_API_HUB_KEY \
    -u PROXY_TOKEN \
    -u CHAT_PROXY_URL \
    -u EMBEDDING_PROXY_URL \
    -u OPENAI_MODEL \
    -u OPENAI_EMBEDDING_MODEL \
    "${ROOT_DIR}/node_modules/.bin/wrangler" dev \
      --config wrangler.local-workflow-gateway.jsonc \
      --env-file "${gateway_env_file}" \
      --ip 127.0.0.1 \
      --port "${port}" \
      --log-level error
) >"${gateway_log}" 2>&1 &
gateway_pid=$!

gateway_url="http://127.0.0.1:${port}"
ready=false
for _ in $(seq 1 40); do
  if ! kill -0 "${gateway_pid}" 2>/dev/null; then
    break
  fi
  if curl --silent --output /dev/null --max-time 1 "${gateway_url}/"; then
    ready=true
    break
  fi
  sleep 0.25
done
[[ "${ready}" == true ]] || live_contract_fail "the loopback Gateway did not become ready."

cd "${ROOT_DIR}"
set +e
env \
  -u NAVER_API_HUB_KEY_ID \
  -u NAVER_API_HUB_KEY \
  -u PROXY_TOKEN \
  -u CHAT_PROXY_URL \
  -u EMBEDDING_PROXY_URL \
  -u OPENAI_MODEL \
  -u OPENAI_EMBEDDING_MODEL \
  PLACEPICK_EXTERNAL_MODE="${mode}" \
  WORKFLOW_GATEWAY_URL="${gateway_url}" \
  WORKFLOW_GATEWAY_TOKEN="${local_token}" \
  APPROVED_SHA="${approved_sha}" \
  ./gradlew :backend:workflowLiveProbeTest --no-daemon
gradle_status=$?
set -e

kill "${gateway_pid}" 2>/dev/null || true
wait "${gateway_pid}" 2>/dev/null || true
gateway_pid=''

report_roots=(
  "${ROOT_DIR}/backend/build/test-results/workflowLiveProbeTest"
  "${ROOT_DIR}/backend/build/reports/tests/workflowLiveProbeTest"
)
bash "${ROOT_DIR}/scripts/scan-test-reports.sh" "${report_roots[@]}"

evidence_files=("${gateway_log}")
for report_root in "${report_roots[@]}"; do
  [[ -d "${report_root}" ]] || continue
  while IFS= read -r -d '' report_file; do
    evidence_files+=("${report_file}")
  done < <(find "${report_root}" -type f -print0)
done
for secret in "${naver_key_id}" "${naver_key}" "${proxy_token}" "${local_token}"; do
  if grep -Fq -- "${secret}" "${evidence_files[@]}" 2>/dev/null; then
    live_contract_fail "a credential appeared in generated workflow evidence."
  fi
done
if rg --text --quiet --pcre2 \
  'https?://mlapi\.run/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' \
  "${evidence_files[@]}" 2>/dev/null; then
  live_contract_fail "a provider routing URL appeared in generated workflow evidence."
fi

exit "${gradle_status}"
