#!/usr/bin/env bash
set -Eeuo pipefail

readonly RIPGREP_VERSION='14.1.1'
readonly RIPGREP_ARCHIVE="ripgrep-${RIPGREP_VERSION}-x86_64-unknown-linux-musl.tar.gz"
readonly RIPGREP_SHA256='4cf9f2741e6c465ffdb7c26f38056a59e2a2544b51f7cc128ef28337eeae4d8e'
readonly RIPGREP_VERSION_OUTPUT='ripgrep 14.1.1 (rev 4649aa9700)'
readonly RIPGREP_URL="https://github.com/BurntSushi/ripgrep/releases/download/${RIPGREP_VERSION}/${RIPGREP_ARCHIVE}"

if [[ "${CI:-}" != 'true' || -z "${RUNNER_TEMP:-}" || -z "${GITHUB_PATH:-}" ]]; then
  printf 'Pinned ripgrep setup is restricted to GitHub Actions CI.\n' >&2
  exit 1
fi

if [[ "$(uname -s)" != 'Linux' || "$(uname -m)" != 'x86_64' ]]; then
  printf 'Pinned ripgrep setup supports only the GitHub-hosted Linux x86_64 runner.\n' >&2
  exit 1
fi

for tool in curl sha256sum tar install mktemp; do
  command -v "${tool}" >/dev/null 2>&1 || {
    printf 'Pinned ripgrep setup requires %s.\n' "${tool}" >&2
    exit 1
  }
done

download_dir="$(mktemp -d "${RUNNER_TEMP}/placepick-ripgrep.XXXXXX")"
readonly download_dir
trap 'rm -rf -- "${download_dir}"' EXIT

archive_path="${download_dir}/${RIPGREP_ARCHIVE}"
readonly archive_path
curl \
  --fail \
  --silent \
  --show-error \
  --location \
  --proto '=https' \
  --tlsv1.2 \
  --output "${archive_path}" \
  "${RIPGREP_URL}"

printf '%s  %s\n' "${RIPGREP_SHA256}" "${archive_path}" | sha256sum --check --status
tar --extract --gzip --file "${archive_path}" --directory "${download_dir}"

install_dir="${RUNNER_TEMP}/placepick-tools/ripgrep-${RIPGREP_VERSION}/bin"
readonly install_dir
mkdir -p "${install_dir}"
install -m 0755 \
  "${download_dir}/ripgrep-${RIPGREP_VERSION}-x86_64-unknown-linux-musl/rg" \
  "${install_dir}/rg"

actual_version="$("${install_dir}/rg" --version | sed -n '1p')"
if [[ "${actual_version}" != "${RIPGREP_VERSION_OUTPUT}" ]]; then
  printf 'Pinned ripgrep setup found an unexpected binary version.\n' >&2
  exit 1
fi

printf '%s\n' "${install_dir}" >> "${GITHUB_PATH}"
printf 'Pinned ripgrep %s is ready for subsequent CI steps.\n' "${RIPGREP_VERSION}"
