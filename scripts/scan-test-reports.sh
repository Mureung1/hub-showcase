#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
readonly ROOT_DIR

command -v rg >/dev/null 2>&1 || {
  printf 'Test report safety scan refused: rg is required.\n' >&2
  exit 1
}

if (( $# == 0 )); then
  set -- \
    "${ROOT_DIR}/backend/build/test-results" \
    "${ROOT_DIR}/backend/build/reports/tests"
fi

report_files=()
for report_root in "$@"; do
  [[ -e "${report_root}" ]] || continue
  while IFS= read -r -d '' report_file; do
    report_files+=("${report_file}")
  done < <(find "${report_root}" -type f -print0)
done

forbidden_patterns=(
  'synthetic-proxy-token'
  'synthetic-response-secret-marker'
  'https?://mlapi\.run/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  'authorization.{0,32}bearer[[:space:]]+[a-z0-9._~+/=-]+'
  'proxy_token=[^<[:space:]]+'
  'naver_api_hub_key(_id)?=[^<[:space:]]+'
  '"embedding"[[:space:]]*:[[:space:]]*\['
  '"status"[[:space:]]*:[[:space:]]*"ok"'
)

leaked_files=()
for report_file in "${report_files[@]}"; do
  for pattern in "${forbidden_patterns[@]}"; do
    set +e
    rg --text --quiet --ignore-case --pcre2 --regexp "${pattern}" "${report_file}"
    scan_status=$?
    set -e
    case "${scan_status}" in
      0)
        leaked_files+=("${report_file}")
        break
        ;;
      1) ;;
      *)
        printf 'Test report safety scan could not inspect: %s\n' "${report_file}" >&2
        exit 1
        ;;
    esac
  done
done

if (( ${#leaked_files[@]} > 0 )); then
  printf 'Test report safety scan failed; blocked files:\n' >&2
  printf ' - %s\n' "${leaked_files[@]}" >&2
  exit 1
fi

printf 'Test report safety scan passed (%d files).\n' "${#report_files[@]}"
