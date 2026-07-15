FROM grafana/grafana:13.1.0@sha256:121a7a9ece6dc10b969f1f96eed64b4f07dfac0d0b8abc070f7cb83bbde86f63

COPY --chown=472:0 provisioning/ /etc/grafana/provisioning/
COPY --chown=472:0 dashboards/ /etc/grafana/dashboards/
