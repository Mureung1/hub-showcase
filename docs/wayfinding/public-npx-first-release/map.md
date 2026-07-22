# AY-PLE public npx 첫 출시

## Wayfinder state

- State: active
- Surface: local-wayfinder-map
- Next actor: /wayfinder

## Destination

Node와 npm이 설치된 supported macOS arm64에서 repository·system Python·기존 AY-PLE auth/cache 없이 public landing의 한 명령으로 AY-PLE을 시작하는 첫 public release contract를 확정하고 implementation-ready spec으로 넘긴다. Thin public npm launcher가 versioned·verified Runtime release를 app data에 준비하고 local companion과 browser UI를 연 뒤, Codex OAuth, 새 학기 또는 bounded 기존 폴더 setup, `Semester Ready`, 실제 자료 기반 학업 action과 종료·재실행 뒤 confirmed state 복원까지를 하나의 정직한 release path로 닫는다. Public `AY-PLE` repository의 reviewed lineage·export authority, source·Runtime license와 provenance, publication pipeline, clean-machine evidence와 충돌 없는 병렬 구현 seam도 같은 spec의 선행 결정으로 확정한다.

## Notes

- 2026-07-22 사용자는 Apple Developer 비용이 필요한 signed·notarized public DMG를 첫 release 기준에서 제외하고, `.app`·`.dmg` 전체를 이번 범위에서 내린 뒤 public `AY-PLE` repository, landing, public npm launcher와 GitHub Release payload 경로를 선택했다. 이 사용자 방향은 [Public npx release 경로를 채택한다](tickets/001-adopt-public-npx-release-route.md)에 기록한다.
- `npx`는 zero-prerequisite installer가 아니다. 첫 release는 Node/npm을 명시적 prerequisite로 두는 macOS arm64 public preview이며, 정확한 지원 버전과 사용자 여정은 [첫 public preview의 성공 여정을 고정한다](tickets/004-first-public-preview-success-journey.md)가 결정한다.
- [macOS-first local web app ADR 0009](../../adr/0009-use-a-macos-first-local-web-app-product-path.md)의 local companion·browser UI 경계를 유지한다. 이 map은 Desktop host를 다시 열지 않고 public launcher와 Runtime delivery를 그 제품 entrypoint 앞에 둔다.
- [ADR 0006](../../adr/0006-separate-package-app-data-and-semester-workspace-roots.md)의 `packageRoot`·`appDataRoot`·`workspaceRoot` 분리, [ADR 0011](../../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md)의 official SDK·supervised Runtime, [ADR 0013](../../adr/0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md)의 product-only public surface와 durable store는 입력 invariant다. OAuth secret은 Browser, SemesterWorkspace, public source와 release manifest에 포함하지 않는다.
- 현재 verified macOS arm64 Runtime bundle, complete-tree verifier, product-only Server composition, First Assignment vertical과 persistent dogfood profile은 재사용 후보다. `scripts/product-dogfood.mts`는 fixture와 개발 process composition을 소유하므로 public launcher의 production implementation으로 자동 승격하지 않는다.
- 현재 `hub` history 전체를 public repository로 mirror하지 않는다. Clean snapshot의 allowlist, public repository의 canonical 전환 시점과 camp repository와의 단방향 동기화 경계는 [Public repository authority와 license를 확정한다](tickets/005-public-repository-authority-and-license.md)가 결정하기 전까지 가설이다.
- OpenAI Codex source의 Apache-2.0 `LICENSE`·`NOTICE`가 존재한다는 사실은 AY-PLE 자체 license나 전체 Runtime 재배포 승인을 대신하지 않는다. First-party license, brand provenance, native payload와 dependency notice·SBOM·secret scan은 별도 release gate다.
- `/Users/swh/Desktop/code/2nd-1st-semester`는 setup·workspace admission·후속 학업 action의 실제 사용자 evidence다. 6.3GB·22,000-entry workspace 전체 import와 모든 학업 capability를 첫 public release 완료 조건으로 자동 승격하지 않는다.
- Wayfinder 자체는 한 session에 frontier ticket 하나만 resolve한다. [병렬 delivery collision과 초기 lane boundary를 조사한다](tickets/002-parallel-delivery-contracts.md)가 먼저 충돌 표면을 찾고, 주요 seam 결정 뒤 [최종 병렬 delivery contract와 integration protocol을 정한다](tickets/014-final-parallel-delivery-contracts.md)가 implementation DAG의 input을 잠근다. Resulting spec 뒤 `/to-tickets`가 이를 file ownership·blocking edge·merge gate가 있는 ticket graph로 변환한다.
- 2026-07-31은 외부 Demo Day milestone이다. 날짜 없는 작업 순서와 완료 상태는 계속 [AY-PLE 개발 백로그](../../product/ay-ple-development-backlog.md)가 소유한다. Ticket 001은 사용자 방향의 Wayfinder 기록이지 distribution decision의 장기 formal owner가 아니다. [Public npx distribution 결정을 formal owner에 채택한다](tickets/007a-record-public-distribution-decision.md)가 이 map이 `ready-for-spec`이 되기 전에 ADR 0009 보완 또는 별도 distribution ADR을 owner-first로 기록하고, resulting spec·구현 시 Product Brief, Runtime 격리, 구현 지도, package README와 Backlog를 각 정본의 책임에 맞춰 갱신한다.
- 이 map은 decision·research·prototype과 resulting spec 전 formal owner를 정리하는 [Public npx distribution 결정을 formal owner에 채택한다](tickets/007a-record-public-distribution-decision.md) task만 소유한다. Production code, public repository 생성, npm publish, GitHub Release·Pages publication, implementation ticket과 camp PR은 resulting spec 이후 각 실행 surface가 소유한다.

