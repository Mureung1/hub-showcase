# 계약 정본

이 문서는 공개 API, 내부 이벤트와 외부 AI·검색 경계의 의미와 구현 상태를 관리한다.
계약 상태와 실제 공개 여부를 혼동하지 않는다.

| 상태 | 의미 |
| --- | --- |
| `planned` | 방향만 존재하며 요청·응답·오류가 확정되지 않음 |
| `specified` | 요청·응답·오류·권한·검증 기준이 확정됐지만 구현되지 않음 |
| `implemented` | 코드와 자동 테스트가 계약을 검증함 |
| `deprecated` | 대체 계약과 제거 조건이 확정됨 |

현재 실행 코드가 공개하는 HTTP 표면은 `/actuator/health`와
`/actuator/prometheus`뿐이다. 아래 `specified` 비즈니스 경로는 구현됐거나 호출할 수
있다는 뜻이 아니다. 각 연결 Task가 코드와 자동 검증을 완료한 뒤에만 상태를
`implemented`로 변경한다.

## 공통 HTTP 규칙

- API prefix는 `/api/v1`, JSON field는 `camelCase`를 사용한다.
- resource ID는 UUID v4 문자열이며 DB에서는 PostgreSQL `uuid`로 저장한다.
- 시각은 UTC ISO 8601 문자열, 금액은 KRW 정수다.
- 성공 응답은 `application/json`, 오류는 RFC 9457
  `application/problem+json`, stream은 `text/event-stream`이다.
- 익명 세션 cookie 이름은 `PLACEPICK_SESSION`, 주최자 capability cookie 이름은
  `PLACEPICK_ORGANIZER`다. 두 cookie는 `HttpOnly`, `SameSite=Lax`, 운영에서
  `Secure`이며 URL·응답 body·로그에 원문을 노출하지 않는다.
- 세션 생성 이외의 상태 변경 요청은 `X-CSRF-Token` header를 검사한다. GET과 SSE는
  CSRF 검증 대상이 아니지만 resource 소유권과 만료는 검사한다.
- resource 생성과 최종 확정은 `Idempotency-Key` header가 필수다. 같은 세션·method·
  path·body의 재요청은 최초 status와 body를 반환하고, 같은 key에 다른 body를 쓰면
  409 `IDEMPOTENCY_KEY_REUSED`를 반환한다. 기록은 최소 24시간 유지한다.
- 투표는 resource에 대한 `PUT`과 `DELETE`로 멱등성을 확보한다.
- 목록 문자열은 앞뒤 공백과 중복을 제거한다. 알 수 없는 JSON field는 400으로
  거부해 client와 server의 계약 drift를 드러낸다.

## 공통 resource schema

### 추천 조건 `RecommendationCondition`

| field | 형식과 제약 |
| --- | --- |
| `locationQuery` | 1~100자의 검색 지역, 비어 있을 수 없음 |
| `placeType` | `RESTAURANT`, `CAFE`, `BAR`, `OTHER` 중 하나 |
| `partySize` | 1~100 정수 |
| `budgetPerPersonMin` | 0~10,000,000 정수 |
| `budgetPerPersonMax` | 최솟값 이상 10,000,000 이하 정수 |
| `preferences` | 최대 10개의 `{value, priority}`; value는 1~50자, priority는 1~10 |
| `exclusions` | 최대 10개의 1~50자 문자열 |

위치는 필수 조건이며 장소 유형도 검색 확장에서 제거하지 않는다. 후보가 세 개보다
적으면 `preferences` 중 가장 낮은 priority의 항목만 한 번 제거해 재검색한다. 같은
priority가 여러 개면 배열의 마지막 항목을 제거해 결과를 결정적으로 만든다.

### 추천 후보 `RecommendationPlace`

| field | 의미 |
| --- | --- |
| `placeId` | 내부 UUID |
| `name`, `category`, `roadAddress`, `address` | Naver 검색에서 정규화한 최소 장소 정보 |
| `sourceUrl` | 사용자가 원문을 확인할 수 있는 Naver link |
| `score` | 결정론적 0~100 정수 |
| `scoreBreakdown` | 위치·유형·예산·선호·제외·근거 항목별 점수 |
| `reason` | 수집한 근거에만 기반한 추천 이유 |
| `cautions` | 근거가 부족하거나 사용자가 확인해야 할 사항 목록 |
| `evidenceLevel` | `LOCAL_AND_BLOG` 또는 `LOCAL_ONLY` |

