# Agent RULES 학습 노트

## 목적

Agent가 매 작업마다 읽는 지침과, 필요할 때만 참고하는 문서를 구분하기 위해 정리한 학습 기록이다.  
멘토링 피드백처럼 "AGENTS.md를 짧게 유지하고 상세 맥락은 docs로 분리한다"는 원칙을 프로젝트 규칙으로 남긴다.

## AGENTS.md에 남길 것

- 프로젝트 한 줄 설명
- 현재 MVP 범위
- 반드시 지켜야 하는 작업 원칙
- 기술 기준
- 코드 기준
- 상세 문서로 이동할 수 있는 링크

## AGENTS.md에서 뺄 것

- 긴 회고와 배경 설명
- 기술 선택 이유의 상세 서술
- 일자별 작업 계획
- 디자인 세부 규칙
- 테스트 케이스 목록
- 이슈별 작업 상세

## docs로 분리할 것

| 분류 | 문서 | 이유 |
| --- | --- | --- |
| 기록 | `docs/records/agent-record.md` | 프로젝트 배경과 결정 이유는 매 작업마다 필요하지 않다. |
| 개발 | `docs/development/development-guide.md` | 기술 선택, 모노레포, 컨벤션은 개발 작업 때 참고하면 된다. |
| 문서 구조 | `docs/document-map.md` | 문서가 많아질수록 역할을 분리해야 한다. |
| 주간 계획 | `docs/plans/week2-plan.md` | 일정과 이슈 목록은 현재 주차 작업 때만 필요하다. |
| Agent 절차 | `docs/agents/week-planning-agent.md` | 계획 수립이 필요할 때만 호출한다. |
| 디자인 | `docs/design/design-system.md`, `docs/design/ptop-design-skill.md` | 화면 작업 시에만 상세 규칙을 참고한다. |

## Skill 문서에서 가져온 기준

- Skill은 한 번 쓰고 버리는 프롬프트가 아니라 반복 가능한 절차 문서다.
- description은 "언제 사용할지"를 짧게 적고, 절차를 길게 요약하지 않는다.
- 자주 읽히는 문서는 토큰 비용을 고려해 짧게 유지한다.
- 세부 내용은 별도 문서로 분리하고, 필요한 상황에만 읽게 한다.
- 작업을 나눌 때는 입력, 출력, 완료 기준이 분명해야 한다.

## PtoP 적용 원칙

- AGENTS.md는 50줄 안팎의 최소 지침으로 유지한다.
- 새 문서가 생기면 `docs/document-map.md`와 README에 링크한다.
- 프로젝트 작업 계획은 `docs/plans/week2-plan.md`처럼 주차별 문서로 관리한다.
- Agent에게 맡길 반복 절차는 `docs/agents/` 아래에 둔다.
- 디자인, 개발, 테스트, 기획 문서를 섞지 않는다.
