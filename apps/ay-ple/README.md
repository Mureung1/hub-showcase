# `ay-ple`

`apps/ay-ple`은 public application package와 foreground host를 조립할 workspace다. `@ay-ple/runtime-release`, `@ay-ple/semester-workspace`와 host가 재사용할 `@ay-ple/server` application seam을 소비하는 dependency direction만 먼저 고정한다.

현재 `Spine S0` package는 `0.0.0`, `private: true`인 compile-only placeholder다. Public `bin`, listener, Browser open, package resources, release metadata와 publish closure를 제공하지 않는다.
