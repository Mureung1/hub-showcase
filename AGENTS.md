# PtoP Agent Guide

## 프로젝트

PtoP(Project to Portfolio)는 GitHub Repository를 분석해 대학생 개발자가 프로젝트 경험을 복기하고, 포트폴리오와 회고로 확장할 수 있는 작업 단서를 정리해주는 서비스다.

현재 MVP는 Repository URL 입력 이후 `참여자`, `commit 수 기반 기여도`, `최근 commit message 기반 주요 작업 단서`를 보여주는 흐름에 집중한다.

## 작업 원칙

- 기획서에 없는 기능을 임의로 넓히지 않는다.
- API 실패 시 임의 분석 결과를 만들지 않는다.
- commit 수를 실제 기여도나 실력의 절대 지표처럼 표현하지 않는다.
- 사용자의 역할을 AI가 확정적으로 단정하지 않는다.
- 외부 UI 라이브러리는 별도 합의 없이 추가하지 않는다.
- `.github/` 디렉토리와 GitHub Actions workflow는 사용자의 명시 요청 없이 수정하지 않는다.

## 기술 기준

- Frontend: React + Vite
- Backend 계획: NestJS
- API: GitHub REST API
- Prototype: HTML + CSS + Vanilla JavaScript
- 문서: Markdown

## 코드 기준

- React 컴포넌트 이름은 PascalCase를 사용한다.
- 변수와 함수 이름은 camelCase를 사용한다.
- API 실패, 빈 입력, 잘못된 URL 상태를 명시적으로 처리한다.
- 불필요한 추상화보다 현재 기능 흐름을 읽기 쉽게 유지한다.

## 참고 문서

- 문서 구조: `docs/document-map.md`
- 기획서: `docs/plan.md`
- 개발 가이드: `docs/development-guide.md`
- 프로젝트 기록: `docs/agent-record.md`
- 디자인 시스템: `docs/design-system.md`
- 디자인 Skill: `docs/ptop-design-skill.md`
- 개발 Task: `docs/day5-development-tasks.md`
- Repository 분석 학습 노트: `docs/repo-analysis-study.md`
- 테스트 케이스: `docs/test-cases.md`
