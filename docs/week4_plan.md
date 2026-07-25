---
name: week4 plan
overview: >-
  Week 4는 이슈 단위로 산발적으로 시작됨(#51 업력 필드, #52 industry 매칭 — 둘 다 완료).
  이 문서는 그 뒤 CONTEXT.md "아직 결정 안 된 것"에 남아있던 나머지 미정 사항 3건을
  이슈로 등록하며 만들어짐(2026-07-25).
todos:
  - id: issue-51
    content: 업력(연차) 필드 온보딩 UI 추가
    status: completed
  - id: issue-52
    content: industry 매칭 고도화
    status: completed
  - id: deploy-env-plan
    content: API·프론트 배포 타겟 및 env 분리 결정
    status: pending
  - id: e2e-checklist-plan
    content: E2E/수동 테스트 체크리스트 작성
    status: pending
  - id: districts-source-plan
    content: districts(전국 지역 데이터) 소스 결정
    status: pending
isProject: false
---

# Week 4 — 후속 결정 사항

> 작성일: 2026-07-25 (토)

## 배경

Week 3 마일스톤(#28~#32, #40, #43, #44) 완료 후 발견된 개별 작업(#51 업력 필드, #52 industry
매칭)이 별도 계획 문서 없이 이슈 단위로 먼저 진행·완료됨 (`docs/week4/issue-51-business-years-plan.md`,
`docs/week4/issue-52-industry-match-plan.md` 참고). 이 문서는 그 시점에 비어 있던 "week4_plan.md"를
채우면서, `CONTEXT.md`의 "아직 결정 안 된 것"에 남아있던 나머지 3건을 이슈로 승격한다.

## 진행 현황

| 이슈 | 제목 | 상태 |
|------|------|------|
| [#51](https://github.com/syd348/hub/issues/51) | 업력(연차) 필드 온보딩 UI 추가 | 완료 (2026-07-25, PR #53 머지) |
| [#52](https://github.com/syd348/hub/issues/52) | industry 매칭 고도화 | 완료 (2026-07-25, PR #54 머지) |
| [#56](https://github.com/syd348/hub/issues/56) | API·프론트 배포 타겟 및 env 분리 | 등록 완료 (2026-07-25) — [`week4/deploy-target-plan.md`](week4/deploy-target-plan.md) |
| [#57](https://github.com/syd348/hub/issues/57) | E2E/수동 테스트 체크리스트 | 등록 완료 (2026-07-25) — [`week4/e2e-checklist-plan.md`](week4/e2e-checklist-plan.md) |
| [#58](https://github.com/syd348/hub/issues/58) | districts 데이터 소스 결정 | 등록 완료 (2026-07-25) — [`week4/districts-source-plan.md`](week4/districts-source-plan.md) |

## 리스크 / 결정 필요

각 항목의 리스크/결정 표는 해당 계획 문서에 있음 (문서 일관성 원칙 — 여기서 재서술하지 않음).

## 마일스톤

[`Week 4 Follow-ups`](https://github.com/syd348/hub/milestone/3)
