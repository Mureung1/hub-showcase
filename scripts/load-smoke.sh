#!/usr/bin/env bash

set -Eeuo pipefail
# shellcheck source=scripts/lib/common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

ensure_env_file
load_env_file
assert_docker_engine
assert_mock_mode

log 'running one k6 iteration against /actuator/health'
compose_load run --rm --build --no-deps --no-TTY \
  -e PLACEPICK_EXTERNAL_MODE=mock \
  -e "BASE_URL=${BASE_URL:-http://dev:8080}" \
  k6 run /scripts/health-smoke.js
