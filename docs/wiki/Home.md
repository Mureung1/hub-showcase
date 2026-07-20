# LocalTwin Wiki Home

LocalTwin Wiki는 프로젝트 기획, 기능 정의, 개발 운영 문서를 연결하는 진입점이다.

제품 웹은 문서와 별도 배포한다. 공개 제품 URL은 별도 Vercel 프로젝트의 Root Directory를
`product`로 지정한 뒤 이 문서에 기록한다.

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
  prototypes/ (legacy: 이전 정적 시연 기록)
    core-market-analysis-prototype.html
  design/
    design-system.md
  development/
    overview.md
    environment.md
    conventions.md
    pre-development-decisions.md
    architecture.md
    tasks.md
    document-management.md
    checklist.md
    git-workflow.md
    harness.md
    validation.md
    refactoring-standards.md
    week1-thursday-progress-report.md
  features/
    market-analysis.md
    market-score-methodology.md
    market-map-experience.md
    3d-congestion-explorer.md
    person-anonymization-preprocessing.md
  data/
    database-structure.md
    data-source-mapping.md
  evaluation/
    agent-rubric.md
    evaluation-log.md
    failure-log.md
    meta-evaluation.md
  module-notes/
    localtwin-v0.1-scope.md
    vision-on-device-portfolio-direction.md
  operations/
    gpu-scene-validation.md  # GPU 학습, PLY 회수와 local viewer 검증
```

### 프로젝트 구조

```text
LocalTwin/
  README.md
  intro-page/ (legacy: 이전 소개 페이지, 현재 프로토타입 배포 대상 아님)
  product/ (실제 서비스 source와 제품 배포 경계)
    apps/
      web/
        src/
          components/
          features/
            market/
            map/storefronts/
          services/
          styles/
      api/
        alembic/
        src/localtwin_api/
        tests/
    data/
      raw/
      processed/
      fixtures/
      scenes/
    scripts/
  docs/
    wiki/
    design/
    development/
    features/
    data/
    evaluation/
    issues/
    module-notes/
    operations/
    prototypes/
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
- [이전 LocalTwin v0.1 전체 실행 계획 (Legacy)](./localtwin-v0.1-execution-plan.md)

## Tasks

- [4주 개발 백로그: Epic과 세부 Task](../development/tasks.md)
- [시스템 아키텍처: 현재 구조와 4주 목표 구조](../development/architecture.md)
- [문서 관리 기준: 원본과 중복 문서 역할](../development/document-management.md)

## Development

- [전체 개발문서](../development/overview.md)
- [4주 개발 백로그](../development/tasks.md)
- [시스템 아키텍처](../development/architecture.md)
- [문서 관리 기준](../development/document-management.md)
- [개발환경](../development/environment.md)
- [개발 컨벤션](../development/conventions.md)
- [개발 전 결정 Gate](../development/pre-development-decisions.md)
- [개발 완료 체크리스트](../development/checklist.md)
- [Git 작업 규칙](../development/git-workflow.md)
- [LocalTwin Dev Harness](../development/harness.md)
- [검증 가이드](../development/validation.md)
- [리팩터링 및 코드 구조 기준](../development/refactoring-standards.md)
- [1주차 목요일 진행 보고서](../development/week1-thursday-progress-report.md)

## Active Issues

- [보안 점검 및 조치 체크리스트](../issues/security-hardening-review.md)

## Design System

- [LocalTwin 디자인 시스템](../design/design-system.md)

## Data

- [LocalTwin 데이터베이스 구조와 ERD](../data/database-structure.md)
- [LocalTwin v0.1 데이터 소스 매핑](../data/data-source-mapping.md)

## Feature Specs

- [공공데이터 기반 상권 분석](../features/market-analysis.md)
- [상권 점수 산정 방법론](../features/market-score-methodology.md)
- [상권 지도, 2.5D 건물과 핵심 3D Store Marker](../features/market-map-experience.md)
- [Gaussian Splatting 현장 상세보기](../features/3d-congestion-explorer.md)
- [사람 영역 익명화 전처리](../features/person-anonymization-preprocessing.md)

## Decision Notes

- [LocalTwin v0.1 구현 범위 고정 명세](../module-notes/localtwin-v0.1-scope.md)
- [Vision·On-device ML Systems 포트폴리오 방향](../module-notes/vision-on-device-portfolio-direction.md)

## Evaluation

- [Agent Evaluation Rubric](../evaluation/agent-rubric.md)
- [Evaluation Log](../evaluation/evaluation-log.md)
- [Failure Log](../evaluation/failure-log.md)
- [Meta-Evaluation](../evaluation/meta-evaluation.md)
