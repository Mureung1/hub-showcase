# 오늘 계획: 2026-07-13

## 오늘의 목표

오늘은 개발 구현보다 운영 체계와 계획 문서를 확정한다. 다른 세션에서 바로 이어 작업할 수 있도록 Agent 문서, 전체 계획, 이번 주 계획, 오늘 계획, Notion/GitHub Issue 백로그 구조, React 개선 판단 기준을 저장소 문서로 남긴다.

## 작업 순서

1. 계획 수립 Agent 작성
   - 파일: `docs/planning-agent.md`
   - 완료 기준: 요구사항을 Task로 나누는 입력/출력 형식과 금지 규칙이 있다.

2. 기능 검증 Agent 작성
   - 파일: `docs/verification-agent.md`
   - 완료 기준: MVP 시나리오와 수직 슬라이스 검증 기준이 있다.

3. 전체 계획 작성
   - 파일: `docs/master-plan.md`
   - 완료 기준: 7월 30일까지의 주차별 계획, 기술 구조, 확장 반영 방식이 있다.

4. 이번 주 계획 작성
   - 파일: `docs/weekly-plan-2026-07-13.md`
   - 완료 기준: 7월 17일까지 요일별 작업과 완료 기준이 있다.

5. Notion 대시보드 가이드 작성
   - 파일: `docs/notion-dashboard-guide.md`
   - 완료 기준: Notion 속성, 상태값, GitHub Issue 연결 방식이 있다.

6. 백로그 재정렬
   - 파일: `docs/tasks.md`
   - 완료 기준: Task가 Notion/GitHub Issue 등록 단위로 작게 쪼개져 있고 우선순위가 있다.

7. 링크 갱신
   - 파일: `README.md`, `docs/README.md`, `docs/project-knowledge-map.md`, `AGENTS.md`
   - 완료 기준: 다른 세션에서 새 문서를 바로 찾을 수 있다.

8. 상태 갱신
   - 파일: `docs/status.md`
   - 완료 기준: 완료, 검증, 다음 작업, 차단 요소만 기록되어 있다.

## 오늘 하지 않는 것

- React 코드 구현
- Hono/Supabase 실제 구현
- Notion 실제 등록
- GitHub Issue 실제 생성
- LLM, 음성, 웹캠, 소셜, 테마 보상 구현

## 오늘의 판단

- HTML 정적 버전은 시각/상호작용 기준안이다.
- React는 실제 확장 구현 타깃이다.
- React를 폐기하지 않고, HTML 정적 버전의 구조와 스타일을 React로 이식한다.
- 기존 React 로직은 상태 전이 중심으로 선별 재사용한다.
