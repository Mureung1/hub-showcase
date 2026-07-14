---
id: WI-0041
title: PP-039 핵심 추천 워크플로와 Split Live 검증
type: work-record
status: in-progress
date: 2026-07-15
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../contracts.md
  - ../adr/ADR-0012-recommendation-core-and-split-live-boundary.md
  - ../runbooks/RUN-0003-recommendation-workflow-split-live-probe.md
  - WI-0011-condition-extraction-port-schema-eval.md
  - WI-0016-candidate-normalization-deduplication-evidence.md
  - WI-0017-deterministic-scoring-top3-relaxation.md
  - WI-0018-grounded-reason-fallback.md
paths:
  - backend/src/main/java/com/placepick/recommendation/**
  - backend/src/main/java/com/placepick/infrastructure/external/llm/**
  - backend/src/test/java/com/placepick/recommendation/**
  - backend/src/test/java/com/placepick/infrastructure/external/llm/**
  - backend/src/integrationTest/java/com/placepick/recommendation/**
  - backend/src/integrationTest/java/com/placepick/infrastructure/external/llm/**
  - backend/src/evalTest/**
  - backend/src/workflowLiveProbeTest/**
  - backend/build.gradle
  - edge/**
  - mock-api/**
  - package.json
  - package-lock.json
  - scripts/**
  - Makefile
  - docs/**
---

# WI-0041 PP-039 핵심 추천 워크플로와 Split Live 검증

PP-039는 fork 저장소의 [Issue #44](https://github.com/gdh0730/hub/issues/44)로 추적한다.
Issue, 이 Work Record, roadmap과 구현·검증 증거는 같은 식별자를 유지한다.

## 문제와 근거

2026-07-14 Naver Local·Blog와 Elice Chat·Embedding의 개별 Local Live 계약은 각각
2xx와 필수 schema를 통과했다. 그러나 이는 인증·endpoint·응답 shape의 호환성 증거일
뿐, 조건 추출부터 검색·정규화·점수화·Top 3·근거 문장으로 이어지는 제품 워크플로가
구현되거나 검증됐다는 뜻은 아니다.

실제 Naver 결과를 바로 결합·재순위·저장하거나 Elice에 전달하면 Naver 약관·표시 의무와
Elice의 보관·학습·하위 처리자 정책이 확정되지 않은 상태에서 데이터 경계를 넓힌다.
반대로 개별 canary만 유지하면 provider 사이의 application 계약, 결정론적 점수,
fallback과 호출 상한을 검증할 수 없다. 전체 Mock 회귀와 제한된 실제 provider 검증이
각각 무엇을 증명하는지 분리한 핵심 슬라이스가 필요하다.

## 목적과 성공 기준

목적은 공개 API·DB·Worker 없이 이후 PP-017이 호출할 수 있는 동기식 추천 core를 만들고,
합성 데이터의 전체 Mock 연결과 provider별 Split Live를 서로 다른 증거로 검증하는 것이다.

- `ConditionExtractionPort`, `RecommendationCoreUseCase`,
  `GroundedReasonGenerationPort` 경계를 provider-neutral model로 구현한다.
- 추출 결과를 자동 추천에 넣지 않고 사용자가 확인한
  `ConfirmedRecommendationCondition`만 core가 받는다.
- Mock 전체 워크플로는 합성 조건과 검색·근거 fixture를 실제 application 흐름으로
  연결하고 정상 8회, 선호 완화 시 최대 9회의 논리 호출 상한을 검증한다.
- source link, 위치·유형·제외 filter, 보수적 dedup, 0~80 점수, `CandidateKey` 동점,
  한 번의 선호 완화와 후보 부족 실패를 결정적으로 검증한다.
- LLM은 Top 3별 evidence ID가 연결된 문장만 생성하고 점수·순위·사실·주의점·공유
  문구를 만들지 않는다. 잘못된 batch는 Top 3 전체 template fallback으로 바꾼다.
- Split Live는 Elice 합성 추출, Naver Local, Naver Blog, Elice 합성 이유 생성의 네
  논리 호출만 수행하며 Naver 응답을 Elice 요청에 전달하지 않는다.
- 비밀, provider routing identifier, 검색어, 장소 정보, prompt·completion과 원문
  응답은 console·report·Git에 남기지 않는다.

## 범위, 비범위와 제약

범위는 조건·후보·근거·점수 domain model, 동기 application use case, Mock adapter,
Elice 제품형 strict schema 경계, 결정론적 단위·통합·Eval과 로컬 전용 Split Live
launcher·Loopback Gateway다. 세부 구현은 PP-009, PP-014, PP-015, PP-016의 기존 Work
Record와 함께 추적한다.

공개 business Controller, 익명 세션, Draft 저장, PostgreSQL, Outbox, Redis Streams,
Worker, SSE, frontend, 투표방, 실제 cloud 배포와 Embedding runtime은 포함하지 않는다.
실제 Naver 결과의 결합·재순위·영구 저장·Elice 전달도 포함하지 않는다. Linked Live는
약관·표시·제3자 전달과 Elice 데이터 정책을 사람이 문서로 승인할 때까지 차단한다.

## 판단 기준과 대안

판단 기준은 사용자 확인권, 결정성, 근거 추적, provider 교체 가능성, 실제 데이터
최소화, 호출·비용 상한, 비밀 격리와 각 테스트가 증명하는 범위의 명확성이다.

- 개별 canary만 유지하면 실제 인증은 확인하지만 application 계약과 fallback을 검증하지
  못하므로 충분하지 않다.
- 실제 Naver→Elice를 즉시 연결하면 가장 실제에 가깝지만 현재 정책 gate를 위반하므로
  선택하지 않는다.
- 핵심 엔진을 처음부터 Job·Worker에 묶으면 DB·queue 복구와 추천 규칙 실패가 결합되므로
  먼저 동기 use case와 순수 규칙을 검증한다.
- 전체 Mock 연결과 Split Live를 함께 두면 경로가 늘어나지만 전자는 제품 논리를, 후자는
  실제 provider의 제품형 schema 호환성을 안전하게 검증할 수 있다.

선택은 `Mock linked workflow + Split Live provider probe + policy-blocked Linked Live`다.
배포에서는 원본 provider key를 외부 Gateway만 소유한다는 기존 신뢰 경계를 유지한다.

## 문제 해결 기록

1. Naver 최종 SHA `128692bdcaa8ef4e5e00a06362c02f25da223a4b`와 Elice 최종 SHA
   `e6190662c2382304f21c39bdb29375d1b1324733`의 개별 성공 증거를 확인했다.
2. 조건 Work Record의 `location`·`preferredKeywords`·1~50 계약이 정본의
   `locationQuery`·`preferences`·1~100과 충돌하는 것을 확인하고 정본으로 통일했다.
3. 구조화된 가격 근거가 없는 상태에서 예산 점수를 추론하거나 총점을 100으로 늘리는
   대신 현재 가능한 최고 80점과 명시적 warning을 선택했다.
4. UUID v4는 결정적 tie-break가 될 수 없으므로 identity의 SHA-256 `CandidateKey`를
   내부 정렬에 사용하고 Top 3 선정 뒤에만 UUID를 발급하도록 결정했다.
5. 추천 이유의 자유 `reason`·`shareText` 출력을 폐기하고 evidence ID가 연결된 문장만
   LLM이 생성하며 주의점과 공유 문구는 서버가 조합하도록 계약을 좁혔다.
6. 실제 provider 검증은 Naver→Elice 데이터 연결 없이 정확히 네 단계의 제품형 schema를
   확인하는 Split Live로 제한하고, 전체 연결은 Mock fixture에서 자동 검증하기로 했다.

## 구현 결과와 검증 증거

현재 상태는 `in-progress`다. 조건 추출, 후보 정규화·보수적 dedup, 결정론적 점수·완화,
근거 문장 검증·batch fallback과 동기 `RecommendationCoreUseCase`를 구현했다. Mock
정상 경로는 추출 1 + Local 1 + Blog 5 + 이유 1 = 8회, 완화 경로는 Local 1회를 더해
9회임을 통합 테스트로 확인했다. core는 `ConfirmedRecommendationCondition`만 받아
Draft 자동 연결을 구조적으로 차단한다.

### 2026-07-15 Mock 전체 연결 재검증

Dev Container의 Java 17에서 다음 명령을 `--rerun-tasks`로 실행해 캐시된 성공 결과를
재사용하지 않았다. 전체 연결 테스트는 in-memory Mock port를 사용하고 단위 테스트도
실제 Provider 요청 없이 network-free로 실행돼 외부 HTTP 호출은 0건이다.

```text
./gradlew :backend:integrationTest --tests com.placepick.recommendation.workflow.application.RecommendationCoreLinkedMockIntegrationTest --rerun-tasks --console=plain
./gradlew :backend:test --tests 'com.placepick.recommendation.*' --rerun-tasks --console=plain
```

| 검증 | 클래스 | 테스트 | 실패 | 오류 | 건너뜀 | JUnit 시간 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mock 전체 연결 | 1 | 2 | 0 | 0 | 0 | 1.373초 |
| 추천 domain·application 단위 | 12 | 51 | 0 | 0 | 0 | 8.365초 |

Mock 전체 연결의 공통 합성 입력은 `서울 강남구에서 4명이 조용한 주차 카페를
1만원~3만원으로 찾고 흡연 제외`다. 결정론적 추출 결과는 위치 `서울 강남구`, 유형
`CAFE`, 인원 4, 예산 10,000~30,000원, 선호 `조용한`·`주차` 각 priority 5, 제외
`흡연`이다. 테스트가 Draft를 명시적으로 확정 조건으로 변환한 뒤에만 core를 호출하며,
reflection으로 Draft를 받는 공개 `recommend` overload가 없음을 확인한다.

정상 시나리오는 Local 후보 5건, 후보별 Blog 근거 1건과 이유 batch 1회를 사용한다.
직접 assertion한 결과는 Top 3의 개수 3, `degraded=false`, `reasonFallback=false`,
Local 1회, Blog 5회, 이유 1회, 조건 추출을 포함한 총 8회다. 현재 fixture와 제품
코드에서 파생한 관찰값은 짝수 후보가 위치 30 + 유형 25 + 선호 15 + Blog 3 = 73점,
홀수 후보가
30 + 25 + 선호 8 + Blog 3 = 66점이 된다. `CandidateKey` tie-break를 적용한 현재
fixture의 결과 순서는 `카페 4`, `카페 2`, `카페 3`이다. 구조화된 가격 근거가 없으므로
예산 점수는 0이고 결과에는 `BUDGET_EVIDENCE_UNAVAILABLE`가 포함된다.

완화 시나리오는 최초 Local 결과를 2건으로 제한한다. priority가 같은 두 선호 중 원래
배열의 마지막인 `주차` 하나만 제거해 `서울 강남구 카페 조용한`으로 Local을 한 번 더
호출한다. 직접 assertion한 결과는 `relaxed=true`, Local 2회, Blog 5회, 이유 1회,
조건 추출을 포함한 총 9회다.

이 증거가 의미하는 범위를 과장하지 않는다. 두 전체 연결 테스트가 직접 고정한 것은
정상·한 번의 완화 경로, 확정 조건 경계, Top 3 생성과 호출 상한이다. 정확한 검색어,
후보 이름·순서·점수 breakdown, UUID, warning·caution·share 문구 전체를 하나의
snapshot으로 assertion한 것은 아니며 해당 규칙은 51건의 계층별 단위 테스트가
보완한다. 후보 부족, Blog 장애와 LLM 전체 fallback도 계층별로 검증했지만 현재 두
시나리오처럼 `RecommendationCoreUseCase` 전체를 통과하는 실패 경로 테스트는 아니다.
실제 Naver payload를 core에서 처리해 실제 Elice에 전달하는 Linked Live, DB·Worker·SSE,
HTTP API와 UI도 이 Mock 결과로 검증됐다고 해석하지 않는다.

2026-07-15 Java 17에서 단위 86건, 추천 통합 21건, Eval 7건이 모두 실패 0건으로
통과했다. Edge는 TypeScript typecheck와 전체 11개 파일 97건이 통과했다. Loopback
Gateway는 고정 fixture hash와 네 호출 budget, route·method·query·body·token 거부,
Naver/Elice 자격의 양방향 교차 전달 0건, 비표준 Naver Content-Type의 안전한 schema
검증과 `linked=false` summary를 자동 검증한다. launcher guard는 CI·dirty tree·SHA
불일치와 Java 프로세스의 원본 자격 전달을 거부한다.

아직 남은 완료 증거는 관련 코드가 `main`에 병합된 뒤 tracked diff가 없는 정확한
`origin/main` SHA에서 `make workflow-live-probe APPROVED_SHA=<sha>`를 한 번 실행해
네 실제 호출의 2xx·제품 schema, `mode=split`, `linked=false`, `callCount=4`와 safe
report scan을 확인하는 것이다. 이 의도적 gate 때문에 현재 브랜치에서는 실제 Probe를
실행하지 않았으며 개별 Naver·Elice Local Live 성공을 PP-039 완료로 재사용하지 않는다.

## AI 사용과 사람의 검증

AI에는 계약 충돌 탐색, domain·port와 순수 규칙 초안, 경계·공격 fixture, Loopback
Gateway 음성 테스트와 문서 정합성 검토를 위임할 수 있다. 전체 prompt나 내부 추론은
기록하지 않고 채택한 계약·근거·검증만 남긴다.

사람은 Naver 약관·표시 의무, Elice 데이터 처리 정책, 점수의 제품 의미, 실행 SHA와
전체 diff, 실제 호출 승인·사용량과 비밀 비노출을 직접 확인한다. AI나 자동 테스트가
정책 승인을 대신하지 않으며, Split Live 결과를 Linked Live 성공으로 해석하지 않는다.

## 남은 위험과 학습

Naver category·주소·link 품질과 Blog 근거는 실제 분포에서 달라질 수 있고 정적 0~80
점수는 사용자 만족의 실측 최적값이 아니다. 정책 승인이 나더라도 전체 Linked Live는
호출 비용, 데이터 수명, 표시 방식과 품질 Eval을 별도 검토해야 한다.

조건·점수·이유 core가 완료돼도 비동기 Job·재시도·중복 delivery·복구는 PP-011~PP-019의
책임이다. 실제 데이터 처리 허용 범위가 달라지거나 Elice가 strict schema를 바꾸면
ADR-0012와 provider 선택을 재검토한다.
