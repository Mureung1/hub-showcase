# 009 — 첫 public release의 SemesterWorkspace schema·scaffold 경계를 정한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [첫 public preview의 성공 여정을 고정한다](004-first-public-preview-success-journey.md)

## Question

사용자가 학년·학기와 위치를 고르면 AY-PLE이 생성하는 정규화된 `SemesterWorkspace`에서 어떤 최소 directory seam, `WorkspaceManifest`, schema version, 학기·`Course` identity, app-owned state와 validation 결과를 canonical로 둘 것인가? Current v2 store가 이미 가진 stable workspace ID·Course identity와 새 `WorkspaceManifest`를 중복 authority로 두지 않으려면 하나의 versioned format으로 통합할지, 비중첩 physical format으로 나눌지와 bytes-preserving migration·failure를 어떻게 정할 것인가? 학년 1~4·1·2학기를 UI 기본값으로 제공하되 계절학기·초과학기를 schema로 막지 않고, 부분 생성·기존 빈 디렉터리·이미 생성된 workspace·상위 경로 충돌을 fail-closed하면서 deterministic scaffold·validation·migration 계약을 어떻게 정할 것인가? 기존 자료 폴더는 이 Ticket의 workspace admission이 아니라 후속 `ImportSource` migration 분기로 남긴다.

## Answer

아직 조사하지 않음.
