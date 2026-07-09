# LocalTwin Wiki Home

LocalTwin Wiki는 프로젝트 기획, 기능 정의, 개발 운영 문서를 연결하는 진입점이다.

## Knowledge Graph

- [Interactive Knowledge Graph](./knowledge-graph.html)
- [Document Viewer](./doc-viewer.html?doc=Home.md)

문서 간 핵심 개념, 기능, 데이터, 개발 운영 기준의 연결을 Node & Edge 형식으로 확인한다.
노드를 클릭하면 관련 문서로 이동하고, 검색과 그룹 필터로 필요한 문서를 좁혀볼 수 있다.

## Structure Maps

### 문서 구조

```text
docs/
  wiki/
    Home.md
    doc-viewer.html
    knowledge-graph.html
    localtwin-project-proposal.md
    localtwin-product-plan.md
    localtwin-v0.1-execution-plan.md
  prototypes/
    core-market-analysis-prototype.html
  design/
    design-system.md
  development/
    overview.md
    environment.md
    conventions.md
    pre-development-decisions.md
    checklist.md
    git-workflow.md
    harness.md
    validation.md
    week1-thursday-progress-report.md
  features/
    market-analysis.md
    market-map-experience.md
    3d-congestion-explorer.md
    person-anonymization-preprocessing.md
  data/
    data-source-mapping.md
  evaluation/
    agent-rubric.md
    evaluation-log.md
    failure-log.md
    meta-evaluation.md
  module-notes/
    localtwin-v0.1-scope.md
```

### 프로젝트 구조

```text
LocalTwin/
  README.md
  apps/
    web/
    api/
  data/
    raw/
    processed/
    fixtures/
    scenes/
  docs/
    wiki/
    design/
    development/
    features/
    data/
    evaluation/
    module-notes/
  scripts/
    check.ps1
    check_docs_index.py
    check_task_packet.py
  .harness/
    templates/
    tasks/
    runs/
    evaluations/
    policies/
  .githooks/
    pre-commit
    commit-msg
  .agents/
  .codex/
```

## Product Planning

- [프로젝트 기획서: 화면 구조와 핵심 기능](./localtwin-project-proposal.md)
- [제품 기획서: 문제 정의, 사용자 시나리오, 기능 구성](./localtwin-product-plan.md)
- [LocalTwin v0.1 전체 실행 계획](./localtwin-v0.1-execution-plan.md)

## Development

- [전체 개발문서](../development/overview.md)
- [개발환경](../development/environment.md)
- [개발 컨벤션](../development/conventions.md)
- [개발 전 결정 Gate](../development/pre-development-decisions.md)
- [전체 개발 체크리스트](../development/checklist.md)
- [Git 작업 규칙](../development/git-workflow.md)
- [LocalTwin Dev Harness](../development/harness.md)
- [검증 가이드](../development/validation.md)
- [1주차 목요일 진행 보고서](../development/week1-thursday-progress-report.md)

## Design System

- [LocalTwin 디자인 시스템](../design/design-system.md)

## Data

- [LocalTwin v0.1 데이터 소스 매핑](../data/data-source-mapping.md)

## Feature Specs

- [공공데이터 기반 상권 분석](../features/market-analysis.md)
- [2.5D 상권 지도와 유동인구 Layer](../features/market-map-experience.md)
- [Gaussian Splatting 현장 상세보기](../features/3d-congestion-explorer.md)
- [사람 영역 익명화 전처리](../features/person-anonymization-preprocessing.md)

## Decision Notes

- [LocalTwin v0.1 구현 범위 고정 명세](../module-notes/localtwin-v0.1-scope.md)

## Evaluation

- [Agent Evaluation Rubric](../evaluation/agent-rubric.md)
- [Evaluation Log](../evaluation/evaluation-log.md)
- [Failure Log](../evaluation/failure-log.md)
- [Meta-Evaluation](../evaluation/meta-evaluation.md)
