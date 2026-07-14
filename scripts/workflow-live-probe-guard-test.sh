#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
readonly ROOT_DIR
TEST_ROOT="$(mktemp -d)"
readonly TEST_ROOT
trap 'rm -rf -- "${TEST_ROOT}"' EXIT

fail() {
  printf 'Workflow live probe guard test failed: %s\n' "$1" >&2
  exit 1
}

expect_failure() {
  local expected="$1"
  shift
  local output
  if output="$("$@" 2>&1)"; then
    fail "a rejected workflow probe configuration unexpectedly succeeded."
  fi
  [[ "${output}" == *"${expected}"* ]] ||
    fail "the expected safe workflow rejection was not returned."
}

mkdir -p \
  "${TEST_ROOT}/scripts/lib" \
  "${TEST_ROOT}/edge" \
  "${TEST_ROOT}/node_modules/.bin" \
  "${TEST_ROOT}/fake-bin"
cp "${ROOT_DIR}/scripts/workflow-live-probe.sh" "${TEST_ROOT}/scripts/"
cp "${ROOT_DIR}/scripts/scan-test-reports.sh" "${TEST_ROOT}/scripts/"
cp "${ROOT_DIR}/scripts/lib/live-contract-env.sh" "${TEST_ROOT}/scripts/lib/"
cp "${ROOT_DIR}/edge/wrangler.local-workflow-gateway.jsonc" "${TEST_ROOT}/edge/"
chmod +x "${TEST_ROOT}/scripts/workflow-live-probe.sh"

cat > "${TEST_ROOT}/.env.live.local" <<'ENV'
PLACEPICK_EXTERNAL_MODE=live-contract
NAVER_API_HUB_KEY_ID=synthetic-key-id
NAVER_API_HUB_KEY=synthetic-secret-key
PROXY_TOKEN=synthetic-proxy-token
CHAT_PROXY_URL=https://mlapi.run/11111111-1111-4111-8111-111111111111/v1
EMBEDDING_PROXY_URL=https://mlapi.run/22222222-2222-4222-8222-222222222222/v1
OPENAI_MODEL=openai/gpt-4.1-mini
OPENAI_EMBEDDING_MODEL=openai/text-embedding-3-small
ENV
printf '.env.live.local\n' > "${TEST_ROOT}/.gitignore"

cat > "${TEST_ROOT}/fake-bin/node" <<'NODE'
#!/usr/bin/env bash
case "${1:-}" in
  -p) printf '24\n' ;;
  -e) printf '%s' 'lllllllllllllllllllllllllllllllllllllllllll' ;;
  -) cat >/dev/null; printf '18765\n' ;;
  *) exit 1 ;;
