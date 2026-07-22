# 015 — Public source·npm·Runtime publication gate를 확정한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [Third-party 재배포 evidence와 release notice gate를 확정한다](003a-third-party-redistribution-evidence.md), [Public repository authority와 license를 확정한다](005-public-repository-authority-and-license.md), [npx production composition을 고른다](006-npx-production-composition.md), [Runtime release delivery·integrity·versioning을 정한다](007-runtime-release-delivery-integrity.md), [Public npx distribution 결정을 formal owner에 채택한다](007a-record-public-distribution-decision.md), [Landing의 product promise와 install truth를 검증한다](013-landing-install-truth.md), [최종 병렬 delivery contract와 integration protocol을 정한다](014-final-parallel-delivery-contracts.md)

## Question

[Ticket 005](005-public-repository-authority-and-license.md)의 fixed `hub` SHA에서 deterministic하게 만든 local/private RC, gate 실패 시 `hub` 수정 후 전체 재생성, final clean root commit의 immutable source↔public mapping과 published commit·tag 불변성을 고정 입력으로 둔다. 그 위에서 clean public source snapshot, `npm pack` 결과, Runtime archive·manifest·checksum과 Landing이 하나의 exact release version을 가리킨다고 자동 판정하려면 어떤 blocking evidence가 필요한가? npm publish, GitHub Release·Pages 노출의 ordering과 partial failure 정산, yanked version·manual rollback을 어떤 기록과 재개 계약으로 관리할 것인가?

## Answer

아직 조사하지 않음.
