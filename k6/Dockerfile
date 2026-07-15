FROM grafana/k6:2.1.0@sha256:65c920dc067d5e2e00befbf982af6ad6ad0117034e8b1c65817c7975c52d4669

USER root

RUN install -d -o root -g root -m 0555 /scripts

COPY --chown=root:root --chmod=0444 health-smoke.js /scripts/health-smoke.js

USER 12345
