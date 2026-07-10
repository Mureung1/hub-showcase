# Backlog & Sprint 운영

## 백로그란

백로그(Backlog)는 아직 처리되지 않은 할 일 목록으로, 우선순위가 매겨진 작업 대기열이다. 스프린트마다 백로그에서 우선순위 높은 항목을 꺼내 처리하고, 새로 생긴 요구사항은 백로그에 추가한다.

이 프로젝트에서는 `docs/TASKS.md`를 백로그로 사용하며, 각 항목에 P0(필수)/P1(중요)/P2(여유 시) 우선순위를 표시한다.

## 스프린트 구조 (4주)

- **Week 1 (완료)**: 기획, 프로토타입, MVP 범위 확정
- **Week 2**: Layout, Upload, Dashboard Skeleton, Analysis 착수
- **Week 3**: Analysis 마무리, Financial, Backend(Express API/Parser) 착수
- **Week 4**: Dashboard 데이터 연동, AI Recommendation, 통합/버그 수정

페이지 개발 순서는 데이터 의존성을 기준으로 정했다: Upload(데이터 유입) → Analysis/Financial(분석 로직) → Dashboard(다른 페이지 결과 요약). Dashboard는 Analysis/Financial 로직을 재사용하므로 실데이터 연동을 가장 마지막에 배치했다.
