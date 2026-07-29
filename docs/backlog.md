# 백로그(Backlog) 관리 — TideNote

`checklist.md`가 "기능을 작업 단위로 쪼갠 목록"이라면, 이 문서는 그 목록을
**언제, 어떤 순서로, 얼마나 중요하게** 처리할지 관리하는 문서다.
기획은 [TideNote 기획서](https://github.com/snael0510-coder/hub/wiki/TideNote-%EA%B8%B0%ED%9A%8D%EC%84%9C), 작업 분해는 [checklist.md](checklist.md) 참고.

## 0. 지난 주(3주차) 요약

P0 6개(테스트 인프라, TDD 기능, 에러 처리, 아키텍처 다이어그램, 테스트코드
생성 Skill, 코드 검증 Agent) + P1(워크플로우 문서화) 전부 완료. History DB
연동(P2)만 이번 주로 이월 — 다만 아래처럼 이월 범위를 넘어 **실제 채팅**으로
확장했다.

## 1. 이번 주 목표 (4주차, 마지막 주)

**데모에 필요한 핵심 흐름을 완성하고, 외부에서 접속 가능하게 배포한다.**

> **핵심 흐름을 "Tide Check"에서 "실제 채팅"으로 확장** — 원래 이월 예정이던
> History DB 연동보다 범위가 크지만, TideNote의 진짜 핵심(잠김/열람)은 실제
> 대화가 있어야 의미가 생긴다. Groq API로 실시간 대화를 만들고, 메시지 생성
> 시점 상태(D_gen)와 현재 상태(D_recall)를 비교해 잠그는 로직까지 오늘(월)
> 하루 만에 완성했다 — 그만큼 이번 주 나머지는 배포와 정리에 집중한다.

## 2. 우선순위 기준

| 우선순위 | 의미 | TideNote 이번 주 기준 |
|---|---|---|
| **P0** | 데모에 필수 | 실제 채팅(완료), 배포(Vercel+Render), 배포 환경 검증, 영상 제출(수요일) |
| **P1** | 있으면 좋음 | Agent/Skill 종합 정리 시각 자료, 워크플로우 문서 최종화 |
| **P2** | 시간 되면 | episode 분리(잠김 판정이 메시지 단위가 아니라 대화 구간 단위가 되게) |

## 3. Task 백로그

| # | Task | 설명 | 우선순위 | 요일 | 상태 | 이슈 |
|---|---|---|:---:|:---:|:---:|:---:|
| 1 | 실제 채팅 완성 | Groq API 연동, messages 테이블, 잠김/열람 로직(D_gen vs D_recall) | P0 | 월 | 완료 | [#13](https://github.com/snael0510-coder/hub/issues/13) |
| 2 | 배포 준비 | 로컬 빌드 확인, 환경변수 정리, 시크릿 미노출 확인, Vercel/Render 계정 준비 | P0 | 월 | 완료 | [#14](https://github.com/snael0510-coder/hub/issues/14) |
| 3 | 실제 배포 | React → Vercel, Express → Render, 환경변수 설정 | P0 | 화 | 완료 | — |
| 4 | 배포 환경 검증 | 외부에서 FE 접속, BE 상태 확인 API, 화면→서버→DB 왕복 확인 | P0 | 화 | 완료 | — |
| 5 | 영상 제출 | 5분 미만 데모 영상, showcase.json에 demoVideoUrl 추가 | P0 | 수 | 대기 | — |
| 6 | Agent/Skill 종합 정리 | 4주간 쓴 Agent·Skill·규칙 문서 관계를 그림으로 | P1 | 목 | 대기 | — |
| 7 | 워크플로우 문서 최종화 | 캠프 이후에도 쓸 수 있는 형태로 다듬기 | P1 | 금 | 대기 | — |
| 8 | Episodes 사이드바 실데이터 연결 | mockEpisodes.js 제거, 실제 messages를 TDD로 만든 `groupMessagesIntoEpisodes`로 묶어서 표시 | P0 | 수 | 완료 | — |

## 4. 요일별 계획

| 요일 | 목표 |
|---|---|
| **월 (오늘)** | 핵심 흐름 확정(실제 채팅) + 완성 + 배포 사전 준비(빌드 확인, 환경변수 정리) |
| **화** | Vercel(FE) + Render(BE) 실제 배포, 배포 환경에서 핵심 기능 검증 |
| **수** | 배포 환경 오류 수정 + 5분 미만 데모 영상 제출 |
| **목** | Agent/Skill 관계 시각 자료, 데모 리허설 |
| **금** | 워크플로우 문서 최종화, 최종 데모 |

## 5. 구현 상태

**배포 완료.**
- FE(Vercel): https://hub-murex-mu.vercel.app
- BE(Render): https://tidenote-api.onrender.com

Tide Check(상태 체크인)와 실제 채팅(Groq API + 잠김/열람) 둘 다 배포 환경에서
화면-서버-DB까지 연결 확인됨 (Vercel 화면에서 실제 채팅 → Render → Supabase
저장·조회, Groq 응답까지 전부 동작). Episodes 사이드바(History/Recent)도
오늘부터 실제 `messages`를 시간 간격 기준으로 묶어서 보여준다 — 더는 mock
데이터가 아니다. 아직 안 되는 것:
- 격차 판정이 "episode(대화 구간) 단위"가 아니라 여전히 "메시지 단위"다 —
  묶어서 보여주긴 하지만, 잠김 여부는 메시지 하나하나에 매겨진 값을 그대로
  쓴다(그룹 안에 하나라도 잠기면 카드 전체를 잠그는 방식으로 근사).

## 6. 운영 원칙

- 매일 저녁 이 문서의 상태 컬럼을 갱신한다.
- 우선순위를 바꾸면 표 아래에 이유를 한 줄 남긴다.
- 이슈 상태가 바뀌면 GitHub Issue와 이 문서를 함께 갱신한다.
