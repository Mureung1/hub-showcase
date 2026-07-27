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
  - id: issue-56
    content: API·프론트 배포 타겟 및 env 분리 결정
    status: completed
  - id: issue-57
    content: E2E/수동 테스트 체크리스트 작성
    status: completed
  - id: issue-58
    content: districts(전국 지역 데이터) 소스 결정
    status: completed
  - id: issue-61
    content: 상세 페이지 매칭도가 리스트와 다르게 표시됨
    status: completed
  - id: issue-62
    content: 매칭 시 조건 필터링이 전혀 적용되지 않음 (region 불일치 포함)
    status: completed
  - id: issue-63
    content: 마감 지난 지원금이 계속 노출됨 (재수집 안 되면 영구 방치)
    status: completed
  - id: issue-67
    content: 첨부파일(PDF/HWP) AI 구조화 추출로 매칭 조건 커버리지 개선
    status: completed
  - id: issue-77
    content: subsidies에 atch_file_id 컬럼 추가 (document_extractions 조인용)
    status: completed
  - id: issue-74
    content: 크롤러 fetch 재시도 이중 안전망(코드 레벨 + 워크플로우 레벨)
    status: completed
  - id: issue-80
    content: K-Startup·소상공인24 크롤링 소스 추가로 소상공인 매칭 커버리지 개선
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

#56 배포 검증 중 실제 서비스를 써보다가 사용자가 매칭 정확도 관련 버그 3건(#61~#63)을 추가로
발견해 같은 문서에서 함께 관리한다 (2026-07-25). #62 조사 중 매칭 조건 데이터가 대부분(4/6)
비어있다는 게 드러나, 첨부파일 AI 추출로 개선하는 방안을 별도 이슈(#67)로 크게 분리했다.

2026-07-26 새벽 크론 실행이 네트워크 커넥트 타임아웃으로 실패한 것을 계기로, 크롤러에 재시도
로직이 전혀 없다는 걸 확인해 별도 이슈(#74)로 등록했다.

2026-07-27 사용자가 배포된 서비스를 직접 써보며 소상공인 매칭 정확도가 낮다고 판단 — 실제
데이터 조사 결과 bizinfo의 "소상공인" 명시 비율(7.5%)과 업종 카테고리 매칭률(6.2%)이 모두
낮음을 확인. K-Startup·소상공인24 등 4개 후보 사이트를 조사해 두 곳(K-Startup, 소상공인24)을
크롤링 소스로 추가하기로 결정, 별도 이슈(#80)로 등록했다.

## 진행 현황

| 이슈 | 제목 | 상태 |
|------|------|------|
| [#51](https://github.com/syd348/hub/issues/51) | 업력(연차) 필드 온보딩 UI 추가 | 완료 (2026-07-25, PR #53 머지) |
| [#52](https://github.com/syd348/hub/issues/52) | industry 매칭 고도화 | 완료 (2026-07-25, PR #54 머지) |
| [#56](https://github.com/syd348/hub/issues/56) | API·프론트 배포 타겟 및 env 분리 | 완료 (2026-07-25) — client: GitHub Pages, server: Render, [`week4/issue-56-deploy-target-plan.md`](week4/issue-56-deploy-target-plan.md) |
| [#57](https://github.com/syd348/hub/issues/57) | E2E/수동 테스트 체크리스트 | 완료 (2026-07-25, PR #65 머지) |
| [#58](https://github.com/syd348/hub/issues/58) | districts 데이터 소스 결정 | 완료 (2026-07-25) — 정적 유지로 결정, [`week4/issue-58-districts-source-plan.md`](week4/issue-58-districts-source-plan.md) |
| [#61](https://github.com/syd348/hub/issues/61) | 상세 페이지 매칭도가 리스트와 다르게 표시됨 | 완료 (2026-07-25) — [`week4/issue-61-detail-match-score-plan.md`](week4/issue-61-detail-match-score-plan.md) |
| [#62](https://github.com/syd348/hub/issues/62) | 매칭 조건 필터링이 전혀 적용되지 않음 | 완료 (2026-07-25) — region 필터링 적용, [`week4/issue-62-region-filter-plan.md`](week4/issue-62-region-filter-plan.md) |
| [#63](https://github.com/syd348/hub/issues/63) | 마감 지난 지원금이 계속 노출됨 | 완료 (2026-07-25) — 실제 86건 확인, [`week4/issue-63-expired-sweep-plan.md`](week4/issue-63-expired-sweep-plan.md) |
| [#67](https://github.com/syd348/hub/issues/67) | 첨부파일 AI 구조화 추출 | 완료 (2026-07-26, PR #76) — Claude→Gemini 전환, HWP 지원 보류 결정, [`week4/issue-67-ai-document-extraction-plan.md`](week4/issue-67-ai-document-extraction-plan.md) |
| [#74](https://github.com/syd348/hub/issues/74) | 크롤러 fetch 재시도 이중 안전망 | 완료 (2026-07-27) — 코드 레벨(withRetry) + 워크플로우 레벨(nick-fields/retry), [`week4/issue-74-crawler-retry-plan.md`](week4/issue-74-crawler-retry-plan.md) |
| [#77](https://github.com/syd348/hub/issues/77) | subsidies에 atch_file_id 컬럼 추가 | 완료 (2026-07-27) — #67 리뷰 중 발견한 조인 불가 문제, [`week4/issue-77-atch-file-id-plan.md`](week4/issue-77-atch-file-id-plan.md) |
| [#80](https://github.com/syd348/hub/issues/80) | K-Startup·소상공인24 크롤링 소스 추가 | 등록 완료 (2026-07-27) — 소상공인 매칭 정확도 조사에서 파생, [`week4/issue-80-data-source-expansion-plan.md`](week4/issue-80-data-source-expansion-plan.md) |

## 리스크 / 결정 필요

각 항목의 리스크/결정 표는 해당 계획 문서에 있음 (문서 일관성 원칙 — 여기서 재서술하지 않음).

## 마일스톤

[`Week 4 Follow-ups`](https://github.com/syd348/hub/milestone/3)