도보 시간, 지하철 출구, 실시간 영업 여부처럼 현재 provider로 검증하지 않은 속성은
응답하지 않는다. LLM은 후보, 점수나 사실 field를 만들거나 변경할 수 없다.

### 추천 Job `RecommendationJobView`

| field | 형식과 의미 |
| --- | --- |
| `jobId` | UUID v4 |
| `status` | `ACCEPTED`, `PROCESSING`, `COMPLETED`, `FAILED` |
| `stage` | `QUEUED`, `LOCAL_SEARCH`, `BLOG_SEARCH`, `SCORING`, `REASON_GENERATION`, `PERSISTING`, `FINISHED` |
| `progress` | 0~100 정수이며 같은 Job에서 감소하지 않음 |
| `degraded` | 일부 근거·생성 fallback으로 완료됐는지 여부 |
| `warnings` | 안정적인 warning code 목록 |
| `condition` | 사용자가 확정한 `RecommendationCondition` |
| `places` | 완료 시 정확히 세 개의 `RecommendationPlace` |
| `failure` | 실패 시 `{errorCode, message}`, 내부 stack과 provider 원문 제외 |
| `createdAt`, `updatedAt`, `expiresAt` | UTC 시각 |

## HTTP API

| 상태 | 메서드·경로 | 권한 | 성공 계약 | 연결 Task |
| --- | --- | --- | --- | --- |
| `implemented` | `GET /actuator/health` | 공개 | 200과 프로세스·의존성 상태 | WI-0001 |
| `implemented` | `GET /actuator/prometheus` | 공개 | 200 Prometheus text exposition | WI-0001 |
| `specified` | `POST /api/v1/anonymous-sessions` | 공개 | 201, session cookie, CSRF token·만료 | PP-008 |
| `specified` | `POST /api/v1/recommendation-drafts` | 익명 세션 | 201 조건 추출 draft | PP-009, PP-010 |
| `specified` | `GET /api/v1/recommendation-drafts/{draftId}` | draft 소유 세션 | 200 draft snapshot | PP-010 |
| `specified` | `PUT /api/v1/recommendation-drafts/{draftId}` | draft 소유 세션 | 200 확정 조건으로 전체 교체 | PP-010 |
| `specified` | `POST /api/v1/recommendations` | 확정 draft 소유 세션 | 반드시 202와 Job locator | PP-011 |
| `specified` | `GET /api/v1/recommendations/{jobId}` | Job 소유 세션 | 200 최신 Job snapshot | PP-018 |
| `specified` | `GET /api/v1/recommendations/{jobId}/events` | Job 소유 세션 | 추천 진행 SSE | PP-019 |
| `specified` | `POST /api/v1/recommendations/{jobId}/rooms` | 완료 Job 소유 세션 | 201 공유방과 주최자 capability | PP-023 |
| `specified` | `GET /api/v1/rooms/{shareToken}` | share token | 200 후보·집계·만료 | PP-023 |
| `specified` | `PUT /api/v1/rooms/{shareToken}/votes/{placeId}` | 익명 세션과 share token | 200 자기 투표·최신 집계 | PP-024 |
| `specified` | `DELETE /api/v1/rooms/{shareToken}/votes/{placeId}` | 익명 세션과 share token | 204, 없어도 동일 | PP-024 |
| `specified` | `GET /api/v1/rooms/{shareToken}/events` | share token | 투표·확정 SSE | PP-025 |
| `specified` | `PUT /api/v1/rooms/{shareToken}/final-result` | organizer capability | 200 최종 결과 | PP-025 |
| `specified` | `GET /api/v1/rooms/{shareToken}/result` | share token | 200 확정 결과 | PP-025 |
| `specified` | `POST /api/v1/events` | 익명 세션 | 202 allowlist event 수락 | PP-027 |

## Endpoint 상세 계약

### 익명 세션

`POST /api/v1/anonymous-sessions`는 body 없이 호출한다. 201 body는
`{csrfToken, expiresAt}`이며 원문 session token은 cookie에만 둔다. 유효한 현재
세션 cookie가 있으면 새 ID를 늘리지 않고 같은 세션의 만료를 갱신한다. 변조·만료
cookie는 재사용하지 않는다.

