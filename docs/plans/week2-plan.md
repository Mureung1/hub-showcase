# Week2 주간 계획

## 목표

2026년 7월 13일 월요일부터 2026년 7월 17일 금요일까지, PtoP의 핵심 흐름인 `GitHub Repository URL 입력 → 분석 요청 → 결과 확인`을 실제 동작 가능한 수준으로 만든다.

이번 주 완료 기준:

- GitHub Repository URL을 파싱하고 잘못된 입력을 막을 수 있다.
- GitHub API로 repository 기본 정보, 참여자, 최근 commit 정보를 가져온다.
- 참여자별 commit 수 기반 기여도 퍼센트를 계산한다.
- 최근 commit message를 기반으로 주요 작업 단서를 보여준다.
- 성공, 로딩, 오류, 다시 분석하기 흐름을 화면에서 확인할 수 있다.
- 3주차 회고 초안 생성에 넘길 분석 결과 데이터 구조가 문서화된다.

## 관리 대시보드

- GitHub Issues: https://github.com/SubJeeLee/hub/issues
- 기존 개발 Task 문서: `docs/plans/day5-development-tasks.md`
- 계획 수립 Agent: `docs/agents/week-planning-agent.md`

## 이번 주 우선순위

| 우선순위 | 기준 |
| --- | --- |
| P0 | URL 입력 후 분석 결과를 보기 위해 반드시 필요한 작업 |
| P1 | MVP 완성도와 신뢰도를 높이는 작업 |
| P2 | 이번 주에 끝내지 않아도 되는 확장 작업 |

## 요일별 계획

| 날짜 | 목표 | 작업 |
| --- | --- | --- |
| 2026-07-13 월 | 계획 수립과 입력 검증 | 주간 계획 작성, GitHub Issues 등록, planning agent 작성, URL parser/validation 구현 준비 |
| 2026-07-14 화 | GitHub API 연결 | repository 기본 정보 API, contributors API 연결 |
| 2026-07-15 수 | 분석 데이터 가공 | 최근 commits API 연결, 기여도 계산, 주요 작업 단서 추출 |
| 2026-07-16 목 | 결과 화면 연결 | 분석 결과 화면 연결, 로딩/성공/오류/다시 분석하기 흐름 구현 |
| 2026-07-17 금 | 신뢰도와 다음 주 연결 | GitHub ID 입력 옵션, 결과 신뢰도 안내, 캐싱 전략 검토, Week3 회고 초안 작업 재정리 |

## GitHub Issue 등록 목록

| 순서 | 우선순위 | Issue | 제목 | 완료 기준 |
| --- | --- | --- | --- | --- |
| 1 | P0 | [#12](https://github.com/SubJeeLee/hub/issues/12) | Agent RULES 학습과 docs/AGENTS 정리 | AGENTS.md는 최소 지침만 남고, docs는 목적별로 분류되며, RULES 학습 노트와 planning agent 문서가 준비된다. |
| 2 | P0 | [#1](https://github.com/SubJeeLee/hub/issues/1) | URL 입력 검증과 분석 상태 모델 구현 | URL parser, validation, `idle/loading/success/error` 상태 흐름이 구현된다. |
| 3 | P0 | [#6](https://github.com/SubJeeLee/hub/issues/6) | GitHub API 기반 분석 데이터 수집 | repository 기본 정보, contributors, 최근 commit 정보를 가져온다. |
| 4 | P0 | [#10](https://github.com/SubJeeLee/hub/issues/10) | 분석 결과 모델과 Week3 연결 기준 정리 | 분석 결과 데이터 모델, 기여도 계산 기준, 캐싱 검토, Week3 회고 초안 입력값이 정리된다. |
| 5 | P0 | [#5](https://github.com/SubJeeLee/hub/issues/5) | 분석 결과 화면과 오류/재시도 흐름 연결 | 프로젝트 개요, 참여자, 기여도, 주요 작업 단서, 오류/재시도/신뢰도 안내가 화면에 연결된다. |

## Planning Agent 점검 결과

`docs/agents/week-planning-agent.md`의 기준으로 이번 계획을 점검했다.

| 점검 항목 | 결과 |
| --- | --- |
| 금요일 완료 기준이 명확한가 | URL 입력 이후 분석 결과 확인까지로 좁혀져 있다. |
| 하루 안에 끝낼 수 있는 크기로 나눴는가 | Agent/docs 정리, 입력 검증, API 수집, 데이터 모델, UI 연결 단위로 나눴다. |
| 핵심 시나리오가 먼저 배치됐는가 | Agent 작업 맥락을 먼저 정리한 뒤 URL parser와 validation을 배치했다. |
| P0와 P1이 구분됐는가 | 이번 주 동작에 필수인 대표 작업만 열린 이슈로 남기고, 유사한 P1 작업은 대표 이슈에 통합했다. |
| 3주차 작업과 연결되는가 | 분석 결과 데이터 모델 문서화를 통해 회고 초안 생성의 입력값을 남긴다. |

## 매일 점검 질문

- 오늘 완료한 Issue는 무엇인가?
- 아직 막힌 P0 작업은 무엇인가?
- 내일 작업이 오늘 결과에 의존하는가?
- Agent에게 넘길 작업 단위가 너무 크지는 않은가?
- 금요일 완료 기준에 가까워졌는가?
