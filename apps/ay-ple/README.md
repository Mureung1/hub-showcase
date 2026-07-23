# `ay-ple`

`apps/ay-ple`은 public application package와 foreground host를 조립할 workspace다. `@ay-ple/runtime-release`, `@ay-ple/semester-workspace`와 host가 재사용할 `@ay-ple/server` application seam을 소비하는 dependency direction만 먼저 고정한다.

현재 `Spine S1` package는 `0.0.0`, `private: true`이며 listener-independent host/application Interface와 strict `ApplicationCompatibilityDescriptor` decoder만 제공한다. Public `bin`, listener, Browser open, package resources, release metadata와 publish closure는 아직 구현하지 않는다.
