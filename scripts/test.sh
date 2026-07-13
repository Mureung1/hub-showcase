#!/usr/bin/env bash

set -Eeuo pipefail
# shellcheck source=scripts/lib/common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

test_kind="${1:-}"
assert_java17

case "${test_kind}" in
  unit)
    log 'running unit tests (Docker-free)'
    gradlew :backend:test
    ;;
  integration)
    assert_docker_engine
    export TESTCONTAINERS_HOST_OVERRIDE="${TESTCONTAINERS_HOST_OVERRIDE:-host.docker.internal}"
    log 'running Testcontainers and WireMock integration/contract tests'
    gradlew :backend:integrationTest
    ;;
  eval)
    log 'running deterministic evaluation fixture validation'
    gradlew :backend:evalTest
    ;;
  *)
    die 'usage: scripts/test.sh {unit|integration|eval}'
    ;;
esac