### 조건 draft

`POST /api/v1/recommendation-drafts` body는 `{requestText}`이며 `requestText`는
1~1,000자다. 응답은 `{draftId, status, extractedCondition, warnings, expiresAt}`이고
status는 `EXTRACTED`다. 의미 있는 지역이나 장소 유형을 추출할 수 없으면 422
`UNPROCESSABLE_CONDITION`을 반환한다.

`GET`은 같은 snapshot을 반환한다. `PUT` body는 `{condition}`이고 전체
`RecommendationCondition`을 검증한 뒤 status를 `CONFIRMED`로 바꾼다. draft TTL은
생성부터 30분이며 만료 뒤 모든 접근은 410 `DRAFT_EXPIRED`다. Job으로 전환된 draft는
`CONSUMED`로 표시하며 다시 다른 Job을 만들 수 없다. 같은 idempotency key의 재요청은
기존 Job을 반환한다.

### 추천 생성·조회

`POST /api/v1/recommendations` body는 `{draftId}`다. 확정되지 않은 draft는 409
`DRAFT_NOT_CONFIRMED`, 이미 다른 key로 소비된 draft는 409 `DRAFT_ALREADY_CONSUMED`다.
성공은 다음 body와 `Location: /api/v1/recommendations/{jobId}`를 반환한다.

```json
{
  "jobId": "00000000-0000-4000-8000-000000000001",
  "status": "ACCEPTED"
}
```

성공 대체값으로 `200 OK`를 허용하지 않는다. Job과 outbox event는 한 DB transaction에
저장한다. `GET`은 항상 `RecommendationJobView`를 반환한다. 장소 검색 재시도 뒤에도
후보가 세 개 미만이면 `FAILED`와 `INSUFFICIENT_CANDIDATES`다. Blog 검색만 실패하면
`COMPLETED`, `degraded=true`, warning `BLOG_EVIDENCE_UNAVAILABLE`과 모든 후보의
`LOCAL_ONLY` 근거 수준을 반환한다. 이유 생성 실패는 템플릿 fallback으로 완료하고
warning `LLM_REASON_FALLBACK`을 포함한다.

### 공유방과 투표

`POST /api/v1/recommendations/{jobId}/rooms`는 body `{expiresInHours}`를 받으며 값은
1~168이다. 생략하면 72시간이다. 완료된 Job만 방으로 만들 수 있다. 201 body는
`{shareToken, shareUrl, expiresAt}`이며 organizer 원문은 cookie에만 둔다.

`GET /rooms/{shareToken}`은 `{roomId, status, places, aggregate, expiresAt}`을 반환한다.
status는 `OPEN` 또는 `FINALIZED`다. 내부 `roomId`는 UUID지만 외부 route에는 사용하지
않는다. 존재하지 않거나 형식이 잘못된 token은 동일한 404, 만료된 방은 410이다.

투표 `PUT` body는 `{value}`이고 value는 `LIKE` 또는 `DISLIKE`다. 같은 값을 다시
보내면 집계를 바꾸지 않는다. 다른 값은 원자적으로 교체한다. 응답은
`{placeId, myVote, aggregate, updatedAt}`이다. `DELETE`는 현재 세션의 해당 표만
제거하며 존재하지 않아도 204다. 확정·만료된 방은 변경할 수 없고 409 또는 410을
반환한다.

최종 확정 `PUT` body는 `{placeId}`다. 후보가 아닌 장소는 400이다. 같은 장소 재요청은
기존 200 결과를 반환하고, 이미 다른 장소가 확정됐으면 409
`FINAL_RESULT_CONFLICT`다. `GET /result`는 확정 전 409 `RESULT_NOT_FINALIZED`, 확정 후
`{place, finalizedAt}`을 반환한다.

### 제품 이벤트

`POST /api/v1/events` body는 `{eventId, name, occurredAt, context}`다. `eventId`는 UUID,
name은 `draftCreated`, `recommendationViewed`, `roomShared`, `voteChanged`,
`finalResultViewed`만 허용한다. context는 `draftId`, `jobId`, `roomId`, `placeId`,
`viewportClass` 중 해당 값만 포함하며 자유 텍스트, 검색 문장, cookie, token과 PII를
거부한다. body는 4 KiB 이하이고 중복 event ID는 다시 저장하지 않으면서 202를
반환한다. 시스템 처리 event는 server가 직접 생성하며 이 endpoint로 받지 않는다.