## Decisions so far

- [Public npx release 경로를 채택한다](tickets/001-adopt-public-npx-release-route.md) — Signed·notarized public DMG를 제외하고 public repository·landing·npm launcher·versioned Runtime release를 첫 배포 경로로 선택했다.
- [병렬 delivery collision과 초기 lane boundary를 조사한다](tickets/002-parallel-delivery-contracts.md) — Wayfinder writer를 한 명으로 유지하고 shared contract·root lockfile·Runtime generated surface·cross-surface E2E를 single-owner seam으로 격리하되 exact writer 수와 protocol은 Ticket 014로 넘겼다.
- [공개 inventory와 provenance gap을 조사한다](tickets/003-audit-publication-inventory-and-redistribution.md) — Fixed revision의 source·npm·Runtime·asset inventory를 고정했으며 public package·first-party license·native notice·clean snapshot·secret/SBOM gate 부재를 owner ticket의 fail-closed blocker로 분류했다.

## Not yet specified

없음. 현재 in-scope fog는 precise한 Wayfinder ticket으로 승격했다.

## Out of scope

- `.app`·`.dmg`, Developer ID signing·notarization·stapling, Mac App Store와 Apple 유료 배포 계정
- Node/npm도 필요 없는 zero-prerequisite installer, background daemon·login item와 OS-level auto-start
- Windows, Linux, macOS Intel·universal binary와 다른 package manager의 동등 지원
- Hosted SaaS, cloud sync, multi-user·multi-client, mobile·small-screen 지원과 외부 calendar·LMS 자동 연동
- In-app·delta auto-updater와 원격 update service. Exact version cache, 명시적 교체·repair·rollback 경계는 in-scope다.
- Custom paid domain, analytics·growth stack과 완성형 marketing site. 첫 landing은 제품 약속, prerequisite, install command, trust·failure 안내만 소유한다.
- 전체 `2nd-1st-semester`의 PDF·PPTX·HWP/HWPX·audio 완전 import, 모든 과목 workflow의 제품화와 generic capability marketplace
- Generic transcript persistence, multi-thread catalog, model·reasoning 설정과 모든 native activity의 1:1 UI
- 이 Wayfinder session에서 production 구현, public GitHub repository·npm package·Release·Pages 생성 또는 GitHub Issue·PR 게시

## Resulting spec

아직 없음.
