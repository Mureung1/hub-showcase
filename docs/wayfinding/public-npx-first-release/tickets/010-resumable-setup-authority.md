# 010 — 재개 가능한 setup과 Installer bundle의 authority를 정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [첫 public preview의 성공 여정을 고정한다](004-first-public-preview-success-journey.md), [첫 public release의 SemesterWorkspace schema·scaffold 경계를 정한다](009-semester-workspace-admission.md)

## Question

App code가 `SemesterWorkspace` schema, scaffold, validation과 deterministic migration의 canonical authority를 유지하면서 first-run setup을 재개 가능하게 만들려면 App, Installer Skill과 reusable deterministic script 사이의 `inspect → propose → review → apply → verify` 책임을 어떻게 나눌 것인가? Skill은 어떤 app-owned operation을 호출·조율할 수 있고 script는 어떤 deterministic 적용·검증·owned rollback을 담당하며, 어떤 artifact와 receipt가 중단 후 resume를 허용하는가? 후속 `ImportSource` migration이 같은 구조를 재사용하더라도 setup Skill이 canonical workspace schema를 정의하거나 사용자 원본·OAuth secret을 소유하지 못하게 하려면 어떤 금지 경계가 필요한가?

## Answer

아직 결정하지 않음.
