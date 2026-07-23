# `@ay-ple/runtime-release`

`@ay-ple/runtime-release`는 public application이 지정한 exact Runtime release를 검증하고 준비하는 Node-only Module의 workspace다.

현재 `Spine S0`에서는 package identity와 test·typecheck·build seam만 제공한다. Runtime descriptor, network download, archive extraction, cache mutation과 verified Runtime 반환 동작은 아직 구현하지 않는다.

Safe TAR parsing dependency는 [`tar-stream@3.2.0`](https://www.npmjs.com/package/tar-stream/v/3.2.0)으로 exact pin한다. 이 MIT-licensed package는 archive entry를 in-process stream으로 노출하므로 후속 resolver가 path, type, link와 expanded-byte policy를 filesystem write 전에 적용할 수 있다. 이 선택은 safe extraction policy 자체를 위임하지 않으며 system `tar` 또는 Python fallback을 허용하지 않는다.
