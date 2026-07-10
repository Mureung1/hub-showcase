# PtoP 문서 구조

## 목적

AGENTS.md가 매 작업마다 불필요하게 긴 맥락을 포함하지 않도록, 문서를 목적별로 나눠 관리한다.  
Agent가 항상 읽어야 하는 내용은 AGENTS.md에 최소한으로 남기고, 상세 맥락은 필요한 문서만 선택해 참고한다.

## 문서 분류

| 분류 | 문서 | 목적 |
| --- | --- | --- |
| Agent 기본 지침 | `AGENTS.md` | 매 작업에서 지켜야 할 최소 규칙 |
| 기록용 | `docs/agent-record.md` | 프로젝트 배경, 문제 정의, 기술 선택 이유처럼 자주 바뀌지 않는 기록 |
| 기획용 | `docs/plan.md` | 문제 정의, 사용자 시나리오, 핵심 기능, 화면 흐름 |
| 개발용 | `docs/development-guide.md` | 기술 스택, 모노레포 계획, NestJS 선택 이유, 코드/커밋 기준 |
| 작업 관리용 | `docs/day5-development-tasks.md` | 2주차 이후 개발 Task와 백로그 |
| 디자인용 | `docs/design-system.md` | 색상, 레이아웃, 상태 화면, 마스코트 사용 기준 |
| 디자인 Skill | `docs/ptop-design-skill.md` | 화면 제작 시 반복 적용할 디자인 판단 기준 |
| 학습용 | `docs/repo-analysis-study.md` | Git Repository 분석 방법 학습 기록 |
| 테스트용 | `docs/test-cases.md` | 입력, 분석, 결과, 오류 케이스 |
| 제출/Wiki용 | `docs/wiki-home.md` | GitHub Wiki에 반영할 요약 문서 |
| 기획 가이드 | `docs/planning-tip.md` | 루카스 기획 수업 요구사항 정리 |

## 관리 원칙

- AGENTS.md에는 장기 기록, 회고, 상세 설계 내용을 길게 넣지 않는다.
- 디자인 관련 판단은 `design-system.md`와 `ptop-design-skill.md`에서 관리한다.
- 개발 구조와 컨벤션은 `development-guide.md`에서 관리한다.
- 프로젝트 방향성, 선택 이유, 회고성 기록은 `agent-record.md`에 남긴다.
- 새 문서를 추가하면 README와 이 문서의 목록을 함께 갱신한다.
