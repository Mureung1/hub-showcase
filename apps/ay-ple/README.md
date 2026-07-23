# `ay-ple`

`apps/ay-ple`은 public application package와 foreground host를 조립할 workspace다. `@ay-ple/runtime-release`와 `@ay-ple/semester-workspace`를 소비하는 dependency direction만 먼저 고정한다.

현재 `Spine S0` package는 `0.0.0`, `private: true`인 compile-only placeholder다. Public `bin`, listener, Browser open, package resources, release metadata와 publish closure를 제공하지 않는다.