## 오류 계약

모든 오류는 `type`, `title`, `status`, `detail`, `instance`, 안정적인 `errorCode`,
`traceId`를 가진다. 입력 오류는 `fieldErrors` 배열에 `{field, code, message}`를
추가한다. `detail`과 message에는 secret, 원문 provider payload, stack trace와 내부
SQL을 넣지 않는다.

| HTTP | 대표 error code | 의미 |
| --- | --- | --- |
| 400 | `INVALID_REQUEST`, `INVALID_CONDITION` | JSON·field·상호 제약 위반 |
| 401 | `SESSION_REQUIRED` | 익명 세션이 없거나 유효하지 않음 |
| 403 | `CSRF_INVALID`, `ORGANIZER_REQUIRED` | 상태 변경 또는 주최자 권한 거부 |
| 404 | `RESOURCE_NOT_FOUND` | 소유하지 않거나 존재하지 않는 resource |
| 409 | `INVALID_STATE`, `IDEMPOTENCY_KEY_REUSED`, `FINAL_RESULT_CONFLICT` | 상태·멱등성 충돌 |
| 410 | `DRAFT_EXPIRED`, `ROOM_EXPIRED`, `JOB_EXPIRED` | 존재했지만 보존 기간 종료 |
| 422 | `UNPROCESSABLE_CONDITION` | 안전한 추천 조건을 만들 수 없음 |
| 429 | `RATE_LIMITED`, `PROVIDER_QUOTA_PROTECTED` | 제한 초과, `Retry-After` 포함 |
| 500 | `INTERNAL_ERROR` | 노출 가능한 원인이 없는 내부 실패 |
| 502 | `PROVIDER_INVALID_RESPONSE` | 외부 응답 schema·근거 검증 실패 |
| 503 | `PROVIDER_UNAVAILABLE`, `QUEUE_UNAVAILABLE` | 제한 재시도 뒤 일시 장애 |

## SSE 계약

추천 stream event는 `snapshot`, `progress`, `completed`, `failed`, `heartbeat`, 방
stream event는 `snapshot`, `voteUpdated`, `voteRemoved`, `finalized`, `heartbeat`다.

- 연결 직후 현재 DB snapshot을 먼저 보낸다.
- 모든 상태 event는 증가하는 event ID와 `occurredAt`, aggregate ID를 가진다.
- 15초 안에 상태 event가 없으면 heartbeat를 보낸다.
- client는 `Last-Event-ID`로 재연결할 수 있다. 서버가 event gap을 재생할 수 없으면
  최신 snapshot을 보내 상태를 수렴시킨다.
- completed, failed, finalized terminal event 뒤에는 연결을 닫는다.
- 연결 해제 시 listener를 제거하고 resource별·세션별 연결 상한을 적용한다.
- SSE 중단은 Job이나 투표 transaction을 취소하지 않는다. client는 GET snapshot으로
  언제든 복구할 수 있다.

## 내부 이벤트

| 상태 | 이름 | 생산자 | 소비자 | 의미 |
| --- | --- | --- | --- | --- |
| `specified` | `recommendation.requested.v1` | 추천 application service | 추천 Worker | 저장·확정된 Job 처리 요청 |

event envelope는 `eventId`, `eventType`, `version`, `aggregateId`, `idempotencyKey`,
`occurredAt`, `traceId`, `payload`를 가진다. payload에는 `jobId`만 두고 draft 조건은
Worker가 DB에서 읽어 event의 개인정보와 크기를 줄인다. relay는 outbox를 반복 publish할
수 있고 Worker는 at-least-once delivery를 전제로 처리한다. DB commit 뒤에만 ACK하며
제한 재시도 뒤에는 원본 event ID와 안전한 오류 code를 DLQ에 보존한다.

## LLM과 외부 검색

