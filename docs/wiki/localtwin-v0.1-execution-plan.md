# LocalTwin v0.1 전체 실행 계획 (Legacy)

문서 상태: legacy
대체일: 2026-07-10

이 파일은 초기 Sprint 0~4 실행 순서를 기록했던 문서다. 이후 개발 기간이 4주로 확정되고, Task 상태·기술 구조·완료 확인을 한 파일에서 반복 관리하면서 현재 문서와 충돌하기 시작했다.

현재 기준은 다음 문서를 사용한다.

| 확인할 내용 | 현재 원본 |
| --- | --- |
| 4주 일정, 우선순위와 Task 상태 | [4주 개발 백로그](../development/tasks.md) |
| Front, Back, Data 기술 구조 | [시스템 아키텍처](../development/architecture.md) |
| 구현 범위와 제외 범위 | [v0.1 구현 범위 고정 명세](../module-notes/localtwin-v0.1-scope.md) |
| 기능별 동작과 완료 기준 | [공공데이터 기반 상권 분석](../features/market-analysis.md) 및 기능 스펙 |
| 완료 품질 점검 | [개발 완료 체크리스트](../development/checklist.md) |

## 이전 계획의 핵심 결정

- 주기능은 공공데이터 기반 상권 분석이다.
- 3D 장면 탐색과 익명화는 P1 보조 기능이다.
- Front는 React + Vite, Back은 FastAPI를 사용한다.
- 실제 데이터는 raw snapshot에서 canonical schema로 변환한 뒤 분석한다.
- 4주 프로토타입 DB는 SQLite를 우선한다.
- 기능 구현과 검증, 문서 갱신을 같은 Task 단위로 관리한다.

이 문서는 과거 링크와 Git 이력을 유지하기 위한 안내 페이지다. 새 일정이나 상태는 여기에 추가하지 않는다.

## 변경 기록

| 날짜 | 변경 | 이유 |
| --- | --- | --- |
| 2026-07-10 | 기존 Sprint 실행 계획을 legacy 안내로 전환 | 일정과 상태의 원본을 `tasks.md`로 통합하고 오래된 CI/기술 계획의 혼동을 막기 위해 |
