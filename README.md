# LocalTwin

LocalTwin은 공공데이터와 공간 데이터를 근거로 후보 상권을 비교하고, 한 장소의 Gaussian Splatting 현장 탐색까지 연결하는 웹 기반 상권 의사결정 서비스다.

제품 source는 [`product/`](product/)에서 문서와 독립적으로 관리한다. 공개 제품 URL은
별도 Vercel 프로젝트의 Root Directory를 `product`로 지정한 뒤 확정한다.

## 문서 허브

기획서, 개발문서, 기능 스펙, 운영 규칙은 아래 링크에서 접근한다.

공개 문서사이트:
[https://hub-localtwin-docs-vercel.vercel.app/docs/wiki/doc-viewer.html?doc=Home.md](https://hub-localtwin-docs-vercel.vercel.app/docs/wiki/doc-viewer.html?doc=Home.md)

### Wiki용 기획 문서

- [Wiki Home](docs/wiki/doc-viewer.html?doc=Home.md)
- [Interactive Knowledge Graph](docs/wiki/knowledge-graph.html)
- [Document Viewer](docs/wiki/doc-viewer.html?doc=Home.md)
- [프로젝트 기획서: 화면 구조와 핵심 기능](docs/wiki/localtwin-project-proposal.md)
- [제품 기획서: 문제 정의, 사용자 시나리오, 기능 구성](docs/wiki/localtwin-product-plan.md)
- [이전 LocalTwin v0.1 전체 실행 계획 (Legacy)](docs/wiki/localtwin-v0.1-execution-plan.md)

### 개발 문서

- [전체 개발문서](docs/development/overview.md)
- [4주 개발 백로그](docs/development/tasks.md)
- [시스템 아키텍처](docs/development/architecture.md)
- [문서 관리 기준](docs/development/document-management.md)
- [개발환경](docs/development/environment.md)
- [개발 컨벤션](docs/development/conventions.md)
- [개발 전 결정 Gate](docs/development/pre-development-decisions.md)
- [개발 완료 체크리스트](docs/development/checklist.md)
- [Git 작업 규칙](docs/development/git-workflow.md)
- [LocalTwin Dev Harness](docs/development/harness.md)
- [검증 가이드](docs/development/validation.md)
- [보안 점검 및 조치 체크리스트](docs/issues/security-hardening-review.md)
- [1주차 목요일 진행 보고서](docs/development/week1-thursday-progress-report.md)

### 디자인 시스템

- [LocalTwin 디자인 시스템](docs/design/design-system.md)

### 데이터 문서

- [LocalTwin v0.1 데이터 소스 매핑](docs/data/data-source-mapping.md)

### 기능 스펙

- [공공데이터 기반 상권 분석](docs/features/market-analysis.md)
- [2.5D 상권 지도와 유동인구 Layer](docs/features/market-map-experience.md)
- [Gaussian Splatting 현장 상세보기](docs/features/3d-congestion-explorer.md)
- [사람 영역 익명화 전처리](docs/features/person-anonymization-preprocessing.md)

### 결정 메모

- [LocalTwin v0.1 구현 범위 고정 명세](docs/module-notes/localtwin-v0.1-scope.md)

### 평가 문서

- [Agent Evaluation Rubric](docs/evaluation/agent-rubric.md)
- [Evaluation Log](docs/evaluation/evaluation-log.md)
- [Failure Log](docs/evaluation/failure-log.md)
- [Meta-Evaluation](docs/evaluation/meta-evaluation.md)

## v0.1 우선순위

```text
P0:
공공데이터 기반 상권 분석
동일 업종 경쟁 강도
개업/폐업 흐름
시간대별 유동 특성
입지 점수
상권 해석 리포트

P1:
혼잡도 3D 기반 탐색
사람 영역 익명화 전처리
시간대별 관찰 입력
```

## 개발 원칙

```text
한 기능 구현 -> 검증 -> 커밋
한 버그 수정 -> 재현/검증 -> 커밋
한 문서 정리 -> 확인 -> 커밋
```

자세한 규칙은 [Git 작업 규칙](docs/development/git-workflow.md)을 따른다.
