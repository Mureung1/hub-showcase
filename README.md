# PtoP(Project to Portfolio)

PtoP는 GitHub Repository나 프로젝트 폴더를 분석해 대학생 개발자의 프로젝트 경험을 포트폴리오와 회고 형태로 정리해주는 AI Agent 서비스입니다.

## 기획 문서

- [GitHub Wiki](https://github.com/SubJeeLee/hub/wiki)
- [동작 프로토타입](./prototype/index.html)
- [Wiki용 기획서 초안](./docs/wiki-home.md)
- [PtoP 기획서](./docs/plan.md)
- [1주차 작업 체크리스트](./docs/checklist.md)
- [Git Repository 분석 학습 노트](./docs/repo-analysis-study.md)
- [PtoP 테스트 케이스](./docs/test-cases.md)
- [기획하기 with AI 가이드](./docs/planning-tip.md)

## 핵심 문제

프로젝트 경험을 쌓는 대학생 개발자는 프로젝트가 끝난 뒤 시간이 지나면 자신이 맡은 역할, 핵심 구현 내용, 문제 해결 과정을 정확히 기억하고 정리하기 어렵습니다.

## 핵심 기능

- 프로젝트 분석 기능
- 회고/포트폴리오 초안 생성 기능

## 프로토타입

Day3에서는 GitHub Repository 분석이 실제로 어떻게 동작할지 확인하기 위해 HTML/CSS와 Vanilla JavaScript 기반 프로토타입을 추가했습니다.

- [prototype/index.html](./prototype/index.html)
- 공개 GitHub Repository URL 입력 시 참여자와 최근 커밋 분석
- contributors API 기준 참여자별 기여도 퍼센트 표시
- 최근 commit API 기준 내 GitHub ID의 주요 작업 메시지 표시
- GitHub API 응답 실패 시 임의 결과를 만들지 않고 오류 안내

## Wiki

기획서는 [GitHub Wiki](https://github.com/SubJeeLee/hub/wiki)에 정리했습니다. 세부 문서는 위의 기획 문서 링크에서 함께 확인할 수 있습니다.
