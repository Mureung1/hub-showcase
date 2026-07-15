#!/usr/bin/env bash

set -Eeuo pipefail
# shellcheck source=scripts/lib/common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

log 'ensuring the persistent Gradle cache belongs to the non-root development user'
sudo mkdir -p "${HOME}/.gradle"
sudo chown -R "$(id -u):$(id -g)" "${HOME}/.gradle"

chmod +x "${ROOT_DIR}/gradlew" "${ROOT_DIR}"/scripts/*.sh 2>/dev/null || true
"${ROOT_DIR}/scripts/setup.sh"
