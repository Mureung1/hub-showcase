# LocalTwin

LocalTwin은 공공데이터 기반 상권 분석을 주기능으로 제공하고, 보조/추가기능으로 한 가게 앞 또는 한 거리 10~20m 구간의 혼잡도 3D 기반 탐색을 제공하는 웹 기반 상권 디지털 트윈 프로토타입이다.

## 문서 허브

기획서, 개발문서, 기능 스펙, 운영 규칙은 아래 링크에서 접근한다.

### Wiki용 기획 문서

- [Wiki Home](docs/wiki/Home.md)
- [Interactive Knowledge Graph](docs/wiki/knowledge-graph.html)
- [Document Viewer](docs/wiki/doc-viewer.html?doc=Home.md)
- [제품 기획서: 문제 정의, 사용자 시나리오, 기능 구성](docs/wiki/localtwin-product-plan.md)
- [LocalTwin v0.1 전체 실행 계획](docs/wiki/localtwin-v0.1-execution-plan.md)

### 개발 문서

- [전체 개발문서](docs/development/overview.md)
- [전체 개발 체크리스트](docs/development/checklist.md)
- [Git 작업 규칙](docs/development/git-workflow.md)
- [LocalTwin Dev Harness](docs/development/harness.md)
- [검증 가이드](docs/development/validation.md)

### 데이터 문서

- [LocalTwin v0.1 데이터 소스 매핑](docs/data/data-source-mapping.md)

### 기능 스펙

- [공공데이터 기반 상권 분석](docs/features/market-analysis.md)
- [혼잡도 3D 기반 탐색](docs/features/3d-congestion-explorer.md)
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
