#!/usr/bin/env bash

# 공통 Local Live 설정을 shell 코드로 실행하지 않고 KEY=VALUE 데이터로만 읽는다.
# 이 파일은 직접 실행하지 않고 provider별 launcher에서 source한다.

declare -Ag LIVE_CONTRACT_ENV_VALUES=()
declare -Ag LIVE_CONTRACT_ENV_SEEN=()

live_contract_fail() {
  printf '%s refused: %s\n' "${LIVE_CONTRACT_LABEL:-Live contract}" "$1" >&2
  exit 1
}

live_contract_assert_local_file() {
  local root_dir="$1"
  local env_file="$2"

  [[ -z "${CI:-}" ]] || live_contract_fail "CI execution is forbidden."
  [[ -f "${env_file}" ]] || live_contract_fail ".env.live.local is missing."
  git -C "${root_dir}" check-ignore -q .env.live.local ||
    live_contract_fail ".env.live.local must be ignored by Git."
}

live_contract_load_env() {
  local env_file="$1"
  local raw_line line name value

  LIVE_CONTRACT_ENV_VALUES=()
  LIVE_CONTRACT_ENV_SEEN=()

  while IFS= read -r raw_line || [[ -n "${raw_line}" ]]; do
    # CRLF 파일의 줄 끝 CR만 제거한다. 값 내부의 공백·제어문자는 후속 검증에서 거부한다.
    line="${raw_line%$'\r'}"
    [[ -z "${line}" || "${line}" == \#* ]] && continue
    [[ "${line}" == *=* ]] || live_contract_fail "invalid environment file syntax."

    name="${line%%=*}"
    value="${line#*=}"
    case "${name}" in
      PLACEPICK_EXTERNAL_MODE|NAVER_API_HUB_KEY_ID|NAVER_API_HUB_KEY|\
        PROXY_TOKEN|CHAT_PROXY_URL|EMBEDDING_PROXY_URL|OPENAI_MODEL|\
        OPENAI_EMBEDDING_MODEL)
        ;;
      *) live_contract_fail "unknown environment entry." ;;
    esac

    case "${name}" in
      NAVER_API_HUB_KEY_ID|NAVER_API_HUB_KEY|PROXY_TOKEN)
        [[ -z "${value}" || "${value}" =~ ^[^[:space:][:cntrl:]]+$ ]] ||
          live_contract_fail "${name} contains forbidden whitespace or control characters."
        ;;
    esac

    [[ -z "${LIVE_CONTRACT_ENV_SEEN[${name}]+present}" ]] ||
      live_contract_fail "duplicate environment entry."
    LIVE_CONTRACT_ENV_SEEN["${name}"]=1
    LIVE_CONTRACT_ENV_VALUES["${name}"]="${value}"
  done < "${env_file}"
}

live_contract_value() {
  local name="$1"
  local target="$2"
  printf -v "${target}" '%s' "${LIVE_CONTRACT_ENV_VALUES[${name}]-}"
}

live_contract_require_mode() {
  local mode
  live_contract_value PLACEPICK_EXTERNAL_MODE mode
  [[ "${mode}" == "live-contract" ]] ||
    live_contract_fail "PLACEPICK_EXTERNAL_MODE must be live-contract."
}

live_contract_reject_placeholder() {
  local name="$1"
  local value="$2"
  local normalized="${value,,}"

  case "${normalized}" in
    changeme|change-me|change_me|replace-me|replace_me|placeholder|\
      todo|your-key|your_key|your-token|your_token|'<'*'>'|\
      *'여기에'*|*'api key 입력'*)
      live_contract_fail "${name} must not contain a placeholder."
      ;;
  esac
}

live_contract_require_credential() {
  local name="$1"
  local max_length="$2"
  local value

  live_contract_value "${name}" value
  live_contract_reject_placeholder "${name}" "${value}"
  [[ "${value}" =~ ^[^[:space:][:cntrl:]]{8,${max_length}}$ ]] ||
    live_contract_fail "${name} is missing or malformed."
}

live_contract_require_llm_configuration() {
  local chat_url embedding_url chat_model embedding_model
  local canonical_proxy_url_regex
  canonical_proxy_url_regex='^https://mlapi\.run/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/v1$'

  live_contract_require_credential PROXY_TOKEN 4096
  live_contract_value CHAT_PROXY_URL chat_url
  live_contract_value EMBEDDING_PROXY_URL embedding_url
  live_contract_value OPENAI_MODEL chat_model
  live_contract_value OPENAI_EMBEDDING_MODEL embedding_model

  live_contract_reject_placeholder CHAT_PROXY_URL "${chat_url}"
  live_contract_reject_placeholder EMBEDDING_PROXY_URL "${embedding_url}"
  [[ "${chat_url}" =~ ${canonical_proxy_url_regex} ]] ||
    live_contract_fail "CHAT_PROXY_URL must be the approved canonical HTTPS mlapi.run /v1 base URL."
  [[ "${embedding_url}" =~ ${canonical_proxy_url_regex} ]] ||
    live_contract_fail "EMBEDDING_PROXY_URL must be the approved canonical HTTPS mlapi.run /v1 base URL."
  [[ "${chat_url}" != "${embedding_url}" ]] ||
    live_contract_fail "Chat and embedding proxy URLs must be different."
  [[ "${chat_model}" == "openai/gpt-4.1-mini" ]] ||
    live_contract_fail "OPENAI_MODEL must use the approved exact model pin."
  [[ "${embedding_model}" == "openai/text-embedding-3-small" ]] ||
    live_contract_fail "OPENAI_EMBEDDING_MODEL must use the approved exact model pin."
}

live_contract_clear_parsed_values() {
  LIVE_CONTRACT_ENV_VALUES=()
  LIVE_CONTRACT_ENV_SEEN=()
}
