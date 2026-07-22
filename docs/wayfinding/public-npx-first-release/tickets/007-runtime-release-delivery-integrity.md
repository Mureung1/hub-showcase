# 007 — Runtime release delivery·integrity·versioning을 정한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [Third-party 재배포 evidence와 release notice gate를 확정한다](003a-third-party-redistribution-evidence.md), [Public repository authority와 license를 확정한다](005-public-repository-authority-and-license.md), [npx production composition을 고른다](006-npx-production-composition.md)

## Question

[Ticket 005](005-public-repository-authority-and-license.md)의 immutable source↔public mapping과 local/private RC, [Ticket 006](006-npx-production-composition.md)의 thin public `ay-ple` package와 foreground host가 `appDataRoot`를 주고 verified immutable `runtimeRoot`·Runtime identity를 받는 resolver seam을 고정 입력으로 둔다. 그 위에서 public npm package와 GitHub Release의 macOS arm64 Runtime archive 사이에 CLI·Runtime·manifest version, archive SHA-256·size, extracted complete-tree verifier와 Runtime artifact provenance의 authority를 어떻게 나눌 것인가? First download, interrupted resume·retry, atomic extract/cache publish, corrupt cache repair, launcher가 이미 실행된 뒤 Runtime network 없이 하는 verified-cache reuse, incompatible launcher·Runtime, yanked release와 명시적 rollback을 어떤 fail-closed contract로 표현해야 하는가? Public `npx` command 자체의 offline resolution은 보장하지 않는다.

## Answer

아직 조사하지 않음.
