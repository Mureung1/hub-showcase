# 010 — 재개 가능한 setup과 Installer bundle의 authority를 정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [첫 public preview의 성공 여정을 고정한다](004-first-public-preview-success-journey.md), [첫 public release의 SemesterWorkspace admission 경계를 정한다](009-semester-workspace-admission.md)

## Question

새 학기 생성과 기존 폴더 연결이 하나의 `Semester Ready`로 합류하도록 App, Installer Skill과 reusable deterministic script 사이의 `inspect → propose → review → apply → verify` 책임을 어떻게 나눌 것인가? Skill이 제안할 수 있는 structured plan과 직접 수행할 수 있는 작업, App-owned Review 뒤 script가 적용·검증·owned rollback할 수 있는 작업, 사용자 원본과 OAuth secret에 대한 금지 경계를 어디에 둘 것인가?

## Answer

아직 결정하지 않음.
