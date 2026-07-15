#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
readonly ROOT_DIR
TEST_ROOT="$(mktemp -d)"
readonly TEST_ROOT
trap 'rm -rf -- "${TEST_ROOT}"' EXIT

fail() {
  printf 'Test report safety scanner regression failed: %s\n' "$1" >&2
  exit 1
}

expect_rejected() {
  local content="$1"
  local output
  printf '%s\n' "${content}" > "${TEST_ROOT}/report.xml"
  if output="$(bash "${ROOT_DIR}/scripts/scan-test-reports.sh" "${TEST_ROOT}" 2>&1)"; then
    fail "a forbidden report payload was accepted."
  fi
  [[ "${output}" != *"${content}"* ]] ||
    fail "the rejected payload was echoed by the scanner."
}

printf '<testsuite tests="1"><testcase name="safe"/></testsuite>\n' \
  > "${TEST_ROOT}/report.xml"
bash "${ROOT_DIR}/scripts/scan-test-reports.sh" "${TEST_ROOT}" >/dev/null

expect_rejected 'synthetic-response-secret-marker'
expect_rejected 'https://mlapi.run/11111111-1111-4111-8111-111111111111/v1'
expect_rejected 'Authorization: Bearer synthetic-sensitive-value'
expect_rejected '{"embedding":[0.1,0.2]}'
expect_rejected '검증된 장소 정보에 따라 이 후보를 제안합니다.'
expect_rejected '연결된 블로그 근거를 함께 확인할 수 있습니다.'

printf '\000safe-prefix\000Authorization: Bearer synthetic-binary-secret\000' \
  > "${TEST_ROOT}/report.bin"
if output="$(bash "${ROOT_DIR}/scripts/scan-test-reports.sh" "${TEST_ROOT}" 2>&1)"; then
  fail "a forbidden binary report payload was accepted."
fi
[[ "${output}" != *"synthetic-binary-secret"* ]] ||
  fail "the rejected binary payload was echoed by the scanner."

mkdir -p "${TEST_ROOT}/no-rg-bin"
ln -s "$(command -v dirname)" "${TEST_ROOT}/no-rg-bin/dirname"
if PATH="${TEST_ROOT}/no-rg-bin" /bin/bash \
  "${ROOT_DIR}/scripts/scan-test-reports.sh" "${TEST_ROOT}" >/dev/null 2>&1; then
  fail "the scanner did not fail closed when rg was unavailable."
fi

mkdir -p "${TEST_ROOT}/broken-find-bin"
cat > "${TEST_ROOT}/broken-find-bin/find" <<'FIND'
#!/usr/bin/env bash
exit 2
FIND
chmod +x "${TEST_ROOT}/broken-find-bin/find"
if output="$(PATH="${TEST_ROOT}/broken-find-bin:${PATH}" bash \
  "${ROOT_DIR}/scripts/scan-test-reports.sh" "${TEST_ROOT}" 2>&1)"; then
  fail "the scanner did not fail closed when report discovery failed."
fi
[[ "${output}" == *"could not enumerate report files"* ]] ||
  fail "the scanner did not return its safe report discovery error."

printf 'Test report safety scanner regression tests passed.\n'
