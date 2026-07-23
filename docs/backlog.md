# 백로그(Backlog) 관리 — TideNote

`checklist.md`가 "기능을 작업 단위로 쪼갠 목록"이라면, 이 문서는 그 목록을
**언제, 어떤 순서로, 얼마나 중요하게** 처리할지 관리하는 문서다.
기획은 [TideNote 기획서](https://github.com/snael0510-coder/hub/wiki/TideNote-%EA%B8%B0%ED%9A%8D%EC%84%9C), 작업 분해는 [checklist.md](checklist.md) 참고.

## 0. 지난 주(2주차) 요약

**Tide Check FE-BE-DB 수직 슬라이스 완성** — React(`TideCheck.jsx`) →
Express(`server/`) → Supabase(`tide_checks`)까지 실제 데이터가 저장·조회되고,
검증 Agent로 완료 기준 7개 전부 pass 확인. 상세 로그는
[docs/agents/verification-agent.md](agents/verification-agent.md) 참고.

**진도 점검(오늘 미션 2번) 결과**: 수직 슬라이스 **완성됨** → 이번 주 1순위는
기능 강화로 넘어가도 된다.

## 1. 이번 주 목표 (3주차)

**수직 슬라이스를 다지고(에러 처리·사용성), 구조를 그림으로 설명할 수 있게
만들고(아키텍처 다이어그램), 기능 하나는 테스트부터 써서(TDD) 검증한다.**

미션이 요구하는 4갈래: ①기능 강화 ②아키텍처 시각화 ③테스트/TDD
④Agent 산출물(테스트코드 생성 Skill, 코드 검증 Agent, 워크플로우 문서).

> **기능 강화 방향 선택**: "에러 처리 + 사용성 보강"을 골랐다. History 화면
> DB 연동이나 Recall Module 실제 구현도 후보였지만, 둘 다 아직 없는
> `episodes` 테이블/D_gen 계산 로직부터 새로 설계해야 해서 이번 주 범위
> ("1~2개 사용성 기능")보다 크다. 에러 처리는 지난주 이미 절반 짜여 있던
> 것(TideCheck.jsx의 기본 try/catch)을 다지는 작업이라 TDD·테스트 요구사항과
> 자연스럽게 붙는다.

## 2. 우선순위 기준

| 우선순위 | 의미 | TideNote 이번 주 기준 |
|---|---|---|
| **P0** | 이번 주 목표에 없으면 안 됨 | 테스트 프레임워크, TDD 기능 1개, 에러 처리 강화, 아키텍처 다이어그램, 테스트코드 생성 Skill, 코드 검증 Agent |
| **P1** | 있으면 좋지만 필수는 아님 | 워크플로우 문서화, 사용성 개선 2번째 항목 |
| **P2** | 다음 주 이후로 미뤄도 됨 | History DB 연동, Recall Module, Episode Segmentation |

## 3. Task 백로그

| # | Task | 설명 | 우선순위 | 요일 | 상태 | 이슈 |
|---|---|---|:---:|:---:|:---:|:---:|
| 1 | 테스트 프레임워크 세팅 | Vitest 설치·설정 (React 컴포넌트 + 순수 함수 테스트 가능하게) | P0 | 목 | 완료 | [#6](https://github.com/snael0510-coder/hub/issues/6) |
| 2 | TDD로 "오늘 체크인 여부" 로직 구현 | 테스트 먼저 작성 → `hasCheckedInToday(lastCheck)` 순수 함수 구현 → TideCheck에 연결(이미 체크인했으면 폼 대신 완료 화면) | P0 | 목 | 완료 | [#7](https://github.com/snael0510-coder/hub/issues/7) |
| 3 | 에러 처리 강화 | GET 실패 시 화면에 표시, POST 실패 시 재시도 버튼, 네트워크 끊김 케이스 | P0 | 화 | 완료 | [#8](https://github.com/snael0510-coder/hub/issues/8) |
| 4 | 아키텍처 다이어그램 | mermaid로 화면-서버-DB 흐름 그려서 README에 삽입 + 내 말로 설명 준비 | P0 | 수 | 완료 | [#9](https://github.com/snael0510-coder/hub/issues/9) |
| 5 | 테스트코드 생성 Skill | 컴포넌트/함수 주면 테스트 코드를 만들어주는 Skill 문서 작성 | P0 | 목 | 완료 | [#10](https://github.com/snael0510-coder/hub/issues/10) |
| 6 | 코드 검증 Agent | 지난주 만든 "기능 검증 Agent"(요구사항 대비 동작 점검)와 별도로, 코드 자체(테스트 존재 여부, 명백한 버그, 스타일 일관성)를 점검하는 Agent | P0 | 목 | 완료 | [#11](https://github.com/snael0510-coder/hub/issues/11) |
| 7 | 워크플로우 문서화 | Plan → Agent 활용 → 검증까지, 나만의 개발 워크플로우를 문서로 정리 | P1 | 금 | 대기 | [#12](https://github.com/snael0510-coder/hub/issues/12) |
| 8 | History DB 연동 | mock episodes를 실제 테이블로 교체 (다음 주로 이월 가능성 높음) | P2 | — | 대기 | — |

## 4. 요일별 계획

| 요일 | 목표 |
|---|---|
| **월** | 주간 계획 수립 + 이슈 등록 + 진도 점검(완료 확인) |
| **화** | Supabase 재확인(완료) + Task 3(에러 처리 강화) 설계·구현·검증 — 공식 미션(Supabase 확인 + 다음 기능 설계)에 맞춰 Task 1,2(테스트/TDD)는 뒤로 미룸 |
| **수 (오늘)** | Task 4 — 아키텍처 다이어그램(mermaid), README 삽입, 그룹 세션 발표 — 공식 미션과 그대로 일치. Task 1,2(테스트/TDD)는 다시 목요일로 |
| **목** | Task 1, 2, 5, 6 — 테스트 프레임워크+TDD 체크인 로직 + 테스트코드 생성 Skill + 코드 검증 Agent 제작, 이번 주 기능 검증 |
| **금** | Task 7 — 워크플로우 문서화 + 이번 주 정리·데모·회고 |

> 요일 배치는 지난주처럼 코스 공식 미션(화/수/목 마스터클래스 주제)이
> 공개되면 그에 맞춰 조정할 수 있다 — 지금은 백로그 우선순위 기준으로
> 잠정 배치한 것.

### 오늘(월) 안에 끝낼 것
- [x] 위 백로그 표 작성 완료
- [x] GitHub 이슈 등록 (Task 1~7 → #6~#12)
- [x] 계획 수립 Agent로 오늘 계획 재점검 (planning-agent.md 검증 로그 참고)
- [x] 진도 점검 결과 기록 (완료 — 위 0번 항목)

## 5. 구현 상태

Tide Check 수직 슬라이스는 완성 상태. 이번 주는 그 위에 에러 처리, 테스트,
아키텍처 문서, Agent 산출물을 쌓는 것이 목표이고, 새로운 큰 기능
(Episode Segmentation, Recall Module)은 다음 주로 미룬다.

## 6. 운영 원칙

- 매일 저녁 이 문서의 상태 컬럼을 갱신한다.
- 우선순위를 바꾸면 표 아래에 이유를 한 줄 남긴다.
- 이슈 상태가 바뀌면 GitHub Issue와 이 문서를 함께 갱신한다.