| 상태 | 계약 | 기준 | 연결 Task |
| --- | --- | --- | --- |
| `implemented` | 개발·테스트 외부 모드 | `PLACEPICK_EXTERNAL_MODE=mock`만 허용 | WI-0001 |
| `implemented` | Mock Naver·LLM | 정상·오류·timeout fixture | WI-0001 |
| `specified` | 조건 추출 | `RecommendationCondition` strict schema | PP-009 |
| `specified` | 추천 이유 | place ID별 reason·cautions·shareText strict schema | PP-016 |
| `implemented` | Naver Java adapter | 현행 API HUB Local·Blog port와 오류 정규화 | PP-013 |
| `specified` | Naver Local Live | 2026-07-14 두 논리 호출 모두 `INVALID_RESPONSE`; wire 수 미확인, 원인 진단·재검증 필요 | PP-013 |
| `specified` | Elice Chat Local Live | 합성 입력·strict Chat Completions 계약 확인 | PP-038 |
| `specified` | Elice Embedding capability | 합성 입력·1,536차원 계약만 확인, runtime 미사용 | PP-038 |
| `implemented` | Approval Gate·Provider Gateway 프로그램 | OIDC·workflow hash·replay·JWT·Local/Blog allowlist 자동 검증 | PP-037 |
| `planned` | Gate·Gateway 클라우드 배포 | Cloudflare secret과 승인 SHA canary E2E | PP-033, PP-035 |
| `planned` | 전체 배포 Live | Gateway를 거친 Naver·Elice 전체 E2E | PP-029, PP-033 |

조건 추출은 사용자 입력을 instruction이 아닌 data로 격리하고 schema 외 field를
허용하지 않는다. refusal, incomplete, malformed와 안전하게 해석할 수 없는 입력은
draft를 저장하지 않고 422로 종료한다.

추천 이유 입력은 확정 조건과 이미 선택된 후보의 검증된 최소 근거만 포함한다. 출력은
`{places: [{placeId, reason, cautions, shareText}]}`이며 입력에 없는 place ID, 가격,
영업 정보나 위치 특성을 추가하면 Eval에서 실패한다. LLM은 점수와 순위를 결정하지
않는다. LLM 실패 시 검증된 장소 field만 조합한 template fallback을 사용한다.

Naver adapter는 `https://naverapihub.apigw.ntruss.com`의 `/search/v1/local`과
`/search/v1/blog`, `X-NCP-APIGW-API-KEY-ID`와 `X-NCP-APIGW-API-KEY` 인증 header를
사용한다. adapter는 자동 재시도하지 않고 400, 401·403, 429, schema 오류와
5xx·timeout을 안정적인 application 오류로 정규화한다.
현재 일반 Spring 애플리케이션에는 원본 Naver key를 받는 bean이나 자동 구성을 연결하지
않는다. 직접 Naver adapter는 격리된 Local Live task와 자동 계약 테스트에서만 만들며,
향후 배포 runtime은 PP-029에서 원본 key가 아닌 Provider Gateway 자격을 사용하는 별도
adapter를 연결한다.
Local 실패는 제한 재시도 뒤 Job 실패, Blog 실패는 `LOCAL_ONLY` degraded 완료다.
원문 Naver response의 cache·영구 저장뿐 아니라 Local·Blog 결과 결합, 추천 후보로
저장하고 LLM에 전달하는 동작은 약관과 표시 의무를 사람이 확인하기 전까지 금지한다.
Naver 문서가 item 상세 field의 필수 존재를 보장하지 않으므로 누락된 상세값은 빈
문자열로 정규화한다. 단, 제목이 없는 item은 공식 schema 오류가 아니라 추천 후보로
식별할 수 없는 제품 적합성 실패로 분리해 거부한다.
Local Live 계약 검증은 응답을 메모리에서 schema 확인 후 폐기한다. 2026-07-14
baseline `make check` 통과 뒤 Local·Blog 메서드를 각각 한 번 호출했으나 둘 다
`INVALID_RESPONSE`로 실패했다. 당시 transport retry 비활성화와 NCP 사용량 대조가
없어 wire 요청 수는 확인하지 못했다. 안전한 오류 분류 외 원문은 artifact로 보존하지
않았으며 Naver Live 상태는 `specified`를 유지한다.

