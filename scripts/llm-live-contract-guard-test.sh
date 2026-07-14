#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
readonly ROOT_DIR
TEST_ROOT="$(mktemp -d)"
readonly TEST_ROOT
trap 'rm -rf -- "${TEST_ROOT}"' EXIT

readonly SYNTHETIC_CHAT_URL='https://mlapi.run/11111111-1111-4111-8111-111111111111/v1'
readonly SYNTHETIC_EMBEDDING_URL='https://mlapi.run/22222222-2222-4222-8222-222222222222/v1'

fail() {
  printf 'LLM live guard test failed: %s\n' "$1" >&2
  exit 1
}

expect_failure() {
  local expected="$1"
  shift
  local output
  if output="$("$@" 2>&1)"; then
    fail "a rejected configuration unexpectedly succeeded."
  fi
  [[ "${output}" == *"${expected}"* ]] ||
    fail "the expected safe rejection was not returned."
}

write_llm_env() {
  local token="$1"
  local chat_url="$2"
  local embedding_url="$3"
  local chat_model="$4"
  local embedding_model="$5"
  printf '%s\n' \
    'PLACEPICK_EXTERNAL_MODE=live-contract' \
    'NAVER_API_HUB_KEY_ID=synthetic-key-id' \
    'NAVER_API_HUB_KEY=synthetic-secret-key' \
    "PROXY_TOKEN=${token}" \
    "CHAT_PROXY_URL=${chat_url}" \
    "EMBEDDING_PROXY_URL=${embedding_url}" \
    "OPENAI_MODEL=${chat_model}" \
    "OPENAI_EMBEDDING_MODEL=${embedding_model}" \
    > "${TEST_ROOT}/.env.live.local"
}

write_valid_llm_env() {
  write_llm_env \
    'synthetic-proxy-token' \
    "${SYNTHETIC_CHAT_URL}" \
    "${SYNTHETIC_EMBEDDING_URL}" \
    'openai/gpt-4.1-mini' \
    'openai/text-embedding-3-small'
}

mkdir -p "${TEST_ROOT}/scripts/lib"
cp "${ROOT_DIR}/scripts/llm-live-contract.sh" "${TEST_ROOT}/scripts/"
cp "${ROOT_DIR}/scripts/scan-test-reports.sh" "${TEST_ROOT}/scripts/"
cp "${ROOT_DIR}/scripts/lib/live-contract-env.sh" "${TEST_ROOT}/scripts/lib/"
printf '.env.live.local\n' > "${TEST_ROOT}/.gitignore"
git -C "${TEST_ROOT}" init --quiet 2>/dev/null

# shellcheck disable=SC2016 # 아래 변수는 생성되는 fake gradlew에서 확장한다.
printf '%s\n' \
  '#!/usr/bin/env bash' \
  'printf "args=%s\n" "$*" > "${FAKE_GRADLE_RECORD:?}"' \
  'for name in PLACEPICK_EXTERNAL_MODE NAVER_API_HUB_KEY_ID NAVER_API_HUB_KEY PROXY_TOKEN CHAT_PROXY_URL EMBEDDING_PROXY_URL OPENAI_MODEL OPENAI_EMBEDDING_MODEL; do' \
  '  if [[ -v "${name}" ]]; then state=present; else state=absent; fi' \
  '  printf "%s=%s\n" "${name}" "${state}" >> "${FAKE_GRADLE_RECORD}"' \
  'done' \
  > "${TEST_ROOT}/gradlew"
chmod +x \
  "${TEST_ROOT}/gradlew" \
  "${TEST_ROOT}/scripts/llm-live-contract.sh" \
  "${TEST_ROOT}/scripts/scan-test-reports.sh"

write_valid_llm_env
expect_failure "CI execution is forbidden" \
  env CI=true bash "${TEST_ROOT}/scripts/llm-live-contract.sh"

write_valid_llm_env
sed -i 's/NAVER_API_HUB_KEY=synthetic-secret-key/NAVER_API_HUB_KEY=replace-me/' \
  "${TEST_ROOT}/.env.live.local"
env -u CI FAKE_GRADLE_RECORD="${TEST_ROOT}/gradle-invocation" \
  bash "${TEST_ROOT}/scripts/llm-live-contract.sh"
grep -Fxq 'NAVER_API_HUB_KEY=absent' "${TEST_ROOT}/gradle-invocation" ||
  fail "the LLM command validated or exported an unrelated Naver placeholder."

rm -f "${TEST_ROOT}/.env.live.local"
expect_failure ".env.live.local is missing" \
  env -u CI bash "${TEST_ROOT}/scripts/llm-live-contract.sh"

write_valid_llm_env
printf 'UNEXPECTED_FIELD=blocked\n' >> "${TEST_ROOT}/.env.live.local"
expect_failure "unknown environment entry" \
  env -u CI bash "${TEST_ROOT}/scripts/llm-live-contract.sh"

write_valid_llm_env
printf 'PROXY_TOKEN=duplicate-token\n' >> "${TEST_ROOT}/.env.live.local"
expect_failure "duplicate environment entry" \
  env -u CI bash "${TEST_ROOT}/scripts/llm-live-contract.sh"

