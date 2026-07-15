# LocalTwin 문서 관리 기준

문서 상태: current
최종 감사: 2026-07-15

이 문서는 문서마다 책임을 하나씩 부여하고, 같은 내용을 여러 파일에서 동시에 관리하지 않기 위한 기준이다.

## 1. 원본 문서 지도

| 질문 | 원본 문서 | 역할 |
| --- | --- | --- |
| 무엇을 왜 만드는가? | `docs/wiki/localtwin-product-plan.md` | 문제, 사용자, 제품 기능 |
| 발표에서 무엇을 보여주는가? | `docs/wiki/localtwin-project-proposal.md` | 짧은 소개, 화면 흐름, 프로토타입 |
| v0.1 범위는 어디까지인가? | `docs/module-notes/localtwin-v0.1-scope.md` | 포함/제외 범위 결정 |
| 앞으로 무엇을 어떤 순서로 하는가? | `docs/development/tasks.md` | 4주 Product Backlog와 진행 상태 |
| 시스템은 어떻게 연결되는가? | `docs/development/architecture.md` | Front, Back, Data 구조 |
| 기능은 어떻게 동작해야 하는가? | `docs/features/*.md` | 기능별 동작과 완료 기준 |
| DB table은 어떻게 연결되고 왜 분리됐는가? | `docs/data/database-structure.md` | ERD, grain, PK/FK와 목표 공간 결합 구조 |
| 데이터의 출처와 의미는 무엇인가? | `docs/data/data-source-mapping.md` | source, field, canonical mapping |
| 작업 품질을 무엇으로 확인하는가? | `docs/development/checklist.md` | Definition of Done 보조 체크 |
| 실제 작업 범위와 결과는 무엇인가? | `.harness/tasks`, `.harness/runs` | 실행 단위와 검증 기록 |
| 현재 보안 문제와 조치 상태는 무엇인가? | `docs/issues/security-hardening-review.md` | 보안 이슈 재현·조치·검증 체크리스트 |

## 2. 중복 문서 처리 결과

| 문서 | 겹치던 내용 | 처리 |
| --- | --- | --- |
| `localtwin-v0.1-execution-plan.md` | Sprint, 기술 스택, Task와 검증 계획 | `tasks.md`와 `architecture.md`로 대체하고 legacy 안내 문서로 축소 |
| `checklist.md` | 마일스톤, 다음 Task, 완료 기준 | 일정/우선순위는 제거하고 완료 품질 확인표로 한정 |
| `localtwin-product-plan.md` / `localtwin-project-proposal.md` | 문제 정의와 핵심 기능 | Product Plan은 상세 원본, Proposal은 발표용 요약으로 역할 표시 |
| `overview.md` / `localtwin-v0.1-scope.md` | 제품 정의와 완료 기준 | Overview는 개발 문서 진입점, Scope는 범위 결정 원본으로 구분 |
| `environment.md` / `week1-thursday-progress-report.md` | 기술 스택과 폴더 구조 | Environment는 현재 기준, Progress Report는 당시 상태 기록으로 구분 |

## 3. 전체 문서 인벤토리

