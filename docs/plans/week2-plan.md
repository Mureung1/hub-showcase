# Week2 주간 계획

## 목표

2026년 7월 13일 월요일부터 2026년 7월 17일 금요일까지, PtoP의 핵심 수직 슬라이스인 `React 화면 → Nest API → Supabase 저장/조회 → React 화면 갱신`을 실제 동작 가능한 수준으로 만든다.

이번 주 완료 기준:

- React 화면에서 GitHub Repository URL을 입력하고 분석 요청을 보낼 수 있다.
- Nest API가 repository 기본 정보, 참여자, 최근 commit 정보를 가져온다.
- Nest API가 분석 결과를 Supabase 한 테이블에 저장하고 조회할 수 있다.
- React 화면이 API 응답을 받아 분석 결과 화면으로 변경된다.
- 성공, 로딩, 오류, 다시 분석하기 흐름을 화면에서 확인할 수 있다.
- 기능 검증 Agent로 수직 슬라이스 동작 여부를 점검할 수 있다.

## 관리 대시보드

- GitHub Issues: https://github.com/SubJeeLee/hub/issues
- 기존 개발 Task 문서: `docs/plans/development-tasks.md`
- 계획 수립 Agent: `docs/agents/week-planning-agent.md`
- 기능 검증 Agent: `docs/agents/feature-verification-agent.md`

## 이번 주 우선순위

| 우선순위 | 기준 |
| --- | --- |
| P0 | 화면, 서버, DB를 관통하는 수직 슬라이스에 반드시 필요한 작업 |
| P1 | MVP 완성도와 신뢰도를 높이는 작업 |
| P2 | 이번 주에 끝내지 않아도 되는 확장 작업 |

## 요일별 계획

| 날짜 | 목표 | 작업 |
| --- | --- | --- |
| 2026-07-13 월 | 계획과 Agent 정리 | 주간 계획 보강, 이슈 재정렬, planning/verification agent 작성, docs/AGENTS 정리 |
| 2026-07-14 화 | React 입력 흐름 | Repository URL 입력, mock 분석 흐름, 상태 모델, validation 구현 |
| 2026-07-15 수 | Nest API와 Supabase 모델 | Nest 분석 API 골격, Supabase `analysis_results` 테이블 설계, 저장/조회 흐름 구현 |
| 2026-07-16 목 | GitHub API와 DB 저장 연결 | GitHub API 호출, 분석 결과 가공, Supabase 저장 후 응답 연결 |
| 2026-07-17 금 | 화면 연결과 검증 | React-Nest 연동, 결과 화면 갱신, 오류/재시도 처리, 기능 검증 Agent로 점검 |

## GitHub Issue 등록 목록

| 순서 | 우선순위 | Issue | 제목 | 완료 기준 |
| --- | --- | --- | --- | --- |
| 1 | P0 | [#12](https://github.com/SubJeeLee/hub/issues/12) | Agent RULES와 계획/검증 Agent 정리 | AGENTS.md는 최소 지침만 남고, planning agent와 feature verification agent가 준비된다. |
| 2 | P0 | [#1](https://github.com/SubJeeLee/hub/issues/1) | React Repository 입력과 mock 흐름 구현 | URL parser, validation, 상태 모델, mock 결과 화면 흐름이 구현된다. |
| 3 | P0 | [#10](https://github.com/SubJeeLee/hub/issues/10) | 분석 결과 모델과 Supabase 테이블 설계 | `analysis_results` 테이블과 API 응답 모델, Week3 회고 초안 입력값이 정리된다. |
| 4 | P0 | [#6](https://github.com/SubJeeLee/hub/issues/6) | Nest API에서 GitHub 분석 후 Supabase 저장/조회 | Nest API가 GitHub API를 호출하고 Supabase에 저장/조회한 결과를 응답한다. |
| 5 | P0 | [#5](https://github.com/SubJeeLee/hub/issues/5) | React-Nest 연동과 수직 슬라이스 검증 | 화면 요청이 서버와 DB를 거쳐 다시 화면 변경으로 이어지고, 검증 Agent 기준으로 점검된다. |

## Planning Agent 점검 결과

`docs/agents/week-planning-agent.md`의 기준으로 이번 계획을 점검했다.

| 점검 항목 | 결과 |
| --- | --- |
| 금요일 완료 기준이 명확한가 | React 화면에서 시작해 Nest API와 Supabase를 거쳐 결과 화면이 바뀌는 한 사이클로 좁혀져 있다. |
| 하루 안에 끝낼 수 있는 크기로 나눴는가 | Agent 정리, React 입력, 데이터 모델/DB, Nest API, 화면 연동/검증 단위로 나눴다. |
| 핵심 시나리오가 먼저 배치됐는가 | Agent 작업 맥락을 먼저 정리한 뒤 입력 화면과 mock 흐름을 배치했다. |
| P0와 P1이 구분됐는가 | 수직 슬라이스에 필요한 대표 작업만 P0 이슈로 남겼다. |
| 3주차 작업과 연결되는가 | Supabase에 저장한 분석 결과 모델을 회고 초안 생성 입력값으로 넘긴다. |

## 매일 점검 질문

- 오늘 완료한 Issue는 무엇인가?
- 아직 막힌 P0 작업은 무엇인가?
- 내일 작업이 오늘 결과에 의존하는가?
- Agent에게 넘길 작업 단위가 너무 크지는 않은가?
- 금요일 완료 기준에 가까워졌는가?

## 수직 슬라이스 정의

```text
사용자가 Repository URL 입력
→ React에서 Nest API로 분석 요청
→ Nest API가 GitHub API 호출
→ Nest API가 분석 결과를 Supabase에 저장
→ Nest API가 Supabase에서 저장 결과를 조회하거나 저장 결과를 응답
→ React 화면이 분석 결과로 변경
```

## 이번 주에 하지 않을 것

- Express 서버 구성
- 여러 Supabase 테이블 설계
- AI 기반 회고 문장 자동 생성
- private repository 분석
- PR/Issue 전체 분석
