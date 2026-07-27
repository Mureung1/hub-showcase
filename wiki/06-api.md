# API

마지막 업데이트: 2026-07-27

## 이 문서의 목적

서버 함수의 라우트, 검증, 응답 계약 및 호출 예시를 제공한다.

## 빠른 요약

모든 API는 `POST`와 `Content-Type: application/json`만 허용한다. 인증 미들웨어는 코드에서 발견되지 않았고, IP 헤더 기반 인메모리 rate limit만 존재한다.

## 라우트/핸들러

|메서드·경로|진입점|핸들러|성공|실패|
|---|---|---|---|---|
|`POST /api/generate`|`api/generate.ts`|`createGenerateHandler`|200 JSON 생성 응답|400 `invalid_request`, 429 `rate_limited`, 500 `generation_failed`|
|`POST /api/interaction`|`api/interaction.ts`|`createInteractionHandler`|202 empty body|400 `invalid_request`, 429 `rate_limited`|

## `/api/generate`

서버는 `guided_ai`와 `manual_ai`만 받는다. `template_fallback`은 공유 계약에는 있지만 서버 handler가 거부한다. `guided_ai`는 `situationId`와 정확히 하나의 `contextAnswers`를 받고 서버의 `resolveGuidedContext`로 신뢰 맥락을 재구성한다.

```json
{
  "route": "manual_ai",
  "mode": "reply",
  "scenarioId": "professor",
  "speechStyleId": "seumnida",
  "purpose": "question",
  "receivedMessage": "과제 제출 방법을 다시 확인하고 싶습니다.",
  "situation": "LMS 공지를 놓쳤습니다."
}
```

성공 응답은 `source: "ai"`와 tone level 1, 2, 3 후보 세 개를 포함한다.

```json
{
  "source": "ai",
  "candidates": [
    { "toneLevel": 1, "toneLabel": "기본", "text": "..." },
    { "toneLevel": 2, "toneLabel": "더 부드럽게", "text": "..." },
    { "toneLevel": 3, "toneLabel": "더 분명하게", "text": "..." }
  ]
}
```

요청 문자열 상한은 받은 메시지 500자, 상황 300자이며 후보는 600자다. handler deadline은 기본 18초, 최대 출력 토큰은 1,024이며 transient provider 실패만 최대 1회 재시도한다.

## `/api/interaction`

이벤트명은 `result_shown`, `refinement_opened`, `regeneration_requested`, `copy_succeeded`, `situation_change`다. `copy_succeeded`만 `toneLevel` 1~3을 요구한다. 가이드/템플릿 route에는 해당 scenario의 `situationId`가 필수이고, `email_template`은 `professor` scenario만 허용한다.

```json
{
  "eventName": "copy_succeeded",
  "mode": "reply",
  "route": "guided_ai",
  "scenarioId": "groupwork",
  "situationId": "schedule",
  "toneLevel": 2
}
```

## 인증/인가 및 오류 규칙

- 인증/세션/권한 검사는 API 파일에서 발견되지 않았다.
- client key는 `x-vercel-forwarded-for` → `x-forwarded-for` → `x-real-ip`의 첫 IP 또는 `unknown-client`다.
- `createInMemoryRateLimiter()` 기본값은 키당 60초에 10회다.
- 오류 body는 JSON `{ "error": "..." }`이고 public generation error는 내부 provider 오류를 노출하지 않는다.

## 근거

- 라우트 조립: `api/generate.ts`, `api/interaction.ts`
- 계약/제한: `src/shared/generation/contracts.ts`, `src/shared/interaction/contracts.ts`
- handler: `api/_lib/generation/handler.ts`, `api/_lib/interaction/handler.ts`
- rate limit: `api/_lib/generation/rateLimiter.ts`

## 주의사항/함정

브라우저 `generateWithApi`는 성공 payload가 `source === 'ai'`인지도 재검증한다. API 응답 변경은 클라이언트·서버 계약 테스트를 함께 갱신해야 한다.

## TODO/확인 필요

- CORS, WAF, Vercel edge/network 보안 정책은 저장소에 설정 파일이 없어 확인 필요.