MVP LLM 방향은 Elice OpenAI-compatible Chat Completions다. Local Live는 승인된
`https://mlapi.run/{canonical-uuid}/v1` 형태의 Chat base에서
`POST /chat/completions`, exact model `openai/gpt-4.1-mini`, strict
`response_format=json_schema`, `stream=false`, `store=false`, tool 없음과 제한된
output을 요구한다. 고정 합성 입력의 출력은 추가 field 없는 `{"status":"ok"}`만
허용한다. [공식 GPT-4.1 mini 사양](https://developers.openai.com/api/docs/models/gpt-4.1-mini)은
Chat Completions와 Structured Outputs 지원을 비교 기준으로 제공하지만 Elice proxy의
호환성·보관 정책을 증명하지 않는다.

Embedding은 별도 base의 `POST /embeddings`, exact model
`openai/text-embedding-3-small`, 합성 입력 한 건과 float encoding으로 capability만
확인한다. [공식 Embeddings 가이드](https://developers.openai.com/api/docs/guides/embeddings)는
`text-embedding-3-small`의 기본 길이를 1,536으로 설명한다. vector는 출력·저장하지
않고 추천·검색·점수·중복 제거 runtime에 사용하지 않는다.

직접 OpenAI Responses API는 provider port 뒤의 대안으로 남기되 Elice 실패 시 자동
fallback하지 않는다. Elice의 보관·로깅·학습 사용·삭제·개인정보 정책을 사람이 확인하기
전에는 실제 사용자 입력, Naver 결과, 장소·블로그 근거와 생성 응답을 Elice에 보내거나
저장하는 제품 runtime을 활성화하지 않는다. `store=false` 전달은 proxy 미보관의 증거가
아니다.

실제 endpoint와 secret은 source, fixture, 문서와 일반 CI에 넣지 않는다. 공식 Naver
API HUB host는 allowlist 계약으로 공개하지만 credential은 Git에서 제외한
`.env.live.local` 또는 배포 Provider Gateway에만 둔다. 공유 Fork, GitHub Actions,
Vercel과 Render에는 원본 Naver key를 저장하지 않는다. Elice token과 routing identifier가
포함된 전체 proxy URL도 같은 위치에 저장하지 않는다. 전체 프롬프트나 내부 추론을
포트폴리오에 저장하지 않고 schema, 정책, fixture와 검증 결과만 기록한다.

### 외부 검증 상태 계약

외부 연동 완료 여부는 다음 증거 축으로 분리한다.

| 상태 축 | 의미 | 현재 상태 |
| --- | --- | --- |
| 코드 자동 검증 | Mock·adapter·fail-closed·redaction과 Gate/Gateway 음성 테스트 | Naver·Gateway·Elice와 전체 `make check` 통과; Live 호출 0회 |
| Naver Local Live | 교체된 key로 Local·Blog 논리 호출 각 1회 2xx·schema와 wire 2건 확인 | 2026-07-14 실패: 두 논리 호출 모두 `INVALID_RESPONSE`, wire 수 미확인 |
| Elice Local Live | 합성 Chat·Embedding 각 1회 2xx와 schema 확인 | 실행되지 않음 |
| 제품 LLM runtime | PP-009·PP-016·PP-029 구현과 provider 정책 승인 | 구현되지 않음 |
| 클라우드 배포 | Gate·Gateway와 demo stack에서 승인 SHA E2E 확인 | 배포되지 않음 |

한 축의 성공을 다른 축의 완료로 표현하지 않는다. 특히 Mock 성공은 실제 credential
호환성을, Local Live 2xx는 provider 정책 승인이나 클라우드 가용성을, Gateway 코드
테스트는 실제 edge 배포를 증명하지 않는다. Naver 실패는 Mock 회귀 실패가 아니며,
Elice capability 성공도 제품 LLM 기능 구현을 뜻하지 않는다.

## 계약 검증 책임

- PP-002는 이 문서를 machine-readable OpenAPI와 정상·오류 example로 변환하고
  schema 검사를 CI에 연결한다.
- 각 구현 Task는 해당 행을 `implemented`로 바꾸기 전에 단위·통합·계약 테스트와
  Work Record 증거를 추가한다.
- 추천 생성 계약은 통합·브라우저 E2E·k6에서 모두 `202 + jobId`를 검사하며 200을
  허용하지 않는다.
- local/test/load에서 실제 외부 DNS·HTTP가 발생하면 검증을 실패시킨다.
- 공개 field, event version, 권한이나 오류 의미를 바꾸면 호환성·migration과 ADR을
  같은 PR에서 갱신한다.
