# 007a — Public npx distribution 결정을 formal owner에 채택한다

## Wayfinder ticket

- Type: task
- State: resolved
- Blocked by: [Public npx release 경로를 채택한다](001-adopt-public-npx-release-route.md), [Public repository authority와 license를 확정한다](005-public-repository-authority-and-license.md), [npx production composition을 고른다](006-npx-production-composition.md), [Runtime release delivery·integrity·versioning을 정한다](007-runtime-release-delivery-integrity.md)

## Question

[ADR 0015](../../../adr/0015-bootstrap-public-repository-from-reviewed-clean-snapshot.md)의 repository authority·canonical cutover·license·trust 결정을 고정 입력으로 두고, Ticket 001과 006–007에서 확정한 one-package foreground host, exact npm-embedded Runtime descriptor, immutable GitHub asset, single-entry `RuntimeResolver`와 still-supported 이전 exact app pair가 있을 때의 rollback 경계를 어떤 장기 formal owner에 기록할 것인가? ADR 0009를 보완하거나 별도 distribution ADR을 채택하고, Product Brief·Runtime 격리·구현 지도·Development Backlog에는 현재 구현과 채택 목표를 섞지 않은 consequence와 작업만 owner-first 순서로 반영해 resulting spec이 Wayfinder ticket을 장기 정본처럼 인용하지 않게 한다. Exact public `LICENSE`·`NOTICE`·`PRIVACY`·`CONTRIBUTING` file content는 ADR의 결정을 구현하는 release-owned surface로 남긴다.

## Answer

[ADR 0016 — 첫 public preview를 exact npx launcher와 verified Runtime release로 배포한다](../../../adr/0016-distribute-public-preview-with-an-exact-npx-launcher-and-verified-runtime-release.md)를 별도 formal owner로 채택했다. [ADR 0009](../../../adr/0009-use-a-macos-first-local-web-app-product-path.md)는 macOS support와 local companion·browser UI라는 제품 형태를 계속 소유하고, ADR 0016은 독립적으로 진화하는 public npm application↔Runtime supply-chain을 소유한다. 한 ADR에 합치면 이후 Desktop packaging 또는 Runtime delivery 중 한 축만 바꿀 때 무관한 결정을 함께 다시 열어야 하므로 분리했다.

ADR 0016은 다음 장기 불변 조건만 고정한다.

- Exact `npx ay-ple@<release-version>`의 thin public package/bin과 foreground local host가 첫 application entrypoint다. `.app`·`.dmg`와 zero-prerequisite installer는 후속이다.
- Package-owned exact descriptor가 immutable GitHub Runtime asset과 canonical manifest를 pin하고, single-entry `RuntimeResolver`가 `appDataRoot`의 verified generation·retained archive, repair와 complete-tree verification을 캡슐화한다.
- Moving catalog, silent fallback과 automatic downgrade를 금지한다. Rollback은 실제 still-supported 이전 release가 있을 때 그 exact application version과 descriptor-bound Runtime whole pair를 다시 실행하는 동작이다.
- Public source·license·trust authority는 ADR 0015가 유지하고, descriptor schema·cache path·HTTP matrix·legal file 본문·publication ledger와 ordering은 architecture·release implementation surface가 소유한다.

이 결정 때문에 [ADR 0006](../../../adr/0006-separate-package-app-data-and-semester-workspace-roots.md)은 public target에서 `packageRoot`가 Runtime binding을, `appDataRoot`가 verified immutable Runtime generation을 소유한다고 부분 보완했다. Product Brief·Overview·Design System은 Wayfinder를 장기 배포 정본처럼 인용하지 않고 제품 범위와 ADR authority를 분리했다. Runtime 격리에는 current package-local 구현과 미구현 resolver target을 나눠 기록했고, 구현 지도에는 public npx delivery를 미지원 gap으로, Development Backlog에는 launcher composition과 Runtime resolution을 별도 검증 가능한 작업으로 남겼다. 새 formal document는 두 README index와 문서 ownership 표에 등록했다.

`CONTEXT.md`는 변경하지 않았다. `RuntimeResolver`, descriptor와 Runtime release ID는 학업 domain language가 아니라 distribution implementation vocabulary다.
