# 013 — Landing의 product promise와 install truth를 검증한다

## Wayfinder ticket

- Type: prototype
- State: open
- Blocked by: [첫 public preview의 성공 여정을 고정한다](004-first-public-preview-success-journey.md), [Public repository authority와 license를 확정한다](005-public-repository-authority-and-license.md), [npx production composition을 고른다](006-npx-production-composition.md), [Runtime release delivery·integrity·versioning을 정한다](007-runtime-release-delivery-integrity.md), [Browser-launched Codex OAuth lifecycle을 설계한다](008-browser-oauth-lifecycle.md), [Semester Ready 완료와 후속 여정 진입 표면을 검증한다](012-semester-ready-first-action.md)

## Question

[ADR 0015](../../../adr/0015-bootstrap-public-repository-from-reviewed-clean-snapshot.md)의 Apache-2.0·privacy·security·contribution 결정과 [Ticket 006](006-npx-production-composition.md)의 release manifest exact version을 넣은 public command `npx ay-ple@<release-version>`, moving tag 금지, conditional npm install prompt, foreground terminal과 dynamic local URL을 다시 열지 않는다. AY-PLE의 public product homepage이자 repository·Docs·배포 흐름의 공식 entrypoint인 Landing이 `한 학기를 함께 관리하는 AY`라는 가치와 local-first trust를 먼저 전달하고, Hero 바로 아래의 실제 version이 채워진 복사 가능한 명령에서 local AY-PLE Browser UI로 어떻게 자연스럽게 이어져야 하는가? Hero, `npx` entrypoint, 제품 경험 설명·demo, 작동 방식, 지원 환경, Docs·GitHub repository·license/trust만으로 첫 version을 제한하면서 supported Mac·Node/npm·network·Codex account prerequisite, first-download size·cache 위치, OAuth·workspace data boundary와 preview limitation을 install command 주변과 별도 compatibility·trust surface에 어떻게 정직하게 배치할 것인가? Unsupported prerequisite와 download·hash·cache·auth failure가 발생해도 제품 비전을 거대한 경고로 덮지 않으면서 다음 행동을 알려주는 copy·command·fallback 경험은 무엇인가? [Remotion](https://www.remotion.dev/)은 visual section 복제 대상이 아니라 이 public entrypoint 운영 방식의 benchmark로만 사용한다.

## Answer

아직 검증하지 않음.