esac
NODE
cat > "${TEST_ROOT}/fake-bin/curl" <<'CURL'
#!/usr/bin/env bash
exit 0
CURL
cat > "${TEST_ROOT}/node_modules/.bin/wrangler" <<'WRANGLER'
#!/usr/bin/env bash
env_file=''
while (( $# > 0 )); do
  if [[ "$1" == '--env-file' ]]; then
    env_file="${2:-}"
    shift 2
  else
    shift
  fi
done
[[ -f "${env_file}" ]] || exit 2
{
  for name in PLACEPICK_EXTERNAL_MODE LOCAL_WORKFLOW_TOKEN NAVER_API_HUB_KEY_ID NAVER_API_HUB_KEY PROXY_TOKEN CHAT_PROXY_URL OPENAI_MODEL; do
    if grep -Eq "^${name}=.+$" "${env_file}"; then state=present; else state=absent; fi
    printf '%s=%s\n' "${name}" "${state}"
  done
  for name in PLACEPICK_EXTERNAL_MODE NAVER_API_HUB_KEY_ID NAVER_API_HUB_KEY PROXY_TOKEN CHAT_PROXY_URL EMBEDDING_PROXY_URL OPENAI_MODEL OPENAI_EMBEDDING_MODEL; do
    if [[ -v "${name}" ]]; then state=present; else state=absent; fi
    printf 'process_%s=%s\n' "${name}" "${state}"
  done
} > "${FAKE_GATEWAY_RECORD:?}"
trap 'exit 0' TERM INT
while true; do sleep 1; done
WRANGLER
cat > "${TEST_ROOT}/gradlew" <<'GRADLE'
#!/usr/bin/env bash
{
  printf 'args=%s\n' "$*"
  for name in PLACEPICK_EXTERNAL_MODE WORKFLOW_GATEWAY_URL WORKFLOW_GATEWAY_TOKEN APPROVED_SHA NAVER_API_HUB_KEY_ID NAVER_API_HUB_KEY PROXY_TOKEN CHAT_PROXY_URL EMBEDDING_PROXY_URL OPENAI_MODEL OPENAI_EMBEDDING_MODEL; do
    if [[ -v "${name}" ]]; then state=present; else state=absent; fi
    printf '%s=%s\n' "${name}" "${state}"
  done
} > "${FAKE_GRADLE_RECORD:?}"
GRADLE
chmod +x \
  "${TEST_ROOT}/fake-bin/node" \
  "${TEST_ROOT}/fake-bin/curl" \
  "${TEST_ROOT}/node_modules/.bin/wrangler" \
  "${TEST_ROOT}/gradlew"

git -C "${TEST_ROOT}" init --quiet
git -C "${TEST_ROOT}" config user.email 'guard@example.invalid'
git -C "${TEST_ROOT}" config user.name 'Workflow Guard'
git -C "${TEST_ROOT}" add .gitignore scripts edge node_modules/.bin/wrangler gradlew fake-bin
git -C "${TEST_ROOT}" commit --quiet -m 'guard fixture'
head_sha="$(git -C "${TEST_ROOT}" rev-parse HEAD)"
git -C "${TEST_ROOT}" update-ref refs/remotes/origin/main "${head_sha}"

common_env=(
  env -u CI
  PATH="${TEST_ROOT}/fake-bin:${PATH}"
  FAKE_GATEWAY_RECORD="${TEST_ROOT}/gateway-record"
  FAKE_GRADLE_RECORD="${TEST_ROOT}/gradle-record"
)

expect_failure "CI execution is forbidden" \
  env CI=true APPROVED_SHA="${head_sha}" PATH="${TEST_ROOT}/fake-bin:${PATH}" \
    bash "${TEST_ROOT}/scripts/workflow-live-probe.sh"

expect_failure "APPROVED_SHA must be an exact" \
  "${common_env[@]}" bash "${TEST_ROOT}/scripts/workflow-live-probe.sh"

expect_failure "APPROVED_SHA must exactly match HEAD" \
  "${common_env[@]}" APPROVED_SHA="$(printf '0%.0s' {1..40})" \
    bash "${TEST_ROOT}/scripts/workflow-live-probe.sh"

printf 'tracked change\n' >> "${TEST_ROOT}/scripts/scan-test-reports.sh"
expect_failure "tracked working tree changes must be absent" \
  "${common_env[@]}" APPROVED_SHA="${head_sha}" \
    bash "${TEST_ROOT}/scripts/workflow-live-probe.sh"
git -C "${TEST_ROOT}" checkout --quiet -- scripts/scan-test-reports.sh

"${common_env[@]}" APPROVED_SHA="${head_sha}" \
  bash "${TEST_ROOT}/scripts/workflow-live-probe.sh"

grep -Fxq 'args=:backend:workflowLiveProbeTest --no-daemon' "${TEST_ROOT}/gradle-record" ||
  fail "the dedicated workflow Gradle task was not invoked."
for name in PLACEPICK_EXTERNAL_MODE WORKFLOW_GATEWAY_URL WORKFLOW_GATEWAY_TOKEN APPROVED_SHA; do
  grep -Fxq "${name}=present" "${TEST_ROOT}/gradle-record" ||
    fail "the Java workflow process missed ${name}."
done
for name in NAVER_API_HUB_KEY_ID NAVER_API_HUB_KEY PROXY_TOKEN CHAT_PROXY_URL EMBEDDING_PROXY_URL OPENAI_MODEL OPENAI_EMBEDDING_MODEL; do
  grep -Fxq "${name}=absent" "${TEST_ROOT}/gradle-record" ||
    fail "the Java workflow process received raw provider configuration: ${name}."
done
for name in LOCAL_WORKFLOW_TOKEN NAVER_API_HUB_KEY_ID NAVER_API_HUB_KEY PROXY_TOKEN CHAT_PROXY_URL OPENAI_MODEL; do
  grep -Fxq "${name}=present" "${TEST_ROOT}/gateway-record" ||
    fail "the loopback Gateway missed ${name}."
done
grep -Fxq 'PLACEPICK_EXTERNAL_MODE=present' "${TEST_ROOT}/gateway-record" ||
  fail 'the loopback Gateway missed PLACEPICK_EXTERNAL_MODE.'
for name in PLACEPICK_EXTERNAL_MODE NAVER_API_HUB_KEY_ID NAVER_API_HUB_KEY PROXY_TOKEN CHAT_PROXY_URL EMBEDDING_PROXY_URL OPENAI_MODEL OPENAI_EMBEDDING_MODEL; do
  grep -Fxq "process_${name}=absent" "${TEST_ROOT}/gateway-record" ||
    fail "the Wrangler process inherited raw provider configuration: ${name}."
done

printf 'Workflow split live probe guard negative tests passed.\n'
