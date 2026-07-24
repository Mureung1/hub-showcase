# `ay-ple`

`apps/ay-ple`은 public application package와 foreground host의 production composition을 소유한다. Immutable package resource, compatibility/root preflight, exact Runtime preparation과 `@ay-ple/server` application을 한 방향으로 조립하며 Server의 account/setup/cleanup authority를 재구현하지 않는다.

현재 package root는 다음 staged production surface를 제공한다.

- `admitApplicationStartup()` — executable module 기준 package resource 검증, supported Mac·Node/npm·Browser preflight, owner-only application root와 exact Runtime preparation
- `startDynamicLocalApplicationHost()` — explicit `127.0.0.1:0` bind, pre-ready `503`, exact same-origin product API·built SPA serving과 listener→application→Runtime cleanup

Package는 아직 `0.0.0`, `private: true`다. Single-instance/secondary reopen, actual Browser open, signal lifecycle, public `bin`, release metadata와 publish closure는 후속 H/G slice가 소유하며 현재 구현으로 간주하지 않는다.
