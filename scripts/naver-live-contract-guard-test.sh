#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
readonly ROOT_DIR
TEST_ROOT="$(mktemp -d)"
readonly TEST_ROOT
EXECUTION_MARKER="${TEST_ROOT}/parser-executed"
readonly EXECUTION_MARKER
trap 'rm -rf -- "${TEST_ROOT}"' EXIT

fail() {
  printf 'Naver live guard test failed: %s\n' "$1" >&2
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

write_env() {
  printf '%s\n' "$@" > "${TEST_ROOT}/.env.live.local"
}

write_valid_naver_env() {
  write_env \
    'PLACEPICK_EXTERNAL_MODE=live-contract' \
    'NAVER_API_HUB_KEY_ID=synthetic-key-id' \
    'NAVER_API_HUB_KEY=synthetic-secret-key' \
    'PROXY_TOKEN=' \
    'CHAT_PROXY_URL=' \
    'EMBEDDING_PROXY_URL=' \
    'OPENAI_MODEL=' \
    'OPENAI_EMBEDDING_MODEL='
}

mkdir -p "${TEST_ROOT}/scripts/lib"
cp "${ROOT_DIR}/scripts/naver-live-contract.sh" "${TEST_ROOT}/scripts/"
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
  "${TEST_ROOT}/scripts/naver-live-contract.sh" \
  "${TEST_ROOT}/scripts/scan-test-reports.sh"

expect_failure "CI execution is forbidden" \
  env CI=true bash "${TEST_ROOT}/scripts/naver-live-contract.sh"

rm -f "${TEST_ROOT}/.env.live.local"
expect_failure ".env.live.local is missing" \
  env -u CI bash "${TEST_ROOT}/scripts/naver-live-contract.sh"

write_env \
  'PLACEPICK_EXTERNAL_MODE=live-contract' \
  'NAVER_API_HUB_KEY_ID=synthetic-key-id' \
  'NAVER_API_HUB_KEY=synthetic-secret-key' \
  'UNEXPECTED_FIELD=blocked'
expect_failure "unknown environment entry" \
  env -u CI bash "${TEST_ROOT}/scripts/naver-live-contract.sh"

write_env \
  'PLACEPICK_EXTERNAL_MODE=live-contract' \
  'NAVER_API_HUB_KEY_ID=synthetic-key-id' \
  'NAVER_API_HUB_KEY_ID=duplicate-key-id' \
  'NAVER_API_HUB_KEY=synthetic-secret-key'
expect_failure "duplicate environment entry" \
  env -u CI bash "${TEST_ROOT}/scripts/naver-live-contract.sh"

write_env \
  'PLACEPICK_EXTERNAL_MODE=mock' \
  'NAVER_API_HUB_KEY_ID=synthetic-key-id' \
  'NAVER_API_HUB_KEY=synthetic-secret-key'
expect_failure "PLACEPICK_EXTERNAL_MODE must be live-contract" \
  env -u CI bash "${TEST_ROOT}/scripts/naver-live-contract.sh"

write_env \
  'PLACEPICK_EXTERNAL_MODE=live-contract' \
  'NAVER_API_HUB_KEY_ID=synthetic-key-id' \
  'NAVER_API_HUB_KEY='
expect_failure "NAVER_API_HUB_KEY is missing or malformed" \
  env -u CI bash "${TEST_ROOT}/scripts/naver-live-contract.sh"

write_env \
  'PLACEPICK_EXTERNAL_MODE=live-contract' \
  'NAVER_API_HUB_KEY_ID=synthetic key id' \
  'NAVER_API_HUB_KEY=synthetic-secret-key'
expect_failure "NAVER_API_HUB_KEY_ID contains forbidden whitespace" \
  env -u CI bash "${TEST_ROOT}/scripts/naver-live-contract.sh"

write_env \
  'PLACEPICK_EXTERNAL_MODE=live-contract' \
  'NAVER_API_HUB_KEY_ID=synthetic-key-id' \
  $'NAVER_API_HUB_KEY=synthetic\001secret'
expect_failure "NAVER_API_HUB_KEY contains forbidden whitespace" \
  env -u CI bash "${TEST_ROOT}/scripts/naver-live-contract.sh"

write_env \
  'PLACEPICK_EXTERNAL_MODE=live-contract' \
  'NAVER_API_HUB_KEY_ID=synthetic-key-id' \
  'NAVER_API_HUB_KEY=replace-me'
expect_failure "NAVER_API_HUB_KEY must not contain a placeholder" \
  env -u CI bash "${TEST_ROOT}/scripts/naver-live-contract.sh"

write_env \
  'PLACEPICK_EXTERNAL_MODE=live-contract' \
  'NAVER_API_HUB_KEY_ID=synthetic-key-id' \
  'NAVER_API_HUB_KEY=synthetic-secret-key' \
  'PROXY_TOKEN=replace-me'
env -u CI FAKE_GRADLE_RECORD="${TEST_ROOT}/gradle-invocation" \
  bash "${TEST_ROOT}/scripts/naver-live-contract.sh"
grep -Fxq 'PROXY_TOKEN=absent' "${TEST_ROOT}/gradle-invocation" ||
  fail "the Naver command validated or exported an unrelated LLM placeholder."

# 값이 shell 문법처럼 보여도 데이터로만 취급되어야 한다.
write_env \
  'PLACEPICK_EXTERNAL_MODE=live-contract' \
  'NAVER_API_HUB_KEY_ID=synthetic-key-id' \
  "NAVER_API_HUB_KEY=\$(touch\${IFS}${EXECUTION_MARKER})"
env -u CI FAKE_GRADLE_RECORD="${TEST_ROOT}/gradle-invocation" \
  bash "${TEST_ROOT}/scripts/naver-live-contract.sh"
[[ ! -e "${EXECUTION_MARKER}" ]] || fail "environment data was executed as shell code."

write_valid_naver_env
env -u CI \
  PROXY_TOKEN=parent-sentinel \
  CHAT_PROXY_URL=parent-sentinel \
  EMBEDDING_PROXY_URL=parent-sentinel \
  OPENAI_MODEL=parent-sentinel \
  OPENAI_EMBEDDING_MODEL=parent-sentinel \
  FAKE_GRADLE_RECORD="${TEST_ROOT}/gradle-invocation" \
  bash "${TEST_ROOT}/scripts/naver-live-contract.sh"

grep -Fxq 'args=:backend:naverLiveContractTest --no-daemon' "${TEST_ROOT}/gradle-invocation" ||
  fail "the valid fixture did not invoke only the dedicated Naver Gradle task."
for name in PLACEPICK_EXTERNAL_MODE NAVER_API_HUB_KEY_ID NAVER_API_HUB_KEY; do
  grep -Fxq "${name}=present" "${TEST_ROOT}/gradle-invocation" ||
    fail "the Naver child process did not receive its required provider scope."
done
for name in PROXY_TOKEN CHAT_PROXY_URL EMBEDDING_PROXY_URL OPENAI_MODEL OPENAI_EMBEDDING_MODEL; do
  grep -Fxq "${name}=absent" "${TEST_ROOT}/gradle-invocation" ||
    fail "the Naver child process received an LLM-only variable."
done

printf 'Naver live contract guard negative tests passed.\n'
