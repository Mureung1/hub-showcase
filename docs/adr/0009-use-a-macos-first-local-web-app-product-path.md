# 첫 제품 경로를 macOS-first local web app으로 한정한다

분류: 활성

성숙도: 채택

관련 결정: [ADR 0016 — Exact npx launcher와 verified Runtime release로 첫 public preview를 배포한다](0016-distribute-public-preview-with-an-exact-npx-launcher-and-verified-runtime-release.md)

AY-PLE의 첫 MVP는 macOS에서 local companion server가 [official SDK 기반 Codex Chat Shell](0011-reuse-official-codex-python-sdk-for-chat-shell.md)과 하위 제품 adapter를 소유하고 browser UI가 사용하는 local web app으로 제공한다. Packaged Desktop App은 이 경로가 검증된 뒤의 후속 로드맵으로 둔다. 현재 제품 실행과 검증 근거가 macOS에 집중된 상태에서 확인하지 않은 다른 운영체제까지 지원한다고 약속하면 launcher, Python·native dependency, app data와 QA 범위를 동시에 넓혀야 하기 때문이다.

## 결정

- 제품 지원, 구현 판단과 릴리스 QA의 기준은 macOS다. Windows와 Linux 제품 지원 또는 개발 호환성은 현재 목표가 아니며, 공통 코드가 다른 환경에서 우연히 동작하더라도 이를 유지 계약으로 해석하지 않는다.
- 현재 사용하는 runtime source와 package test fixture에는 `codex.cmd`, Windows shell·batch 처리와 `win32` 조건 분기처럼 검증하지 않는 compatibility surface를 두지 않는다.
- 외부 준비 경계와 공용 runtime module에는 `darwin` guard를 추가하지 않는다. 운영체제 검증이 필요해지면 실제 제품 local companion entrypoint 한곳에서 소유한다.
- 과거 pinned protocol이 생성했던 `Windows*` type과 method inventory는 제품 지원 구현이 아니었다. [ADR 0012](0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md)의 hard cutover 뒤 current graph에는 해당 generated inventory를 남기지 않고 Git history만 당시 근거를 보존한다.

## 고려한 대안

| 대안 | 판단 |
| --- | --- |
| 지금부터 여러 운영체제를 제품 지원 대상으로 삼는다. | Packaging과 QA 근거 없이 지원 범위만 약속하게 되므로 채택하지 않는다. |
| Shared runtime package가 macOS 이외의 실행을 즉시 거부한다. | 아직 제품 entrypoint가 아닌 deep module에 배포 정책을 섞으므로 채택하지 않는다. |
| 기존 Windows 조건 분기를 남겨 가능성만 열어 둔다. | 실제 child spawn 경로와 검증 범위가 뒷받침하지 않는 부분 지원으로 오해되므로 채택하지 않는다. |

## 결과

다른 운영체제 지원은 launcher와 native dependency, app data 기본 경로, 자동화된 QA를 함께 갖춘 별도 결정으로 확장한다. Desktop App packaging도 local web app의 제품 경계를 바꾸는 후속 작업으로 다룬다. 첫 public preview의 exact npx host와 Runtime distribution은 [ADR 0016](0016-distribute-public-preview-with-an-exact-npx-launcher-and-verified-runtime-release.md)이 이 경계 안에서 구체화한다. 현재 macOS Chat topology와 검증 표면은 [Codex Chat 구현 지도](../architecture/codex-chat-implementation-map.md)가 소유한다.
