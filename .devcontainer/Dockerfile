FROM mcr.microsoft.com/devcontainers/java:1-17-bookworm@sha256:4df2d907479f1779014e21538be2c0b3fae16d342a78d7a674ea129a8e302e57

USER root

RUN rm -f /etc/apt/sources.list.d/yarn.list \
    && apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      git \
      jq \
      make \
      ripgrep \
      shellcheck \
      unzip \
    && rm -rf /var/lib/apt/lists/* \
    && java -version 2>&1 | grep -Eq 'version "17([."]|$)'

USER vscode
