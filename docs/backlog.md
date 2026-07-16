# 백로그(Backlog) 관리 — TideNote

`checklist.md`가 "기능을 작업 단위로 쪼갠 목록"이라면, 이 문서는 그 목록을
**언제, 어떤 순서로, 얼마나 중요하게** 처리할지 관리하는 문서다.
기획은 [TideNote 기획서](https://github.com/snael0510-coder/hub/wiki/TideNote-%EA%B8%B0%ED%9A%8D%EC%84%9C), 작업 분해는 [checklist.md](checklist.md) 참고.

## 1. 이번 주 목표 (2주차)

**핵심 시나리오 하나를 화면-서버-DB까지 끝까지 연결한다.**

여러 기능(Episode Segmentation, Recall Module, Tide Check) 중 **Tide Check**를
이번 주 수직 슬라이스 대상으로 선택했다.

> **선택 이유**: Episode Segmentation과 Recall Module은 "메시지 목록"이라는
> 선행 데이터 모델이 있어야 의미가 생기는데, 아직 채팅 데이터 자체가 없다.
> Tide Check는 입력(슬라이더 2개) → 저장 → 조회까지 독립적으로 완결되는
> 가장 단순한 사이클이라, 이번 주 "핵심 기능 하나를 끝까지"라는 목표에
> 가장 적합하다.

## 2. 우선순위 기준

| 우선순위 | 의미 | TideNote 이번 주 기준 |
|---|---|---|
| **P0** | 이번 주 목표(수직 슬라이스)에 없으면 안 됨 | DB 테이블, POST/GET API, FE-BE 연동 |
| **P1** | 있으면 좋지만 이번 주 필수는 아님 | mock 데이터 화면, 에러 처리 |
| **P2** | 다음 주 이후로 미뤄도 됨 | 스타일링, 다른 화면(History 등) 연동 |

## 3. Task 백로그

| # | Task | 설명 | 우선순위 | 요일 | 상태 | 이슈 |
|---|---|---|:---:|:---:|:---:|:---:|
| 1 | DB 테이블 설계 | Supabase `tide_checks` 테이블 (valence, arousal, created_at) | P0 | 수 설계 / 목 생성 | 완료 | [#1](https://github.com/snael0510-coder/hub/issues/1) |
| 2 | POST API | Express `/api/tide-checks` — 슬라이더 값 저장 | P0 | 수 코드 / 목 테스트 | 완료 | [#2](https://github.com/snael0510-coder/hub/issues/2) |
| 3 | GET API | Express `/api/tide-checks/latest` — 최신값 조회 | P0 | 수 코드 / 목 테스트 | 완료 | [#3](https://github.com/snael0510-coder/hub/issues/3) |
| 4 | FE mock 버전 | React Tide Check 화면, mock 데이터로 흐름 검증 | P1 | 화 | 완료 | [#4](https://github.com/snael0510-coder/hub/issues/4) |
| 5 | FE-BE 연동 | mock → 실제 fetch로 교체, 전체 사이클 연결 | P0 | 목 | 완료 | [#5](https://github.com/snael0510-coder/hub/issues/5) |
| 6 | 기능 검증 | 검증 Agent로 요구사항 대비 동작 점검 | P0 | 목 | 완료 | — |
| 7 | 에러 처리 | 저장 실패 시 사용자 피드백 | P1 | 금 | 대기 | — |
| 8 | 스타일링 | Tide Check 화면 최종 톤 다듬기 | P2 | 다음주 | 대기 | — |

> Task 4(FE mock 버전)를 P1로 뒀다 — mock 화면 자체는 Task 5(실제 연동)로
> 가면 fetch로 교체되어 사라질 중간 산출물이라, 이번 주 목표(수직 슬라이스
> 완성) 기준으로는 "있으면 좋지만 필수는 아님"이다.
>
> **요일 순서를 화/수로 뒤집었다** — 원래는 DB→API→FE 순으로 화요일에
> Task 1~3(DB/API)을 두었는데, 코스의 화요일 공식 미션이 "서버 없이 mock
> 데이터로 FE 화면부터"를 요구해서, 이번 주만 Task 4를 화요일로 당기고
> Task 1~3을 수요일로 미뤘다. 우선순위(P0/P1) 자체는 바뀌지 않는다 — 언제
> 하느냐만 코스 커리큘럼에 맞춰 조정한 것.
>
> Task 8(스타일링)은 이번 주 목표가 "연결이 되느냐"이지 "예쁘냐"가 아니므로
> 명시적으로 P2로 미뤘다.

## 4. 요일별 계획

| 요일 | 목표 |
|---|---|
| **월** | 주간 계획 수립 + 이슈 등록 + 계획 수립 Agent 제작 |
| **화** | Task 4 — Tide Check 화면 mock 데이터로 완성 (서버 없이 React만) |
| **수** | 화면 흐름 mock 완성(추가 컴포넌트, state/props) + Task 1~3 코드·설계까지만 (Supabase 실제 생성·curl 테스트는 목요일로) |
| **목 (오늘)** | Task 1~3 실제 검증(Supabase 생성, curl 테스트) + Task 5 FE-BE 연동 + Task 6 검증 Agent 실행 — 수직슬라이스 완성 |
| **금** | Task 7 — 에러 처리, 이번 주 정리 + 데모/회고 |

### 오늘(월) 안에 끝낼 것
- [x] 위 백로그 표 작성 완료
- [x] GitHub 이슈 5개(Task 1~5) 등록
- [x] 계획 수립 Agent 프롬프트 작성 및 1회 테스트

## 5. 구현 상태

Tide Check 기능의 FE-BE-DB 수직 슬라이스가 **완성**됐다 — React 슬라이더
(`src/TideCheck.jsx`) → Express API(`server/`) → Supabase `tide_checks`
테이블까지 실제 데이터가 저장·조회된다. 검증 로그는
[docs/agents/verification-agent.md](agents/verification-agent.md) 참고.
남은 건 Task 7(에러 처리)과 Task 8(스타일링) 정도다.

## 6. 운영 원칙

- 매일 저녁 이 문서의 상태 컬럼을 갱신한다.
- 우선순위를 바꾸면 표 아래에 이유를 한 줄 남긴다.
- 이슈 상태가 바뀌면 GitHub Issue와 이 문서를 함께 갱신한다.
