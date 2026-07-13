#!/usr/bin/env bash

set -Eeuo pipefail
# shellcheck source=scripts/lib/common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

ensure_env_file
load_env_file
assert_java17
assert_docker_engine
assert_mock_mode

compose_base up --detach --build --wait

export SPRING_PROFILES_ACTIVE=local
export SPRING_DATASOURCE_URL="jdbc:postgresql://postgres:5432/${POSTGRES_DB:-placepick}"
export SPRING_DATASOURCE_USERNAME="${POSTGRES_USER:-placepick}"
export SPRING_DATASOURCE_PASSWORD="${POSTGRES_PASSWORD:-placepick-local-only}"
export SPRING_DATA_REDIS_HOST=redis
export SPRING_DATA_REDIS_PORT=6379
export PLACEPICK_EXTERNAL_MODE=mock
export PLACEPICK_NAVER_BASE_URL=http://mock-naver:8080
export PLACEPICK_LLM_BASE_URL=http://mock-llm:8080

log 'running backend with the local profile and mock-only outbound integrations'
gradlew :backend:bootRun --args='--spring.profiles.active=local'
