# 003 — Upstream source provenance를 장기 검증 가능하게 pin한다

## Wayfinder ticket

- Type: research
- State: resolved
- Blocked by: tickets/002-audit-host-consumers-and-compatibility.md

## Question

`@openai/codex` 실행 artifact, release tag·commit, dev-only source submodule, generated schema digest와 reviewed source path를 어떻게 연결해야 일상 Node workflow에 Rust checkout dependency를 만들지 않으면서 재현 가능한 architecture evidence와 upgrade review gate를 제공할 수 있는가?

## Answer

[provenance 조사](../assets/003-upstream-source-provenance.md)에서 npm artifact와 upstream source를 추정 없이 연결할 수 있음을 확인했다. `@openai/codex@0.144.0` root launcher와 여섯 platform package의 lock SHA-512가 각 npm SLSA attestation subject와 일치하고, 일곱 attestation 모두 `openai/codex`의 `.github/workflows/rust-release.yml`, `refs/tags/rust-v0.144.0`, exact commit `767822446c7a594caa19609ca435281a9ec67e0d`, workflow run `29031683761/attempts/1`로 수렴한다. 따라서 version 이름에서 source tag를 추측하지 않고 **attested commit**을 source identity로 삼는다.

다음 ownership을 채택한다.

| Owner | 고정하는 사실 | 경계 |
| --- | --- | --- |
| `packages/runtime-codex/package.json` + `package-lock.json` | 실행할 exact npm version, root·platform artifact URL/integrity | Runtime install authority이며 source checkout을 참조하지 않는다. |
| npm SLSA bundle snapshot + online cryptographic verification | Artifact digest를 만든 repository·workflow·ref·commit | Version별 signed bundle을 package evidence로 보존하되, upgrade 때 root·여섯 platform의 DSSE signature, certificate identity/time, CT·Rekor evidence와 registry publish attestation을 공식 npm/Sigstore verifier로 다시 검증한다. |
| `references/openai-codex` git submodule | 사람이 조사·검색·old/new diff할 source tree | Superproject gitlink를 `767822…`에 두고 `branch`, `shallow`, `ignore` 없이 명시적으로만 initialize한다. Runtime, workspace, TypeScript import, 일반 CI에 편입하지 않는다. |
| `packages/runtime-codex/codex-upstream-provenance.json` | Package/lock, attestation, annotated tag object `e0a9ff…`, commit·tree, gitlink, generated digest, evidence path의 cross-check | 독립적인 version selector가 아니라 drift를 fail시키는 machine-readable index다. |
| Committed generated tree | Pinned npm binary와 tracked AY-PLE transformation이 만든 public protocol input | 601 files의 `sha256-file-manifest-v1` digest는 `a1f916…`이다. Private Rust behavior와 product policy는 증명하지 않는다. |

검증은 세 모드로 분리한다. Default structural mode는 package pin·lock closure·manifest·gitlink·generated digest drift만 검사하므로 uninitialized submodule과 network 없이 일반 Node workflow를 지키며, provenance authenticity를 통과했다고 주장하지 않는다. Explicit source mode만 submodule `HEAD === gitlink === attested commit`, clean detached checkout과 reviewed path 존재를 요구한다. Pin upgrade mode는 current exact seven-package roster의 npm/Sigstore cryptographic verification을 먼저 통과한 signed payload만 policy input으로 받아 remote tag object/peeled commit, source diff, 두 번의 isolated schema regeneration, method inventory와 live/source review까지 하나의 fail-closed transaction으로 묶는다. Future artifact roster 변화는 자동 수용하지 않고 added/removed platform review와 manifest 갱신을 요구한다.

현재 type generator가 binary version·provenance 확인 전에 tracked output directory를 삭제하는 gap도 발견했다. 후속 구현은 output mutation 전에 package-owned binary path/version/provenance를 preflight하고, temporary output의 재현성과 diff를 확인한 뒤에만 교체해야 한다. Raw JSON의 object order가 달라질 수 있으므로 byte digest 하나를 schema 의미의 유일한 oracle로 사용하지 않는다.

이 결정은 npm provenance가 source 안전성이나 native binary의 독립적 reproducible build를 증명한다는 주장을 하지 않는다. 또한 gitlink는 exact source identity를 pin할 뿐 upstream object의 영구 availability를 보장하지 않으며, source mirror·escrow는 현재 범위에 넣지 않는다. Exact gate 빈도, verifier package/trust-root policy와 PR matrix는 [Ticket 013](013-decide-source-conformance-verification.md)이 소유하고, submodule·manifest·verifier의 실제 추가는 resulting spec과 implementation tickets에서 수행한다. 별도 Wayfinder decision ticket은 추가하지 않는다.
