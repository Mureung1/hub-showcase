# Vendor Fork Guidelines

`vendor/`는 외부 source를 provenance와 함께 가져와 AY-PLE 안에서 독립적으로 발전시키는 격리 영역이다. `references/`의 immutable submodule은 upstream oracle이고, `vendor/`의 tracked copy는 수정 가능한 fork다.

## Fork-first 규칙

- 최초 import의 upstream source, tests, fixtures, package metadata와 license를 보존한다.
- Fork 내부 동작은 donor source/tests와 해당 runtime의 exact pinned source/schema를 먼저 근거로 삼는다.
- 기존 AY-PLE Wayfinder, spec, ADR과 legacy Host 구현은 fork의 초기 구조나 acceptance criterion으로 사용하지 않는다. 실제 fork 동작을 확인한 뒤 integration 단계에서 필요한 외부 호환성만 별도로 결정한다.
- Source 또는 observable behavior를 바꾸는 local patch는 같은 변경에서 fork의 `upstream/PATCHES.md`에 목적, 경로와 검증을 기록한다.
- 원본 license와 copyright notice를 삭제하거나 개별 source header로 재작성하지 않는다.
- Upstream style과 toolchain은 명시적인 normalization patch 전까지 유지한다. Root repository style을 기계적으로 덮어쓰지 않는다.

## 격리 규칙

- `vendor/*`는 root npm workspace와 production dependency graph에 자동 편입하지 않는다.
- `apps/*`와 `packages/*`가 vendor source를 직접 import하지 않는다. 검증된 fork를 production seam으로 승격하는 별도 integration 변경에서만 dependency를 연결한다.
- Donor baseline, Codex repin, protocol 교체, surface pruning, hardening과 AY-PLE integration을 서로 다른 patch로 유지한다.
- Live Codex smoke나 example은 인증 상태와 persistent thread를 바꿀 수 있으므로 명시적으로 선택한 verification에서만 실행한다.