write_llm_env \
  '' "${SYNTHETIC_CHAT_URL}" "${SYNTHETIC_EMBEDDING_URL}" \
  'openai/gpt-4.1-mini' 'openai/text-embedding-3-small'
expect_failure "PROXY_TOKEN is missing or malformed" \
  env -u CI bash "${TEST_ROOT}/scripts/llm-live-contract.sh"

write_llm_env \
  'replace-me' "${SYNTHETIC_CHAT_URL}" "${SYNTHETIC_EMBEDDING_URL}" \
  'openai/gpt-4.1-mini' 'openai/text-embedding-3-small'
expect_failure "PROXY_TOKEN must not contain a placeholder" \
  env -u CI bash "${TEST_ROOT}/scripts/llm-live-contract.sh"

write_llm_env \
  'synthetic proxy token' "${SYNTHETIC_CHAT_URL}" "${SYNTHETIC_EMBEDDING_URL}" \
  'openai/gpt-4.1-mini' 'openai/text-embedding-3-small'
expect_failure "PROXY_TOKEN contains forbidden whitespace" \
  env -u CI bash "${TEST_ROOT}/scripts/llm-live-contract.sh"

invalid_urls=(
  'http://mlapi.run/11111111-1111-4111-8111-111111111111/v1'
  'https://user@mlapi.run/11111111-1111-4111-8111-111111111111/v1'
  'https://mlapi.run:8443/11111111-1111-4111-8111-111111111111/v1'
  'https://mlapi.run.evil.example/11111111-1111-4111-8111-111111111111/v1'
  'https://mlapi.run/11111111-1111-4111-8111-111111111111/v1/extra'
  'https://mlapi.run/11111111-1111-4111-8111-111111111111/v1?query=blocked'
  'https://mlapi.run/11111111-1111-4111-8111-111111111111/v1#blocked'
  'https://mlapi.run/AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA/v1'
)
for invalid_url in "${invalid_urls[@]}"; do
  write_llm_env \
    'synthetic-proxy-token' "${invalid_url}" "${SYNTHETIC_EMBEDDING_URL}" \
    'openai/gpt-4.1-mini' 'openai/text-embedding-3-small'
  expect_failure "CHAT_PROXY_URL must be the approved canonical" \
    env -u CI bash "${TEST_ROOT}/scripts/llm-live-contract.sh"
done

write_llm_env \
  'synthetic-proxy-token' "${SYNTHETIC_CHAT_URL}" 'https://invalid.example/v1' \
  'openai/gpt-4.1-mini' 'openai/text-embedding-3-small'
expect_failure "EMBEDDING_PROXY_URL must be the approved canonical" \
  env -u CI bash "${TEST_ROOT}/scripts/llm-live-contract.sh"

write_llm_env \
  'synthetic-proxy-token' "${SYNTHETIC_CHAT_URL}" "${SYNTHETIC_CHAT_URL}" \
  'openai/gpt-4.1-mini' 'openai/text-embedding-3-small'
expect_failure "Chat and embedding proxy URLs must be different" \
  env -u CI bash "${TEST_ROOT}/scripts/llm-live-contract.sh"

write_llm_env \
  'synthetic-proxy-token' "${SYNTHETIC_CHAT_URL}" "${SYNTHETIC_EMBEDDING_URL}" \
  'openai/gpt-4.1' 'openai/text-embedding-3-small'
expect_failure "OPENAI_MODEL must use the approved exact model pin" \
  env -u CI bash "${TEST_ROOT}/scripts/llm-live-contract.sh"

write_llm_env \
  'synthetic-proxy-token' "${SYNTHETIC_CHAT_URL}" "${SYNTHETIC_EMBEDDING_URL}" \
  'openai/gpt-4.1-mini' 'openai/text-embedding-3-large'
expect_failure "OPENAI_EMBEDDING_MODEL must use the approved exact model pin" \
  env -u CI bash "${TEST_ROOT}/scripts/llm-live-contract.sh"

write_valid_llm_env
env -u CI \
  NAVER_API_HUB_KEY_ID=parent-sentinel \
  NAVER_API_HUB_KEY=parent-sentinel \
  FAKE_GRADLE_RECORD="${TEST_ROOT}/gradle-invocation" \
  bash "${TEST_ROOT}/scripts/llm-live-contract.sh"

grep -Fxq 'args=:backend:llmLiveContractTest --no-daemon' "${TEST_ROOT}/gradle-invocation" ||
  fail "the valid fixture did not invoke only the dedicated LLM Gradle task."
for name in PLACEPICK_EXTERNAL_MODE PROXY_TOKEN CHAT_PROXY_URL EMBEDDING_PROXY_URL OPENAI_MODEL OPENAI_EMBEDDING_MODEL; do
  grep -Fxq "${name}=present" "${TEST_ROOT}/gradle-invocation" ||
    fail "the LLM child process did not receive its required provider scope."
done
for name in NAVER_API_HUB_KEY_ID NAVER_API_HUB_KEY; do
  grep -Fxq "${name}=absent" "${TEST_ROOT}/gradle-invocation" ||
    fail "the LLM child process received a Naver-only variable."
done

printf 'LLM live contract guard negative tests passed.\n'