| 경로 | 상태 | 책임 |
| --- | --- | --- |
| `docs/wiki/Home.md` | current | 모든 문서 진입점 |
| `docs/wiki/localtwin-product-plan.md` | canonical | 상세 제품 기획 |
| `docs/wiki/localtwin-project-proposal.md` | support | 발표/소개용 요약 |
| `docs/wiki/localtwin-v0.1-execution-plan.md` | legacy | 이전 실행 계획 안내 |
| `docs/wiki/doc-viewer.html` | current | Markdown 문서 뷰어와 문서 트리 |
| `docs/wiki/knowledge-graph.html` | current | 문서 관계 탐색 |
| `docs/development/overview.md` | current | 개발 문서 상위 안내 |
| `docs/development/architecture.md` | canonical | 현재/목표 시스템 구조 |
| `docs/development/tasks.md` | canonical | 4주 백로그와 상태 |
| `docs/development/document-management.md` | canonical | 문서 책임과 중복 관리 |
| `docs/development/environment.md` | canonical | 현재 실행 환경과 dependency |
| `docs/development/conventions.md` | canonical | 코드/API/data/test 규칙 |
| `docs/development/pre-development-decisions.md` | current | 구현 전 결정 Gate |
| `docs/development/checklist.md` | support | 완료 품질 확인 |
| `docs/development/git-workflow.md` | current | branch와 commit 규칙 |
| `docs/development/harness.md` | current | Task Packet/Run Report 운영 |
| `docs/development/validation.md` | current | 로컬 검증 기준 |
| `docs/development/week1-thursday-progress-report.md` | history | 1주차 당시 진행 기록 |
| `docs/design/design-system.md` | canonical | 제품 UI 디자인 기준 |
| `docs/data/database-structure.md` | current | canonical DB ERD, table grain과 관계 설명 |
| `docs/data/data-source-mapping.md` | canonical | source와 canonical data mapping |
| `docs/features/market-analysis.md` | canonical | 상권 분석 기능 스펙 |
| `docs/features/market-map-experience.md` | canonical | 2.5D 지도와 핵심 3D store marker 기능 스펙 |
| `docs/features/3d-congestion-explorer.md` | canonical | P1 3D 상세보기 스펙 |
| `docs/features/person-anonymization-preprocessing.md` | canonical | P1 익명화 스펙 |
| `docs/module-notes/localtwin-v0.1-scope.md` | canonical | v0.1 범위 결정 |
| `docs/evaluation/agent-rubric.md` | current | 작업 평가 기준 |
| `docs/evaluation/evaluation-log.md` | log | 평가 기록 |
| `docs/evaluation/failure-log.md` | log | 실패와 재발 방지 기록 |
| `docs/evaluation/meta-evaluation.md` | current | 평가 방식 자체 검증 |
| `docs/issues/security-hardening-review.md` | active | 현재 보안 이슈, 안전한 재현과 조치 추적 |
| `docs/prototypes/*.html` | artifact | 정적 시연/비교 산출물 |

## 4. 갱신 규칙

- Task의 상태와 순서는 `tasks.md`에서만 수정한다.
- 기능 요구사항은 해당 `features/*.md`에서만 수정한다.
- 데이터 field와 출처는 `data-source-mapping.md`에서만 수정한다.
- table grain, PK/FK와 관계 이유는 `database-structure.md`에서 갱신한다.
- 기술 연결과 도입 시점은 `architecture.md`에서만 수정한다.
- 과거 Run Report와 Progress Report는 현재 상태에 맞춰 덮어쓰지 않는다.
- legacy 문서는 새 내용을 추가하지 않고 현재 원본 링크만 유지한다.
- 새 문서는 기존 원본에 넣기 어려운 독립적인 책임이 있을 때만 만든다.

## 5. 시각화 규칙

- 모든 상세 Markdown 문서는 Document Viewer 상단에서 H2 섹션을 Mermaid 흐름도로 자동 표시한다.
- 처리 순서, 시스템 관계, 의존성 또는 상태 변화가 핵심이면 본문에도 Mermaid를 작성한다.
- 단순 목록을 장식용 도표로 반복하지 않는다. 표가 비교에 더 적합하면 표를 사용한다.
- 다이어그램만으로 의미를 전달하지 않고, 바로 아래에 같은 내용을 찾을 수 있는 목차 또는 설명을 둔다.
- 구조 변경 시 Mermaid와 본문 설명을 같은 Task에서 함께 갱신한다.

## 6. 감사 방법

문서 구조 변경 뒤 다음을 확인한다.

```powershell
python scripts/check_docs_index.py
python scripts/check_docs_html.py
node scripts/check_doc_viewer_normalization.js
```

추가로 같은 제목, 같은 일정, 같은 상태를 둘 이상의 current 문서에서 관리하지 않는지 검토한다.

## 7. 변경 기록

| 날짜 | 변경 | 이유 |
| --- | --- | --- |
| 2026-07-10 | 전체 공개 문서와 하네스 문서의 역할을 최초 감사 | 실행 계획·체크리스트·제품 기획 간 중복과 현재/과거 기준 혼동을 줄이기 위해 |
| 2026-07-10 | 상세 문서 상단 Mermaid 흐름도 기준 추가 | 긴 문서를 읽기 전에 전체 구조와 순서를 시각적으로 파악하기 위해 |
| 2026-07-15 | current/canonical 문서 구현 상태 감사 | 과거 기록은 보존하고 현재 기준 문서의 상태·수치·링크만 실제 검증 결과와 맞추기 위해 |
