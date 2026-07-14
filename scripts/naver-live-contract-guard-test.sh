#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
readonly ROOT_DIR
TEST_ROOT="$(mktemp -d)"
readonly TEST_ROOT
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
  [[ "${output}" == *"${expected}"* ]] || fail "the expected safe rejection was not returned."
}

write_env() {
  printf '%s\n' "$@" > "${TEST_ROOT}/.env.live.local"
}

mkdir -p "${TEST_ROOT}/scripts"
cp "${ROOT_DIR}/scripts/naver-live-contract.sh" "${TEST_ROOT}/scripts/"
printf '.env.live.local\n' > "${TEST_ROOT}/.gitignore"
git -C "${TEST_ROOT}" init --quiet 2>/dev/null

# shellcheck disable=SC2016 # 아래 변수는 생성되는 fake gradlew에서 확장한다.
printf '%s\n' \
  '#!/usr/bin/env bash' \
  'printf "%s\n" "$*" > "${FAKE_GRADLE_RECORD:?}"' \
  > "${TEST_ROOT}/gradlew"
chmod +x "${TEST_ROOT}/gradlew" "${TEST_ROOT}/scripts/naver-live-contract.sh"

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
expect_failure "duplicate key ID entry" \
  env -u CI bash "${TEST_ROOT}/scripts/naver-live-contract.sh"

write_env \
  'PLACEPICK_EXTERNAL_MODE=live-contract' \
  'NAVER_API_HUB_KEY_ID=synthetic-key-id' \
  'NAVER_API_HUB_KEY='
expect_failure "key is missing or malformed" \
  env -u CI bash "${TEST_ROOT}/scripts/naver-live-contract.sh"

write_env \
  'PLACEPICK_EXTERNAL_MODE=live-contract' \
  'NAVER_API_HUB_KEY_ID=synthetic-key-id' \
  'NAVER_API_HUB_KEY=synthetic-secret-key'
env -u CI FAKE_GRADLE_RECORD="${TEST_ROOT}/gradle-invocation" \
  bash "${TEST_ROOT}/scripts/naver-live-contract.sh"
grep -Fxq ':backend:liveContractTest --no-daemon' "${TEST_ROOT}/gradle-invocation" ||
  fail "the valid fixture did not invoke only the dedicated Gradle task."

printf 'Naver live contract guard negative tests passed.\n'
